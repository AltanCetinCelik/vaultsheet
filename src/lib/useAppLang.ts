"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AppLang } from "./financialForensics";

export const LANG_STORAGE_KEY = "vaultsheet_lang_v1";
export const LANG_CHANGE_EVENT = "vaultsheet-lang-changed";

function subscribeLangStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(LANG_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(LANG_CHANGE_EVENT, handler);
  };
}

function loadRawLang(): string {
  if (typeof window === "undefined") return "tr";
  return window.localStorage.getItem(LANG_STORAGE_KEY) ?? "tr";
}

function getServerLangSnapshot(): string {
  return "tr";
}

export function useAppLang(): [AppLang, (next: AppLang) => void] {
  const raw = useSyncExternalStore(
    subscribeLangStorage,
    loadRawLang,
    getServerLangSnapshot
  );
  const lang: AppLang = raw === "en" ? "en" : "tr";

  const setLang = useCallback((nextLang: AppLang) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    window.dispatchEvent(new Event(LANG_CHANGE_EVENT));
  }, []);

  return [lang, setLang];
}
