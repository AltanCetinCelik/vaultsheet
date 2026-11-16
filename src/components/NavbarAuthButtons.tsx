"use client";

import React, { useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, User } from "lucide-react";
import type { StoredLicenseProfile } from "@/lib/licensing";

const LICENSE_CHANGE_EVENT = "vaultsheet-license-changed";
const LICENSE_PROFILE_STORAGE_KEY = "vaultsheet_license_profile_v1";
const LICENSE_KEY_STORAGE_KEY = "vaultsheet_pro_license_v1";

function subscribeStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(LICENSE_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(LICENSE_CHANGE_EVENT, handler);
  };
}

function getProfileSnapshot(): string {
  if (typeof window === "undefined") return "";
  const raw = window.localStorage.getItem(LICENSE_PROFILE_STORAGE_KEY) ?? "";
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredLicenseProfile;
      if (parsed?.expiresAt && Date.parse(parsed.expiresAt) <= Date.now()) {
        return "";
      }
      return raw;
    } catch {
      return "";
    }
  }
  const rawKey = window.localStorage.getItem(LICENSE_KEY_STORAGE_KEY) ?? "";
  return rawKey ? JSON.stringify({ plan: "pro_monthly", planName: "Pro Active", key: rawKey, displayKey: rawKey }) : "";
}

function getServerSnapshot(): string {
  return "";
}

export default function NavbarAuthButtons() {
  const router = useRouter();
  const rawJson = useSyncExternalStore(
    subscribeStorage,
    getProfileSnapshot,
    getServerSnapshot
  );

  const profile = useMemo<StoredLicenseProfile | null>(() => {
    if (!rawJson) return null;
    try {
      return JSON.parse(rawJson) as StoredLicenseProfile;
    } catch {
      return null;
    }
  }, [rawJson]);

  const triggerEvent = (name: string, detail?: Record<string, string>) => {
    if (typeof window === "undefined") return;
    const wb = document.getElementById("workbench");
    if (!wb) {
      const param =
        name === "vaultsheet-open-auth"
          ? `?auth=${detail?.mode ?? "signup"}`
          : "?account=1";
      router.push(`/${param}#workbench`);
      return;
    }
    wb.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dispatchEvent(new CustomEvent(name, { detail }));
  };

  if (profile) {
    const isPaid = profile.plan === "pass_7d" || profile.plan === "pro_monthly";
    return (
      <button
        type="button"
        onClick={() => triggerEvent("vaultsheet-open-account")}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition ${
          isPaid
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
        }`}
      >
        <User className="h-3.5 w-3.5" />
        <span className="max-w-[140px] truncate">
          {profile.customerName || profile.customerEmail || "My Account"}
        </span>
        <span className="hidden text-[11px] font-medium opacity-80 sm:inline">
          &middot; {isPaid ? "Pro" : "Free (25 rows)"}
        </span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => triggerEvent("vaultsheet-open-auth", { mode: "login" })}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900"
      >
        Log In
      </button>
      <button
        type="button"
        onClick={() => triggerEvent("vaultsheet-open-auth", { mode: "signup" })}
        className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
      >
        Sign Up Free
      </button>
    </div>
  );
}
