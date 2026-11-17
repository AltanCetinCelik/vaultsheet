import { NextResponse } from "next/server";
import {
  dispatchQuantAlert,
  type AlertChannel,
  type AlertSignalPayload,
} from "@/lib/alertDispatch";
import { decryptCloudSecret, getServerSigningSecret } from "@/lib/cryptoSettings";

export const dynamic = "force-dynamic";

interface AlertRequestBody {
  channel?: AlertChannel;
  webhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  customerId?: string;
  customerEmail?: string;
  signal?: AlertSignalPayload;
}

function getPolarApiBase(): string {
  const configured =
    process.env.POLAR_SERVER?.trim().toLowerCase() ??
    process.env.POLAR_ENVIRONMENT?.trim().toLowerCase();
  return configured === "sandbox"
    ? "https://sandbox-api.polar.sh"
    : "https://api.polar.sh";
}

async function resolveSavedTelegramToken(
  customerId?: string,
  customerEmail?: string
): Promise<string> {
  const token = process.env.POLAR_ACCESS_TOKEN?.trim();
  const secret = getServerSigningSecret();
  if (!token || !secret || !customerId || !customerEmail) return "";

  try {
    const res = await fetch(
      `${getPolarApiBase()}/v1/customers/${encodeURIComponent(customerId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return "";
    const customer = (await res.json()) as {
      email?: string;
      metadata?: Record<string, string | number | boolean> | null;
    };
    if (customer.email?.toLowerCase() !== customerEmail.trim().toLowerCase()) {
      return "";
    }
    const enc = customer.metadata?.vs_tg_token_enc;
    return typeof enc === "string" ? decryptCloudSecret(enc, secret) : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AlertRequestBody;
    const channel = body.channel ?? "discord";
    const sig = body.signal;

    if (!sig?.symbol || !sig?.strategyName) {
      return NextResponse.json(
        { ok: false, message: "Missing active trading signal payload." },
        { status: 400 }
      );
    }

    let telegramBotToken = (body.telegramBotToken ?? "").trim();
    if (channel === "telegram" && !telegramBotToken && body.customerId && body.customerEmail) {
      telegramBotToken = await resolveSavedTelegramToken(
        body.customerId,
        body.customerEmail
      );
    }

    const result = await dispatchQuantAlert({
      channel,
      webhookUrl: body.webhookUrl,
      telegramBotToken,
      telegramChatId: body.telegramChatId,
      signal: sig,
    });

    return NextResponse.json(
      { ok: result.ok, message: result.message },
      { status: result.status }
    );
  } catch (error) {
    console.error("Alert dispatch error:", error);
    return NextResponse.json(
      { ok: false, message: "Could not dispatch signal webhook. Retry shortly." },
      { status: 500 }
    );
  }
}
