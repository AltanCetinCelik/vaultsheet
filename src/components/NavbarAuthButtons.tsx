"use client";

import React, { useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Globe, User } from "lucide-react";
import type { StoredLicenseProfile } from "@/lib/licensing";
import { useAppLang } from "@/lib/useAppLang";

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

export default function NavbarAuthButtons({ dark = false }: { dark?: boolean }) {
  const router = useRouter();
  const [lang, setLang] = useAppLang();
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

  const langSwitch = (
    <div
      className={`inline-flex items-center rounded-lg p-0.5 text-[11px] font-bold border ${
        dark
          ? "border-slate-700/80 bg-slate-900/90 text-slate-300"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      <Globe className="ml-2 mr-1 h-3.5 w-3.5 opacity-60" />
      <button
        type="button"
        onClick={() => setLang("tr")}
        className={`rounded-md px-2 py-1 transition cursor-pointer ${
          lang === "tr"
            ? dark
              ? "bg-white text-slate-950"
              : "bg-slate-900 text-white"
            : dark
              ? "hover:text-white"
              : "hover:text-slate-900"
        }`}
      >
        TR
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`rounded-md px-2 py-1 transition cursor-pointer ${
          lang === "en"
            ? dark
              ? "bg-white text-slate-950"
              : "bg-slate-900 text-white"
            : dark
              ? "hover:text-white"
              : "hover:text-slate-900"
        }`}
      >
        EN
      </button>
    </div>
  );

  if (profile) {
    const isPaid = profile.plan === "pass_7d" || profile.plan === "pro_monthly";
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        {langSwitch}
        <button
          type="button"
          onClick={() => triggerEvent("vaultsheet-open-account")}
          className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-semibold transition sm:px-2.5 sm:text-xs cursor-pointer ${
            isPaid
              ? dark
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              : dark
                ? "border-blue-400/40 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25"
                : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
          }`}
        >
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[96px] truncate sm:max-w-[140px]">
            {profile.customerName ||
              profile.customerEmail ||
              (lang === "tr" ? "Hesabım" : "My Account")}
          </span>
          <span className="hidden text-[11px] font-medium opacity-80 sm:inline">
            &middot; {isPaid ? "Pro" : lang === "tr" ? "Ücretsiz" : "Free"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {langSwitch}
      <button
        type="button"
        onClick={() => triggerEvent("vaultsheet-open-auth", { mode: "login" })}
        className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-1 text-[11px] font-semibold transition sm:px-2.5 sm:text-xs cursor-pointer ${
          dark
            ? "border-white/[0.1] bg-[#121822] text-slate-200 hover:border-white/[0.2] hover:text-white"
            : "border-slate-300 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        {lang === "tr" ? "Giriş" : "Log In"}
      </button>
      <button
        type="button"
        onClick={() => triggerEvent("vaultsheet-open-auth", { mode: "signup" })}
        className={`inline-flex items-center whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:text-xs cursor-pointer ${
          dark
            ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {lang === "tr" ? "Başla" : "Sign Up"}
      </button>
    </div>
  );
}
