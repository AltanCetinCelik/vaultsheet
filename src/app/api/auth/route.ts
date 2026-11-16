import crypto from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PASS_7D_PRODUCT_ID = "4ceb2ddc-a3ca-4161-8931-9024af24050d";
const PRO_ANNUAL_PRODUCT_ID = "8d86923c-900b-4dc1-8322-50185382e70b";
const POLAR_PORTAL_URL = "https://polar.sh/vaultsheet/portal";

interface PolarCustomer {
  id: string;
  email: string;
  name?: string | null;
  metadata?: Record<string, string | number | boolean> | null;
}

interface PolarOrder {
  id: string;
  created_at: string;
  status: string;
  product_id: string;
  customer_id: string;
  product?: { id: string; name?: string | null } | null;
}

interface PolarLicenseKey {
  id: string;
  key: string;
  display_key?: string;
  status: string;
  created_at: string;
  expires_at?: string | null;
  customer_id: string;
}

function getPolarApiBase(): string {
  const configured =
    process.env.POLAR_SERVER?.trim().toLowerCase() ??
    process.env.POLAR_ENVIRONMENT?.trim().toLowerCase();
  return configured === "sandbox"
    ? "https://sandbox-api.polar.sh"
    : "https://api.polar.sh";
}

function hashPassword(email: string, password: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${email.trim().toLowerCase()}:${password}`)
    .digest("hex");
}

function maskKey(fullKey: string, displayKey?: string): string {
  if (displayKey && displayKey.startsWith("VS-")) return displayKey;
  return `VS-****-${fullKey.slice(-6)}`;
}

async function polarRequest<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; rawText?: string }> {
  const res = await fetch(`${getPolarApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const rawText = await res.text().catch(() => "");
    return { ok: false, status: res.status, data: null, rawText };
  }

  const data = (await res.json()) as T;
  return { ok: true, status: res.status, data };
}

async function resolveCustomerEntitlements(customer: PolarCustomer, token: string) {
  const [ordersRes, keysRes] = await Promise.all([
    polarRequest<{ items: PolarOrder[] }>(
      `/v1/orders/?customer_id=${encodeURIComponent(customer.id)}&limit=20`,
      token
    ),
    polarRequest<{ items: PolarLicenseKey[] }>(
      `/v1/license-keys/?customer_id=${encodeURIComponent(customer.id)}&limit=20`,
      token
    ),
  ]);

  const paidOrders = (ordersRes.data?.items ?? [])
    .filter((o) => o.status === "paid")
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  const grantedKeys = (keysRes.data?.items ?? [])
    .filter((k) => k.status === "granted")
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  const activeOrder =
    paidOrders.find((o) => o.product_id === PRO_ANNUAL_PRODUCT_ID) ??
    paidOrders.find((o) => o.product_id === PASS_7D_PRODUCT_ID) ??
    paidOrders[0];

  const activeKey = grantedKeys[0];

  if (activeOrder) {
    const orderMs = Date.parse(activeOrder.created_at) || Date.now();
    const isPass7d = activeOrder.product_id === PASS_7D_PRODUCT_ID;
    const isAnnual = activeOrder.product_id === PRO_ANNUAL_PRODUCT_ID;
    const durationDays = isPass7d ? 7 : 365;
    const expiresAt = new Date(orderMs + durationDays * 86_400_000).toISOString();

    if (Date.parse(expiresAt) > Date.now()) {
      return {
        customerId: customer.id,
        customerEmail: customer.email,
        customerName: customer.name ?? undefined,
        plan: (isPass7d ? "pass_7d" : "pro_monthly") as "pass_7d" | "pro_monthly",
        planName: isPass7d
          ? "7-Day Tax & Audit Pass"
          : isAnnual
            ? "Annual Pro Bookkeeper Pass"
            : activeOrder.product?.name || "VaultSheet Pro Pass",
        key: activeKey?.key ?? "",
        displayKey: activeKey ? maskKey(activeKey.key, activeKey.display_key) : "",
        purchasedAt: activeOrder.created_at,
        expiresAt,
        portalUrl: POLAR_PORTAL_URL,
      };
    }
  }

  return {
    customerId: customer.id,
    customerEmail: customer.email,
    customerName: customer.name ?? undefined,
    plan: "free_account" as const,
    planName: "Free Account (25 Rows/PDF)",
    key: "",
    displayKey: "",
    portalUrl: POLAR_PORTAL_URL,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: "signup" | "login";
      name?: string;
      email?: string;
      password?: string;
    };

    const action = body.action;
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const name = (body.name ?? "").trim();

    if (!action || (action !== "signup" && action !== "login")) {
      return NextResponse.json(
        { valid: false, message: "Invalid auth action." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { valid: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { valid: false, message: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const token = process.env.POLAR_ACCESS_TOKEN?.trim();
    if (!token) {
      return NextResponse.json(
        { valid: false, message: "Authentication server is not configured." },
        { status: 500 }
      );
    }

    const secret = process.env.POLAR_WEBHOOK_SECRET?.trim() || token;
    const pwHash = hashPassword(email, password, secret);

    // Query existing customer by exact email
    const existingRes = await polarRequest<{ items: PolarCustomer[] }>(
      `/v1/customers/?email=${encodeURIComponent(email)}&limit=10`,
      token
    );
    const existingCustomer = (existingRes.data?.items ?? []).find(
      (c) => c.email.toLowerCase() === email
    );

    let activeCustomer: PolarCustomer | null = existingCustomer ?? null;

    if (action === "signup") {
      if (existingCustomer) {
        const storedHash =
          typeof existingCustomer.metadata?.vs_pw_hash === "string"
            ? existingCustomer.metadata.vs_pw_hash
            : "";

        if (storedHash && storedHash !== pwHash) {
          return NextResponse.json(
            {
              valid: false,
              message: "An account with this email already exists. Switch to Log In.",
            },
            { status: 409 }
          );
        }

        const patchRes = await polarRequest<PolarCustomer>(
          `/v1/customers/${encodeURIComponent(existingCustomer.id)}`,
          token,
          {
            method: "PATCH",
            body: JSON.stringify({
              name: name || existingCustomer.name || email.split("@")[0],
              metadata: {
                ...(existingCustomer.metadata ?? {}),
                vs_pw_hash: pwHash,
                vs_registered_at:
                  existingCustomer.metadata?.vs_registered_at ??
                  new Date().toISOString(),
              },
            }),
          }
        );

        if (patchRes.ok && patchRes.data) {
          activeCustomer = patchRes.data;
        }
      } else {
        const createRes = await polarRequest<PolarCustomer>(
          `/v1/customers/`,
          token,
          {
            method: "POST",
            body: JSON.stringify({
              email,
              name: name || email.split("@")[0],
              metadata: {
                vs_pw_hash: pwHash,
                vs_registered_at: new Date().toISOString(),
              },
            }),
          }
        );

        if (!createRes.ok || !createRes.data) {
          return NextResponse.json(
            { valid: false, message: "Could not create account. Please try again." },
            { status: 502 }
          );
        }
        activeCustomer = createRes.data;
      }

      const profile = await resolveCustomerEntitlements(activeCustomer!, token);
      return NextResponse.json({
        valid: true,
        profile,
        message:
          profile.plan === "free_account"
            ? "Account created! You unlocked 25 free rows per PDF and saved statement history."
            : `Account linked! Your ${profile.planName} is active.`,
      });
    }

    // Login flow
    if (!existingCustomer) {
      return NextResponse.json(
        {
          valid: false,
          message: "No account found for that email. Click Sign Up Free to create one.",
        },
        { status: 404 }
      );
    }

    const storedHash =
      typeof existingCustomer.metadata?.vs_pw_hash === "string"
        ? existingCustomer.metadata.vs_pw_hash
        : "";

    if (storedHash) {
      if (storedHash !== pwHash) {
        return NextResponse.json(
          { valid: false, message: "Incorrect password. Please check and try again." },
          { status: 401 }
        );
      }
    } else {
      // Customer previously paid on Polar checkout without creating an app password yet -> bind password now
      const patchRes = await polarRequest<PolarCustomer>(
        `/v1/customers/${encodeURIComponent(existingCustomer.id)}`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: existingCustomer.name || name || email.split("@")[0],
            metadata: {
              ...(existingCustomer.metadata ?? {}),
              vs_pw_hash: pwHash,
              vs_registered_at: new Date().toISOString(),
            },
          }),
        }
      );
      if (patchRes.ok && patchRes.data) {
        activeCustomer = patchRes.data;
      }
    }

    const profile = await resolveCustomerEntitlements(activeCustomer!, token);
    return NextResponse.json({
      valid: true,
      profile,
      message: `Welcome back${profile.customerName ? `, ${profile.customerName}` : ""}!`,
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { valid: false, message: "Authentication service unavailable. Please try again." },
      { status: 500 }
    );
  }
}
