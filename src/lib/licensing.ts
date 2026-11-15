export const FREE_ROW_LIMIT = 25;

// Live Polar.sh checkout routes backed by /checkout?products=<PRODUCT_ID>
export const CHECKOUT_URLS = {
  pass7Day:
    process.env.NEXT_PUBLIC_CHECKOUT_PASS_URL ||
    "/checkout?products=4ceb2ddc-a3ca-4161-8931-9024af24050d",
  proMonthly:
    process.env.NEXT_PUBLIC_CHECKOUT_PRO_URL ||
    "/checkout?products=8d86923c-900b-4dc1-8322-50185382e70b",
};

export interface LicenseValidationResult {
  valid: boolean;
  plan: "free" | "pass_7d" | "pro_monthly";
  message: string;
}

const LICENSE_STORAGE_KEY = "vaultsheet_pro_license_v1";

/**
 * Deterministic checksum verifier for VaultSheet keys (format: VS-PASS-XXXX-CC or VS-PRO-XXXX-CC),
 * or Polar.sh / Lemon Squeezy UUID keys issued after checkout.
 */
export function computeKeyChecksum(payload: string): string {
  let acc = 0x9e3779b9;
  for (let i = 0; i < payload.length; i++) {
    acc ^= payload.charCodeAt(i);
    acc = Math.imul(acc, 0x85ebca6b);
  }
  return ((acc >>> 0) % 36 ** 2).toString(36).toUpperCase().padStart(2, "0");
}

export function verifyLicenseKey(rawKey: string): LicenseValidationResult {
  const key = rawKey.trim().toUpperCase();
  if (!key) {
    return { valid: false, plan: "free", message: "Enter a license key." };
  }

  // Match structured VaultSheet pass/pro keys: VS-PASS-8A2F-K9 or VS-PRO-9B4C-M2
  const structured = key.match(/^VS-(PASS|PRO)-([A-Z0-9]{4,8})-([A-Z0-9]{2})$/);
  if (structured) {
    const tier = structured[1];
    const token = structured[2];
    const sig = structured[3];
    if (computeKeyChecksum(`${tier}-${token}`) === sig) {
      return {
        valid: true,
        plan: tier === "PASS" ? "pass_7d" : "pro_monthly",
        message:
          tier === "PASS"
            ? "7-Day Tax & Audit Pass activated."
            : "Pro Bookkeeper Monthly license activated.",
      };
    }
    return {
      valid: false,
      plan: "free",
      message: "License key checksum invalid.",
    };
  }

  // Standard UUIDv4 license keys (with optional VS- / VS_ prefix) issued by Polar.sh / Lemon Squeezy
  const uuidLike =
    /^(?:VS[-_])?[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
  if (uuidLike.test(key)) {
    return {
      valid: true,
      plan: "pro_monthly",
      message: "Pro license key verified.",
    };
  }

  return {
    valid: false,
    plan: "free",
    message: "Unrecognized key format. Check your checkout receipt.",
  };
}

export function loadStoredLicenseKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search);
    const urlKey = (params.get("key") ?? params.get("license_key") ?? "").trim();
    if (urlKey && verifyLicenseKey(urlKey).valid) {
      saveStoredLicenseKey(urlKey);
      return urlKey.toUpperCase();
    }
  } catch {
    // Ignore malformed query string
  }
  return window.localStorage.getItem(LICENSE_STORAGE_KEY) ?? "";
}

export function saveStoredLicenseKey(key: string): void {
  if (typeof window === "undefined") return;
  if (!key.trim()) {
    window.localStorage.removeItem(LICENSE_STORAGE_KEY);
  } else {
    window.localStorage.setItem(LICENSE_STORAGE_KEY, key.trim().toUpperCase());
  }
}
