"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Columns2,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  Scale,
  Search,
  Share2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  User,
  UserCheck,
  X,
} from "lucide-react";
import PdfPagePreview from "@/components/PdfPagePreview";
import MarketRiskTerminal from "@/components/MarketRiskTerminal";
import {
  analyzeStatementForensics,
  generateLegalActionNotice,
  type AppLang,
  type MoneyLeakItem,
} from "@/lib/financialForensics";
import type {
  AccountType,
  CategoryName,
  ExportFormat,
  ParseResult,
  SamplePresetId,
  TransactionRow,
} from "@/lib/types";
import { BANK_PRESETS, generateSampleStatementPdf } from "@/lib/samplePdfGenerator";
import {
  fromCents,
  loadSamplePreset,
  parsePdfFileInBrowser,
  parseRawStatementText,
  PdfPasswordRequiredError,
  reconcileTransactions,
  toCents,
} from "@/lib/statementParser";
import {
  exportAuditCertificatePdfBytes,
  exportToCsv,
  exportToExcelBytes,
  exportToJsonString,
  exportToQboOrOfx,
  getExportMimeAndFilename,
} from "@/lib/exporters";
import {
  ANONYMOUS_ROW_LIMIT,
  CHECKOUT_URLS,
  FREE_ROW_LIMIT,
  getCheckoutUrlWithEmail,
  loadStoredLicenseKey,
  saveStoredLicenseProfile,
  verifyLicenseKey,
  type StoredLicenseProfile,
} from "@/lib/licensing";

const CATEGORIES: CategoryName[] = [
  "Revenue & Payouts",
  "SaaS & Cloud",
  "Payroll & Contractors",
  "Marketing & Ads",
  "Travel & Meals",
  "Transfers & FX",
  "Bank Fees",
  "Utilities & Office",
  "Uncategorized",
];

type WorkbenchExportChoice = ExportFormat | "audit_pdf";
type AuthModalTab = "signup" | "login" | "key";

const LICENSE_CHANGE_EVENT = "vaultsheet-license-changed";
const LICENSE_PROFILE_STORAGE_KEY = "vaultsheet_license_profile_v1";
const CUSTOM_RULES_STORAGE_KEY = "vaultsheet_custom_rules_v1";
const CUSTOM_RULES_CHANGE_EVENT = "vaultsheet-rules-changed";
const HISTORY_STORAGE_KEY = "vaultsheet_history_v1";
const HISTORY_CHANGE_EVENT = "vaultsheet-history-changed";
const FREE_XLSX_STORAGE_KEY = "vaultsheet_free_xlsx_used_v1";
const FREE_XLSX_CHANGE_EVENT = "vaultsheet-free-xlsx-changed";
const LANG_STORAGE_KEY = "vaultsheet_lang_v1";
const LANG_CHANGE_EVENT = "vaultsheet-lang-changed";

interface CustomCategoryRule {
  id: string;
  keyword: string;
  category: CategoryName;
}

interface SavedConversionEntry {
  id: string;
  savedAt: string;
  result: ParseResult;
}

const DEFAULT_CUSTOM_RULES: CustomCategoryRule[] = [
  { id: "rule-stripe", keyword: "STRIPE", category: "Revenue & Payouts" },
  { id: "rule-aws", keyword: "AWS", category: "SaaS & Cloud" },
  { id: "rule-gusto", keyword: "GUSTO", category: "Payroll & Contractors" },
  { id: "rule-ads", keyword: "GOOGLE ADS", category: "Marketing & Ads" },
];
const DEFAULT_CUSTOM_RULES_JSON = JSON.stringify(DEFAULT_CUSTOM_RULES);

function formatMoney(val: number | null, currency: string): string {
  if (val === null) return "—";
  const sign = val < 0 ? "-" : "";
  const abs = Math.abs(val);
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(abs);
    const sym =
      currency === "EUR"
        ? "€"
        : currency === "GBP"
          ? "£"
          : currency === "TRY"
            ? "₺"
            : currency === "CAD"
              ? "CA$"
              : currency === "AUD"
                ? "A$"
                : "$";
    return `${sign}${sym}${formatted}`;
  } catch {
    return `${sign}${abs.toFixed(2)} ${currency}`;
  }
}

function subscribeFreeXlsxStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(FREE_XLSX_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(FREE_XLSX_CHANGE_EVENT, handler);
  };
}

function loadRawFreeXlsxFlag(): string {
  if (typeof window === "undefined") return "0";
  return window.localStorage.getItem(FREE_XLSX_STORAGE_KEY) ?? "0";
}

function getServerFreeXlsxSnapshot(): string {
  return "0";
}

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
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem(LANG_STORAGE_KEY) ?? "en";
}

function getServerLangSnapshot(): string {
  return "en";
}

function subscribeLicenseStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(LICENSE_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(LICENSE_CHANGE_EVENT, handler);
  };
}

function getEmptyServerSnapshot(): string {
  return "";
}

function loadRawLicenseProfileJson(): string {
  if (typeof window === "undefined") return "";
  const raw = window.localStorage.getItem(LICENSE_PROFILE_STORAGE_KEY) ?? "";
  if (!raw) return "";
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

function subscribeRulesStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(CUSTOM_RULES_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CUSTOM_RULES_CHANGE_EVENT, handler);
  };
}

function loadRawRulesJson(): string {
  if (typeof window === "undefined") return DEFAULT_CUSTOM_RULES_JSON;
  return window.localStorage.getItem(CUSTOM_RULES_STORAGE_KEY) ?? DEFAULT_CUSTOM_RULES_JSON;
}

function getServerRulesSnapshot(): string {
  return DEFAULT_CUSTOM_RULES_JSON;
}

function subscribeHistoryStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(HISTORY_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(HISTORY_CHANGE_EVENT, handler);
  };
}

function loadRawHistoryJson(): string {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(HISTORY_STORAGE_KEY) ?? "[]";
}

function getServerHistorySnapshot(): string {
  return "[]";
}

function saveConversionToHistory(parsed: ParseResult) {
  if (typeof window === "undefined" || parsed.transactions.length === 0) return;
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY) ?? "[]";
    const list = (JSON.parse(raw) as SavedConversionEntry[]) || [];
    const trimmedResult: ParseResult = {
      ...parsed,
      transactions: parsed.transactions.slice(0, 400),
    };
    const next: SavedConversionEntry[] = [
      {
        id: `hist-${Date.now()}`,
        savedAt: new Date().toISOString(),
        result: trimmedResult,
      },
      ...list.filter((item) => item.result.metadata.fileName !== parsed.metadata.fileName),
    ].slice(0, 5);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(HISTORY_CHANGE_EVENT));
  } catch {
    // Ignore localStorage quota errors
  }
}

function formatExpiryShort(iso?: string): string {
  if (!iso) return "Active (No Expiry)";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "Active";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

function triggerBlobDownload(data: BlobPart, mimeType: string, fileName: string) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface ConverterWorkbenchProps {
  defaultPreset?: SamplePresetId;
  contextBankName?: string;
}

export default function ConverterWorkbench({
  defaultPreset = "chase",
  contextBankName,
}: ConverterWorkbenchProps) {
  const [activeSuiteModule, setActiveSuiteModule] = useState<
    "converter" | "market" | "audit"
  >("converter");
  const [viewMode, setViewMode] = useState<"upload" | "results">("results");
  const [activePreset, setActivePreset] = useState<SamplePresetId>(defaultPreset);
  const [auditSubTab, setAuditSubTab] = useState<"leaks" | "tax" | "cashflow">("leaks");
  const [taxBracketPct, setTaxBracketPct] = useState<number>(25);
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [cutLeakIds, setCutLeakIds] = useState<string[]>([]);
  const [activeNoticeItem, setActiveNoticeItem] = useState<MoneyLeakItem | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);
  const [result, setResult] = useState<ParseResult>(() => loadSamplePreset(defaultPreset));
  const [explicitOpening, setExplicitOpening] = useState<number | null>(() => {
    const init = loadSamplePreset(defaultPreset);
    return init.reconciliation.openingBalance;
  });
  const [explicitClosing, setExplicitClosing] = useState<number | null>(() => {
    const init = loadSamplePreset(defaultPreset);
    return init.reconciliation.closingBalance;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatusText, setParseStatusText] = useState<string>(
    "Reading and reconciling your PDF safely on this device..."
  );
  const [activePdfBytes, setActivePdfBytes] = useState<Uint8Array | null>(() =>
    generateSampleStatementPdf(defaultPreset)
  );
  const [activePdfPassword, setActivePdfPassword] = useState<string | undefined>(undefined);
  const [previewPage, setPreviewPage] = useState(1);
  const [showPdfSplitView, setShowPdfSplitView] = useState(true);

  const [pendingPasswordFile, setPendingPasswordFile] = useState<File | null>(null);
  const [pdfPasswordInput, setPdfPasswordInput] = useState("");
  const [pdfPasswordError, setPdfPasswordError] = useState<string | null>(null);
  const [isUnlockingPdf, setIsUnlockingPdf] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [secondaryFormat, setSecondaryFormat] =
    useState<WorkbenchExportChoice>("quickbooks_csv");

  const storedLicenseKey = useSyncExternalStore(
    subscribeLicenseStorage,
    loadStoredLicenseKey,
    getEmptyServerSnapshot
  );
  const rawLicenseProfileJson = useSyncExternalStore(
    subscribeLicenseStorage,
    loadRawLicenseProfileJson,
    getEmptyServerSnapshot
  );
  const rawCustomRulesJson = useSyncExternalStore(
    subscribeRulesStorage,
    loadRawRulesJson,
    getServerRulesSnapshot
  );
  const rawHistoryJson = useSyncExternalStore(
    subscribeHistoryStorage,
    loadRawHistoryJson,
    getServerHistorySnapshot
  );
  const rawFreeXlsxFlag = useSyncExternalStore(
    subscribeFreeXlsxStorage,
    loadRawFreeXlsxFlag,
    getServerFreeXlsxSnapshot
  );
  const rawLang = useSyncExternalStore(
    subscribeLangStorage,
    loadRawLang,
    getServerLangSnapshot
  );
  const lang: AppLang = rawLang === "tr" ? "tr" : "en";

  const setAppLang = useCallback((nextLang: AppLang) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    window.dispatchEvent(new Event(LANG_CHANGE_EVENT));
  }, []);

  // Auth & Account modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<AuthModalTab>("signup");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [licenseKeyDraft, setLicenseKeyDraft] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Paste OCR modal & custom rules
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState<CategoryName>("SaaS & Cloud");
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoVerifyAttemptedRef = useRef(false);

  const storedProfile = useMemo<StoredLicenseProfile | null>(() => {
    if (!rawLicenseProfileJson) return null;
    try {
      const parsed = JSON.parse(rawLicenseProfileJson) as StoredLicenseProfile;
      if (!parsed || typeof parsed.plan !== "string") return null;
      return parsed;
    } catch {
      return null;
    }
  }, [rawLicenseProfileJson]);

  const customRules = useMemo<CustomCategoryRule[]>(() => {
    try {
      const parsed = JSON.parse(rawCustomRulesJson) as CustomCategoryRule[];
      return Array.isArray(parsed) ? parsed : DEFAULT_CUSTOM_RULES;
    } catch {
      return DEFAULT_CUSTOM_RULES;
    }
  }, [rawCustomRulesJson]);

  const savedHistory = useMemo<SavedConversionEntry[]>(() => {
    try {
      const parsed = JSON.parse(rawHistoryJson) as SavedConversionEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [rawHistoryJson]);

  const accountTier = useMemo(() => {
    if (storedProfile) {
      const isPaid =
        storedProfile.plan === "pass_7d" || storedProfile.plan === "pro_monthly";
      return {
        isLoggedIn: true,
        isPaid,
        plan: storedProfile.plan,
        planName: storedProfile.planName,
        rowLimit: isPaid ? Infinity : FREE_ROW_LIMIT,
      };
    }
    if (storedLicenseKey && verifyLicenseKey(storedLicenseKey).valid) {
      const legacy = verifyLicenseKey(storedLicenseKey);
      return {
        isLoggedIn: true,
        isPaid: true,
        plan: legacy.plan as "pass_7d" | "pro_monthly",
        planName:
          legacy.plan === "pass_7d"
            ? "7-Day Tax & Audit Pass"
            : "Annual Pro Bookkeeper Pass",
        rowLimit: Infinity,
      };
    }
    return {
      isLoggedIn: false,
      isPaid: false,
      plan: "anonymous" as const,
      planName: "Guest Preview",
      rowLimit: ANONYMOUS_ROW_LIMIT,
    };
  }, [storedProfile, storedLicenseKey]);

  const freeExcelUsed = rawFreeXlsxFlag === "1";
  const isMultiFileCurrent = result.metadata.fileName.endsWith("-statements-merged.pdf");
  const freeExcelAvailable =
    !result.isSample &&
    !accountTier.isPaid &&
    !freeExcelUsed &&
    !isMultiFileCurrent &&
    result.transactions.length > 0 &&
    result.transactions.length <= 100;

  const licenseKeyInput = licenseKeyDraft ?? storedLicenseKey;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3600);
  }, []);

  // Listen to navbar Sign Up / Log In / My Account events + handle Polar checkout return
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOpenAuth = (evt: Event) => {
      const custom = evt as CustomEvent<{ mode?: AuthModalTab }>;
      setAuthTab(custom.detail?.mode ?? "signup");
      setAuthError(null);
      setUpgradeReason("");
      setShowAuthModal(true);
    };

    const onOpenAccount = () => {
      setShowAccountModal(true);
    };

    window.addEventListener("vaultsheet-open-auth", onOpenAuth);
    window.addEventListener("vaultsheet-open-account", onOpenAccount);

    if (!autoVerifyAttemptedRef.current) {
      const params = new URLSearchParams(window.location.search);
      const authParam = params.get("auth");
      const accountParam = params.get("account");
      if (authParam === "signup" || authParam === "login" || authParam === "key") {
        Promise.resolve().then(() => {
          setAuthTab(authParam);
          setShowAuthModal(true);
        });
      } else if (accountParam === "1") {
        Promise.resolve().then(() => {
          setShowAccountModal(true);
        });
      }
      const checkoutId = params.get("checkout_id")?.trim() ?? "";

      if (checkoutId) {
        autoVerifyAttemptedRef.current = true;
        fetch("/api/license", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkoutId }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.valid && data?.key) {
              saveStoredLicenseProfile({
                key: data.key,
                displayKey: data.displayKey || data.key,
                plan: data.plan,
                planName: data.planName,
                customerEmail: data.customerEmail,
                customerName: data.customerName,
                purchasedAt: data.purchasedAt,
                expiresAt: data.expiresAt,
                portalUrl: data.portalUrl,
              });
              window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
              const nextUrl = new URL(window.location.href);
              nextUrl.searchParams.delete("checkout_id");
              window.history.replaceState(
                {},
                "",
                nextUrl.pathname + nextUrl.search + nextUrl.hash
              );
              setShowAccountModal(true);
              showToast(data.message || "Your Pro Pass is now active!");
            }
          })
          .catch(() => {
            // Ignore transient network errors
          });
      } else if (storedLicenseKey && !storedProfile) {
        autoVerifyAttemptedRef.current = true;
        fetch("/api/license", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: storedLicenseKey }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.valid && data?.key) {
              saveStoredLicenseProfile({
                key: data.key,
                displayKey: data.displayKey || data.key,
                plan: data.plan,
                planName: data.planName,
                customerEmail: data.customerEmail,
                customerName: data.customerName,
                purchasedAt: data.purchasedAt,
                expiresAt: data.expiresAt,
                portalUrl: data.portalUrl,
              });
              window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
            }
          })
          .catch(() => {
            // Keep offline checksum fallback active
          });
      }
    }

    return () => {
      window.removeEventListener("vaultsheet-open-auth", onOpenAuth);
      window.removeEventListener("vaultsheet-open-account", onOpenAccount);
    };
  }, [storedLicenseKey, storedProfile, showToast]);

  const updateRowsAndReconcile = useCallback(
    (
      nextRows: TransactionRow[],
      nextOpening: number | null = explicitOpening,
      nextClosing: number | null = explicitClosing
    ) => {
      const { transactions, reconciliation } = reconcileTransactions(
        nextRows,
        nextOpening,
        nextClosing
      );
      setResult((prev) => ({
        ...prev,
        transactions,
        reconciliation,
      }));
    },
    [explicitOpening, explicitClosing]
  );

  const applyCustomRulesToRows = useCallback(
    (rows: TransactionRow[]): TransactionRow[] => {
      if (!accountTier.isPaid || customRules.length === 0) return rows;
      return rows.map((row) => {
        const descUpper = row.description.toUpperCase();
        for (const rule of customRules) {
          if (rule.keyword && descUpper.includes(rule.keyword.toUpperCase())) {
            return { ...row, category: rule.category };
          }
        }
        return row;
      });
    },
    [accountTier.isPaid, customRules]
  );

  const handleLoadSample = useCallback((presetId: SamplePresetId) => {
    setActivePreset(presetId);
    const parsed = loadSamplePreset(presetId);
    setResult(parsed);
    setActivePdfBytes(generateSampleStatementPdf(presetId));
    setActivePdfPassword(undefined);
    setPreviewPage(1);
    setExplicitOpening(parsed.reconciliation.openingBalance);
    setExplicitClosing(parsed.reconciliation.closingBalance);
    setCategoryFilter("ALL");
    setSearchQuery("");
    setCutLeakIds([]);
    setActiveNoticeItem(null);
    setViewMode("results");
  }, []);

  const handleRestoreHistory = useCallback(
    (entry: SavedConversionEntry) => {
      setResult(entry.result);
      setActivePdfBytes(null);
      setActivePdfPassword(undefined);
      setPreviewPage(1);
      setExplicitOpening(entry.result.reconciliation.openingBalance);
      setExplicitClosing(entry.result.reconciliation.closingBalance);
      setCategoryFilter("ALL");
      setSearchQuery("");
      setCutLeakIds([]);
      setActiveNoticeItem(null);
      setViewMode("results");
      showToast(`Reopened "${entry.result.metadata.fileName}" from your saved history.`);
    },
    [showToast]
  );

  const handleDownloadSamplePdf = useCallback(() => {
    const pdfBytes = generateSampleStatementPdf(activePreset);
    const copy = new Uint8Array(pdfBytes.byteLength);
    copy.set(pdfBytes);
    triggerBlobDownload(
      copy.buffer,
      "application/pdf",
      BANK_PRESETS[activePreset].sampleFileName
    );
    showToast(
      `Downloaded sample PDF (${BANK_PRESETS[activePreset].sampleFileName}) — drop it here to test real extraction.`
    );
  }, [activePreset, showToast]);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => {
        const lower = f.name.toLowerCase();
        return (
          f.type === "application/pdf" ||
          lower.endsWith(".pdf") ||
          lower.endsWith(".csv") ||
          lower.endsWith(".txt")
        );
      });
      if (files.length === 0) {
        showToast("Please select a valid .pdf, .csv, or .txt bank statement file.");
        return;
      }

      setIsParsing(true);
      setParseStatusText("Reading and reconciling your PDF safely on this device...");
      try {
        const parsedList: ParseResult[] = [];
        let firstPdfBytes: Uint8Array | null = null;

        for (const f of files) {
          const lower = f.name.toLowerCase();
          if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
            const raw = await f.text();
            parsedList.push(parseRawStatementText(raw, f.name));
          } else {
            if (!firstPdfBytes) {
              firstPdfBytes = new Uint8Array(await f.arrayBuffer());
            }
            const parsedPdf = await parsePdfFileInBrowser(f, {
              onStatus: (msg) => setParseStatusText(msg),
            });
            parsedList.push(parsedPdf);
          }
        }

        let finalResult: ParseResult;
        if (parsedList.length === 1) {
          const singleRaw = parsedList[0];
          finalResult = {
            ...singleRaw,
            transactions: applyCustomRulesToRows(singleRaw.transactions),
          };
          setExplicitOpening(finalResult.reconciliation.openingBalance);
          setExplicitClosing(finalResult.reconciliation.closingBalance);
          showToast(
            finalResult.metadata.parseMode === "ocr-tesseract"
              ? `Scanned PDF read via local OCR: ${finalResult.transactions.length} transactions extracted.`
              : `Converted ${finalResult.transactions.length} transactions locally (${finalResult.metadata.parseMode}).`
          );
        } else {
          const mergedRows = applyCustomRulesToRows(
            parsedList
              .flatMap((p) => p.transactions)
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((r, i) => ({ ...r, id: `batch-${i + 1}` }))
          );
          const first = parsedList[0];
          const last = parsedList[parsedList.length - 1];
          const openBal = first.reconciliation.openingBalance;
          const closeBal = last.reconciliation.closingBalance;
          const { transactions, reconciliation } = reconcileTransactions(
            mergedRows,
            openBal,
            closeBal
          );
          setExplicitOpening(openBal);
          setExplicitClosing(closeBal);
          finalResult = {
            metadata: {
              fileName: `${files.length}-statements-merged.pdf`,
              bankDetected: `${first.metadata.bankDetected} (${files.length} Files Merged)`,
              currency: first.metadata.currency,
              pageCount: parsedList.reduce((acc, p) => acc + p.metadata.pageCount, 0),
              accountLast4: first.metadata.accountLast4,
              accountType: first.metadata.accountType,
              routingNumber: first.metadata.routingNumber,
              periodStart: transactions[0]?.date ?? null,
              periodEnd: transactions[transactions.length - 1]?.date ?? null,
              parseMode: first.metadata.parseMode,
            },
            transactions,
            reconciliation,
            warnings: parsedList.flatMap((p) => p.warnings),
            isSample: false,
          };
          showToast(
            `Merged ${files.length} files (${transactions.length} rows) locally.`
          );
        }

        setActivePdfBytes(firstPdfBytes);
        setActivePdfPassword(undefined);
        setPreviewPage(1);
        setShowPdfSplitView(Boolean(firstPdfBytes));
        setResult(finalResult);
        saveConversionToHistory(finalResult);
        setCategoryFilter("ALL");
        setSearchQuery("");
        setCutLeakIds([]);
        setActiveNoticeItem(null);
        setActiveSuiteModule((prev) => (prev === "market" ? "converter" : prev));
        setViewMode("results");
      } catch (err) {
        if (err instanceof PdfPasswordRequiredError) {
          setPendingPasswordFile(files[0]);
          setPdfPasswordInput("");
          setPdfPasswordError(null);
        } else {
          showToast("Could not parse this file. Try pasting OCR text or checking file format.");
        }
      } finally {
        setIsParsing(false);
        setParseStatusText("Reading and reconciling your PDF safely on this device...");
      }
    },
    [showToast, applyCustomRulesToRows]
  );

  const handleUnlockPdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPasswordFile || !pdfPasswordInput) {
      setPdfPasswordError("Enter the password for this PDF.");
      return;
    }

    setIsUnlockingPdf(true);
    setPdfPasswordError(null);
    try {
      const pdfBytes = new Uint8Array(await pendingPasswordFile.arrayBuffer());
      const parsedRaw = await parsePdfFileInBrowser(pendingPasswordFile, {
        password: pdfPasswordInput,
        onStatus: (msg) => setParseStatusText(msg),
      });
      const finalResult: ParseResult = {
        ...parsedRaw,
        transactions: applyCustomRulesToRows(parsedRaw.transactions),
      };
      setActivePdfBytes(pdfBytes);
      setActivePdfPassword(pdfPasswordInput);
      setPreviewPage(1);
      setShowPdfSplitView(true);
      setExplicitOpening(finalResult.reconciliation.openingBalance);
      setExplicitClosing(finalResult.reconciliation.closingBalance);
      setResult(finalResult);
      saveConversionToHistory(finalResult);
      setCategoryFilter("ALL");
      setSearchQuery("");
      setCutLeakIds([]);
      setActiveNoticeItem(null);
      setPendingPasswordFile(null);
      setPdfPasswordInput("");
      setActiveSuiteModule((prev) => (prev === "market" ? "converter" : prev));
      setViewMode("results");
      showToast(
        `Unlocked and extracted ${finalResult.transactions.length} transactions locally.`
      );
    } catch (err) {
      if (err instanceof PdfPasswordRequiredError) {
        setPdfPasswordError(err.message);
      } else {
        setPdfPasswordError("Could not decrypt or parse this PDF file.");
      }
    } finally {
      setIsUnlockingPdf(false);
    }
  };

  const handleCellChange = (
    rowId: string,
    field: "date" | "description" | "category" | "amount" | "balance",
    value: string
  ) => {
    const nextRows = result.transactions.map((r) => {
      if (r.id !== rowId) return r;
      if (field === "date") return { ...r, date: value };
      if (field === "description") return { ...r, description: value };
      if (field === "category") return { ...r, category: value as CategoryName };
      if (field === "amount") {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) return r;
        const cents = toCents(parsed);
        return {
          ...r,
          amount: fromCents(cents),
          debit: cents < 0 ? fromCents(Math.abs(cents)) : null,
          credit: cents > 0 ? fromCents(cents) : null,
        };
      }
      if (field === "balance") {
        const trimmed = value.trim();
        if (!trimmed) return { ...r, balance: null };
        const parsed = Number.parseFloat(trimmed);
        return Number.isFinite(parsed)
          ? { ...r, balance: fromCents(toCents(parsed)) }
          : r;
      }
      return r;
    });
    updateRowsAndReconcile(nextRows);
  };

  const handleFlipSign = (rowId: string) => {
    const nextRows = result.transactions.map((r) => {
      if (r.id !== rowId) return r;
      const flipped = -toCents(r.amount);
      return {
        ...r,
        amount: fromCents(flipped),
        debit: flipped < 0 ? fromCents(Math.abs(flipped)) : null,
        credit: flipped > 0 ? fromCents(flipped) : null,
      };
    });
    updateRowsAndReconcile(nextRows);
  };

  const handleDeleteRow = (rowId: string) => {
    updateRowsAndReconcile(result.transactions.filter((r) => r.id !== rowId));
  };

  const handleAddRow = () => {
    const lastDate =
      result.transactions[result.transactions.length - 1]?.date ?? "2026-10-31";
    const newRow: TransactionRow = {
      id: `manual-${Date.now()}`,
      sourceFile: result.metadata.fileName,
      page: 1,
      date: lastDate,
      description: "Manual Adjustment Entry",
      debit: null,
      credit: null,
      amount: 0,
      balance: null,
      category: "Uncategorized",
      stitchedLines: 0,
      balanceStatus: "unverified",
      discrepancyCents: 0,
    };
    updateRowsAndReconcile([...result.transactions, newRow]);
  };

  const handleAccountTypeChange = (nextType: AccountType) => {
    setResult((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        accountType: nextType,
      },
    }));
    showToast(`QuickBooks account type set to ${nextType}.`);
  };

  const handleInvertAllSigns = () => {
    const flipped = result.transactions.map((r) => {
      const nextAmount = fromCents(-toCents(r.amount));
      return {
        ...r,
        amount: nextAmount,
        debit: nextAmount < 0 ? Math.abs(nextAmount) : null,
        credit: nextAmount > 0 ? nextAmount : null,
      };
    });
    updateRowsAndReconcile(flipped);
    showToast("Inverted Debit/Credit signs across all transactions.");
  };

  const handleRemoveDuplicates = () => {
    const cleanRows = result.transactions.filter((r) => !r.isDuplicate);
    updateRowsAndReconcile(cleanRows);
    showToast(`Removed ${result.transactions.length - cleanRows.length} duplicate rows.`);
  };

  const handleParsePastedText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) {
      showToast("Paste raw statement or OCR lines first.");
      return;
    }
    const parsedRaw = parseRawStatementText(pastedText, "pasted-statement.txt");
    const parsed = {
      ...parsedRaw,
      transactions: applyCustomRulesToRows(parsedRaw.transactions),
    };
    setResult(parsed);
    setActivePdfBytes(null);
    setActivePdfPassword(undefined);
    setPreviewPage(1);
    saveConversionToHistory(parsed);
    setExplicitOpening(parsed.reconciliation.openingBalance);
    setExplicitClosing(parsed.reconciliation.closingBalance);
    setCategoryFilter("ALL");
    setSearchQuery("");
    setCutLeakIds([]);
    setActiveNoticeItem(null);
    setShowPasteModal(false);
    setActiveSuiteModule((prev) => (prev === "market" ? "converter" : prev));
    setViewMode("results");
    showToast(`Parsed ${parsed.transactions.length} rows locally from pasted text.`);
  };

  const handleExport = (choice: WorkbenchExportChoice, sampleSliceOnly = false) => {
    if (result.transactions.length === 0) {
      showToast("No transactions loaded to export.");
      return;
    }

    if (choice === "audit_pdf") {
      if (!result.isSample && !accountTier.isPaid) {
        setUpgradeReason(
          "CPA Audit Certificate PDFs require a $12 7-Day Pass or Annual Pro license (or test it free on any sample statement)."
        );
        setAuthTab("signup");
        setShowAuthModal(true);
        return;
      }
      const bytes = exportAuditCertificatePdfBytes(result);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const stem =
        result.metadata.fileName.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9_-]+/g, "-") ||
        "statement";
      triggerBlobDownload(copy.buffer, "application/pdf", `${stem}-audit-certificate.pdf`);
      showToast(`Downloaded CPA Audit Certificate (${stem}-audit-certificate.pdf) locally.`);
      return;
    }

    const format: ExportFormat = choice;
    const isProFormat = format === "xlsx" || format === "qbo" || format === "ofx";
    const isMultiFileBatch = result.metadata.fileName.endsWith("-statements-merged.pdf");
    const qualifiesFirstFreeExcel =
      !result.isSample &&
      !accountTier.isPaid &&
      !sampleSliceOnly &&
      !isMultiFileBatch &&
      !freeExcelUsed &&
      (format === "xlsx" || format === "csv") &&
      result.transactions.length <= 100;
    const exceedsTierRows =
      !result.isSample &&
      !qualifiesFirstFreeExcel &&
      result.transactions.length > accountTier.rowLimit;

    if (
      !result.isSample &&
      !accountTier.isPaid &&
      !sampleSliceOnly &&
      !qualifiesFirstFreeExcel &&
      (isProFormat || exceedsTierRows || isMultiFileBatch)
    ) {
      if (!accountTier.isLoggedIn && exceedsTierRows && !isProFormat) {
        setUpgradeReason(
          `Guests can preview and export up to ${ANONYMOUS_ROW_LIMIT} CSV rows (${result.transactions.length} detected). Create a Free Account for ${FREE_ROW_LIMIT} free rows + saved history, or unlock Unlimited with a $12 Pass.`
        );
        setAuthTab("signup");
      } else {
        setUpgradeReason(
          isMultiFileBatch
            ? `Multi-statement merged exports (${result.transactions.length} rows) require a $12 7-Day Pass or $29/yr Pro license.`
            : exceedsTierRows
              ? `Your statement has ${result.transactions.length} transactions. ${
                  accountTier.isLoggedIn
                    ? `Free accounts allow up to ${FREE_ROW_LIMIT} rows per PDF`
                    : `Guest preview allows up to ${ANONYMOUS_ROW_LIMIT} rows (or ${FREE_ROW_LIMIT} rows with a Free Account)`
                }. Export Unlimited rows with a $12 Pass or test ${Math.min(accountTier.rowLimit, result.transactions.length)} rows free first.`
              : `You've already used your 1st Free Excel export, or .QBO/.OFX requires a $12 Pass or Annual Pro license. Unlock unlimited exports below!`
        );
        setAuthTab("key");
      }
      setAuthError(null);
      setShowAuthModal(true);
      return;
    }

    let exportTarget = result;
    let exportFileBase = result.metadata.fileName;
    if (sampleSliceOnly && result.transactions.length > accountTier.rowLimit) {
      const slicedRows = result.transactions.slice(0, accountTier.rowLimit);
      const { transactions, reconciliation } = reconcileTransactions(
        slicedRows,
        explicitOpening,
        null
      );
      exportTarget = {
        ...result,
        transactions,
        reconciliation,
      };
      exportFileBase = `${result.metadata.fileName.replace(/\.[^.]+$/, "")}-sample${accountTier.rowLimit}.pdf`;
    }

    const { mimeType, downloadName } = getExportMimeAndFilename(
      exportFileBase,
      format
    );

    if (format === "xlsx") {
      const bytes = exportToExcelBytes(exportTarget);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      triggerBlobDownload(copy.buffer, mimeType, downloadName);
    } else if (format === "csv") {
      triggerBlobDownload(exportToCsv(exportTarget, "standard"), mimeType, downloadName);
    } else if (format === "quickbooks_csv") {
      triggerBlobDownload(exportToCsv(exportTarget, "quickbooks"), mimeType, downloadName);
    } else if (format === "quickbooks_3col_csv") {
      triggerBlobDownload(exportToCsv(exportTarget, "quickbooks_3col"), mimeType, downloadName);
    } else if (format === "xero_csv") {
      triggerBlobDownload(exportToCsv(exportTarget, "xero"), mimeType, downloadName);
    } else if (format === "qbo" || format === "ofx") {
      triggerBlobDownload(exportToQboOrOfx(exportTarget, format), mimeType, downloadName);
    } else {
      triggerBlobDownload(exportToJsonString(exportTarget), mimeType, downloadName);
    }

    if (qualifiesFirstFreeExcel && typeof window !== "undefined") {
      window.localStorage.setItem(FREE_XLSX_STORAGE_KEY, "1");
      window.dispatchEvent(new Event(FREE_XLSX_CHANGE_EVENT));
    }

    showToast(
      sampleSliceOnly
        ? `Downloaded ${accountTier.rowLimit}-row test (${downloadName}) locally.`
        : qualifiesFirstFreeExcel
          ? `Downloaded your 1st full ${format.toUpperCase()} file free! Upgrade anytime for unlimited files & QuickBooks .QBO.`
          : `Downloaded ${downloadName} locally — 0 bytes sent to any server.`
    );
  };

  const handleExplicitBalanceChange = (kind: "opening" | "closing", rawValue: string) => {
    const trimmed = rawValue.trim();
    const num = trimmed === "" ? null : Number(trimmed);
    const parsed = num !== null && Number.isFinite(num) ? num : null;
    const nextOpen = kind === "opening" ? parsed : explicitOpening;
    const nextClose = kind === "closing" ? parsed : explicitClosing;
    setExplicitOpening(nextOpen);
    setExplicitClosing(nextClose);
    updateRowsAndReconcile(result.transactions, nextOpen, nextClose);
  };

  const handleMetadataField = (field: "currency" | "accountLast4", value: string) => {
    setResult((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]:
          field === "accountLast4"
            ? value.replace(/\D/g, "").slice(0, 4) || "0000"
            : value,
      },
    }));
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmittingAuth(true);

    try {
      if (authTab === "key") {
        const trimmed = licenseKeyInput.trim();
        if (!trimmed) {
          setAuthError("Enter your checkout email address or VS- license key.");
          return;
        }
        const response = await fetch("/api/license", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: trimmed }),
        });
        const data = await response.json();
        if (response.ok && data?.valid && data?.key) {
          saveStoredLicenseProfile({
            key: data.key,
            displayKey: data.displayKey || data.key,
            plan: data.plan,
            planName: data.planName || "Pro Pass",
            customerEmail: data.customerEmail,
            customerName: data.customerName,
            purchasedAt: data.purchasedAt,
            expiresAt: data.expiresAt,
            portalUrl: data.portalUrl,
          });
          setLicenseKeyDraft(null);
          window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
          setShowAuthModal(false);
          setShowAccountModal(true);
          showToast(data.message || "License activated!");
        } else {
          setAuthError(data?.message || "Invalid email or license key.");
        }
        return;
      }

      // Signup or Login via /api/auth
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: authTab,
          name: authName,
          email: authEmail,
          password: authPassword,
        }),
      });
      const data = await response.json();
      if (response.ok && data?.valid && data?.profile) {
        saveStoredLicenseProfile(data.profile as StoredLicenseProfile);
        setAuthPassword("");
        window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
        setShowAuthModal(false);
        setShowAccountModal(true);
        showToast(data.message || "Signed in!");
      } else {
        setAuthError(data?.message || "Authentication failed. Please check your details.");
      }
    } catch {
      setAuthError("Connection error. Please try again.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSignOut = () => {
    saveStoredLicenseProfile(null);
    setLicenseKeyDraft("");
    setAuthError(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
    }
    setShowAccountModal(false);
    showToast("Signed out of VaultSheet on this browser.");
  };

  const persistCustomRules = (nextRules: CustomCategoryRule[]) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOM_RULES_STORAGE_KEY, JSON.stringify(nextRules));
    window.dispatchEvent(new Event(CUSTOM_RULES_CHANGE_EVENT));
  };

  const handleAddCustomRule = (e: React.FormEvent) => {
    e.preventDefault();
    const kw = newRuleKeyword.trim();
    if (!kw) return;
    const nextRules: CustomCategoryRule[] = [
      ...customRules,
      { id: `rule-${Date.now()}`, keyword: kw.toUpperCase(), category: newRuleCategory },
    ];
    persistCustomRules(nextRules);
    setNewRuleKeyword("");
    showToast(`Saved rule: "${kw.toUpperCase()}" -> ${newRuleCategory}`);
  };

  const handleDeleteCustomRule = (ruleId: string) => {
    persistCustomRules(customRules.filter((r) => r.id !== ruleId));
  };

  const handleApplyCustomRules = () => {
    let updatedCount = 0;
    const nextRows = result.transactions.map((row) => {
      const descUpper = row.description.toUpperCase();
      for (const rule of customRules) {
        if (rule.keyword && descUpper.includes(rule.keyword.toUpperCase())) {
          if (row.category !== rule.category) {
            updatedCount += 1;
            return { ...row, category: rule.category };
          }
          break;
        }
      }
      return row;
    });
    updateRowsAndReconcile(nextRows);
    showToast(
      updatedCount > 0
        ? `Auto-categorized ${updatedCount} transaction${updatedCount === 1 ? "" : "s"}.`
        : "All matching rows already follow your rules."
    );
  };

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return result.transactions.filter((r) => {
      const matchesCat = categoryFilter === "ALL" || r.category === categoryFilter;
      const matchesQuery =
        !q ||
        r.description.toLowerCase().includes(q) ||
        r.date.includes(q) ||
        r.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [result.transactions, categoryFilter, searchQuery]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of result.transactions) {
      map.set(r.category, (map.get(r.category) ?? 0) + 1);
    }
    return map;
  }, [result.transactions]);

  const forensics = useMemo(
    () =>
      analyzeStatementForensics(result, {
        taxBracketPct,
        includeVat,
        cutLeakIds,
      }),
    [result, taxBracketPct, includeVat, cutLeakIds]
  );

  const legalNotice = useMemo(() => {
    if (!activeNoticeItem) return null;
    return generateLegalActionNotice(
      activeNoticeItem,
      result.metadata,
      lang,
      formatMoney(activeNoticeItem.monthlyAmount, result.metadata.currency)
    );
  }, [activeNoticeItem, result.metadata, lang]);

  const handleToggleCutLeak = useCallback((leakId: string) => {
    setCutLeakIds((prev) =>
      prev.includes(leakId) ? prev.filter((id) => id !== leakId) : [...prev, leakId]
    );
  }, []);

  const handleCopyAuditSummary = useCallback(() => {
    const summaryText = [
      `VaultSheet Verified Audit Report — ${result.metadata.bankDetected} (Acct ****${result.metadata.accountLast4})`,
      `Period: ${result.metadata.periodStart ?? "—"} to ${result.metadata.periodEnd ?? "—"} | Currency: ${result.metadata.currency}`,
      `Reconciliation: ${result.reconciliation.isFullyReconciled ? "VERIFIED ($0.00 diff)" : `Review Needed (${result.reconciliation.mismatchRows} mismatch)`}`,
      `Opening Balance: ${formatMoney(result.reconciliation.openingBalance, result.metadata.currency)}`,
      `Total Credits: +${formatMoney(result.reconciliation.totalCredits, result.metadata.currency)}`,
      `Total Debits: -${formatMoney(result.reconciliation.totalDebits, result.metadata.currency)}`,
      `Closing Balance: ${formatMoney(result.reconciliation.closingBalance ?? result.reconciliation.calculatedClosingBalance, result.metadata.currency)}`,
      `Detected Annual Leaks: ${formatMoney(forensics.totalDetectedLeaksAnnual, result.metadata.currency)} (${forensics.leaks.length} items)`,
      `5-Yr Wealth Recovery (@ 12%): +${formatMoney(forensics.savedFiveYearCompounded, result.metadata.currency)}`,
      `Claimable Tax & VAT Shield: +${formatMoney(forensics.totalTaxCashback, result.metadata.currency)} (${forensics.taxItems.length} deductible lines)`,
    ].join("\n");

    if (typeof navigator !== "undefined") {
      void navigator.clipboard.writeText(summaryText);
      showToast(
        lang === "tr"
          ? "Müşteri / Mali Müşavir denetim özeti panoya kopyalandı."
          : "Client / CPA audit verification summary copied to clipboard."
      );
    }
  }, [result, forensics, lang, showToast]);

  const { reconciliation, metadata } = result;
  const passCheckoutHref = getCheckoutUrlWithEmail(
    CHECKOUT_URLS.pass7Day,
    storedProfile?.customerEmail
  );
  const proCheckoutHref = getCheckoutUrlWithEmail(
    CHECKOUT_URLS.proMonthly,
    storedProfile?.customerEmail
  );

  const handleDragOverShell = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDropOnShell = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOverShell}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDropOnShell}
      className={`w-full overflow-hidden rounded-2xl border bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] transition ${
        isDragging ? "border-blue-600 ring-4 ring-blue-500/15" : "border-slate-200"
      }`}
    >
      {/* Hidden shared file input so both Top Bar & Dropzone work identically */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            void handleFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* Minimalist Suite Pillar Switcher Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-6">
        <div
          role="tablist"
          aria-label="VaultSheet Suite Modules"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSuiteModule === "converter"}
            onClick={() => setActiveSuiteModule("converter")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              activeSuiteModule === "converter"
                ? "bg-slate-900 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet
              className={`h-3.5 w-3.5 ${
                activeSuiteModule === "converter" ? "text-blue-400" : "text-blue-600"
              }`}
            />
            <span>{lang === "tr" ? "PDF Ekstre Çevirici" : "PDF Converter"}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSuiteModule === "market"}
            onClick={() => setActiveSuiteModule("market")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              activeSuiteModule === "market"
                ? "bg-slate-900 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Activity
              className={`h-3.5 w-3.5 ${
                activeSuiteModule === "market" ? "text-emerald-400" : "text-emerald-600"
              }`}
            />
            <span>{lang === "tr" ? "Piyasa & Risk Terminali" : "Market & Risk Terminal"}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSuiteModule === "audit"}
            onClick={() => setActiveSuiteModule("audit")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              activeSuiteModule === "audit"
                ? "bg-slate-900 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Shield
              className={`h-3.5 w-3.5 ${
                activeSuiteModule === "audit" ? "text-indigo-400" : "text-indigo-600"
              }`}
            />
            <span>{lang === "tr" ? "Kaçak, Vergi & Rapor" : "Leaks, Tax & Audit"}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Clean SVG Language Switcher */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
            <Globe className="ml-2 mr-1 h-3.5 w-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => setAppLang("en")}
              className={`rounded-md px-2 py-1 transition cursor-pointer ${
                lang === "en" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setAppLang("tr")}
              className={`rounded-md px-2 py-1 transition cursor-pointer ${
                lang === "tr" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              TR
            </button>
          </div>

          {accountTier.isLoggedIn ? (
            <button
              type="button"
              onClick={() => setShowAccountModal(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                accountTier.isPaid
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">
                {storedProfile?.customerName || storedProfile?.customerEmail || "Account"}
              </span>
              <span className="opacity-75">&middot; {accountTier.isPaid ? "Pro" : "Free"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("login");
                  setAuthError(null);
                  setUpgradeReason("");
                  setShowAuthModal(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-100 cursor-pointer"
              >
                <KeyRound className="h-3 w-3 text-slate-500" />
                {lang === "tr" ? "Giriş" : "Log In"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("signup");
                  setAuthError(null);
                  setUpgradeReason("");
                  setShowAuthModal(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 cursor-pointer"
              >
                <User className="h-3 w-3" />
                {lang === "tr" ? "Ücretsiz Başla" : "Sign Up Free"}
              </button>
            </div>
          )}
        </div>
      </div>

      {contextBankName && (
        <div className="border-b border-slate-200 bg-blue-50/70 px-4 py-1.5 text-xs font-medium text-blue-900 sm:px-6">
          {lang === "tr" ? "Aktif Banka Profili:" : "Active Bank Profile:"}{" "}
          <strong>{contextBankName}</strong>
        </div>
      )}

      {/* =========================================================================
          MODULE 2: LIVE MARKET & POSITION RISK TERMINAL
         ========================================================================= */}
      {activeSuiteModule === "market" && <MarketRiskTerminal lang={lang} />}

      {/* =========================================================================
          MODULE 1: PDF STATEMENT CONVERTER (Focused, Clean, Zero Clutter)
         ========================================================================= */}
      {activeSuiteModule === "converter" && (
        <>
          {/* Clean Statement Action & Preset Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                {isParsing
                  ? parseStatusText
                  : lang === "tr"
                    ? "PDF Yükle (Dijital / OCR)"
                    : "Upload PDF (Digital / OCR)"}
              </button>

              <button
                type="button"
                onClick={() => setViewMode(viewMode === "results" ? "upload" : "results")}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              >
                {viewMode === "upload" && <ArrowLeft className="h-3.5 w-3.5" />}
                {viewMode === "results"
                  ? lang === "tr"
                    ? "Yükleme Ekranı"
                    : "Dropzone"
                  : lang === "tr"
                    ? "Tabloya Dön"
                    : "Back to Table"}
              </button>
            </div>

            {/* Clean Bank Presets (Zero Emojis) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">
                {lang === "tr" ? "Canlı Örnek:" : "Sample:"}
              </span>
              {(Object.keys(BANK_PRESETS) as SamplePresetId[]).map((id) => {
                const p = BANK_PRESETS[id];
                const isActivePreset =
                  result.isSample && activePreset === id && viewMode === "results";
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleLoadSample(id)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                      isActivePreset
                        ? "border border-blue-600 bg-blue-50 text-blue-700"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {id === "garanti"
                      ? "Garanti TRY"
                      : `${p.bankName.split(" ")[0]} ${p.currency}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STAGE 1: DROPZONE / HISTORY */}
          {viewMode === "upload" && (
            <div className="p-6 sm:p-12">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`mx-auto flex max-w-2xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
                  isDragging
                    ? "border-blue-600 bg-blue-50/90"
                    : "border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <Upload className="h-5 w-5" />
                </div>

                <h2 className="mt-4 text-lg font-bold text-slate-900 sm:text-xl">
                  {isParsing
                    ? parseStatusText
                    : lang === "tr"
                      ? "Banka PDF Ekstreni Buraya Bırak"
                      : "Drop your PDF bank statement here"}
                </h2>

                <p className="mt-2 max-w-md text-xs text-slate-500">
                  {lang === "tr"
                    ? "Garanti BBVA, Chase, Wise, Mercury, Revolut ve 60+ banka desteklenir. Taranmış veya şifreli PDF'ler cihazınızda çözülür."
                    : "Supports Chase, Wise, Mercury, Revolut, Garanti BBVA & 60+ banks. Scanned OCR & encrypted PDFs run strictly on your device."}
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    {lang === "tr" ? "PDF Dosyası Seç" : "Select PDF Statement"}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPasteModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-slate-500" />
                    {lang === "tr" ? "OCR / Metin Yapıştır" : "Paste OCR Text"}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSamplePdf();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    {lang === "tr" ? "Örnek PDF İndir" : "Sample PDF"}
                  </button>
                </div>
              </div>

              {savedHistory.length > 0 && (
                <div className="mx-auto mt-8 max-w-2xl">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    <span>
                      {lang === "tr"
                        ? "Son Dönüştürülen Ekstreler (Yerel)"
                        : "Recent Statements (Saved Locally)"}
                    </span>
                  </div>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {savedHistory.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleRestoreHistory(item)}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs transition hover:border-blue-400 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {item.result.metadata.fileName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {item.result.transactions.length} rows &middot;{" "}
                            {item.result.metadata.currency}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold text-blue-600">
                          {lang === "tr" ? "Aç →" : "Open →"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STAGE 2: CLEAN CONVERTER & RECONCILIATION WORKSPACE */}
          {viewMode === "results" && (
            <>
              <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-lg font-bold text-slate-900 truncate">
                        {metadata.bankDetected}
                      </h2>
                      {reconciliation.isFullyReconciled ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {lang === "tr"
                            ? "Bakiye Doğrulandı (0.00 Fark)"
                            : "Balance Verified (0.00 diff)"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {lang === "tr" ? "Kontrol Gerekli" : "Review Needed"} (
                          {reconciliation.mismatchRows} &middot;{" "}
                          {formatMoney(reconciliation.discrepancy, metadata.currency)})
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500">
                      <span className="mono-nums font-medium text-slate-700">
                        {lang === "tr" ? "Hesap" : "Acct"} ****{metadata.accountLast4}
                      </span>{" "}
                      &middot; {metadata.currency} &middot; {metadata.periodStart ?? "—"} &rarr;{" "}
                      {metadata.periodEnd ?? "—"} &middot; {result.transactions.length}{" "}
                      {lang === "tr" ? "satır" : "rows"}
                    </p>
                  </div>

                  {/* Clean Export Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleExport("xlsx")}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      {lang === "tr" ? "Excel İndir (.xlsx)" : "Download Excel (.xlsx)"}
                      {freeExcelAvailable ? (
                        <span className="rounded bg-emerald-400/95 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                          {lang === "tr" ? "İlk Ücretsiz" : "1st Free"}
                        </span>
                      ) : (
                        !result.isSample &&
                        !accountTier.isPaid && <Lock className="h-3 w-3 opacity-85" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExport("qbo")}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      QuickBooks (.QBO)
                      {!result.isSample && !accountTier.isPaid && (
                        <Lock className="h-3 w-3 opacity-85" />
                      )}
                    </button>

                    <div className="inline-flex items-center rounded-xl border border-slate-300 bg-white p-0.5 shadow-2xs">
                      <select
                        value={secondaryFormat}
                        onChange={(e) =>
                          setSecondaryFormat(e.target.value as WorkbenchExportChoice)
                        }
                        aria-label="Additional export format"
                        className="bg-transparent px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
                      >
                        <option value="quickbooks_csv">QB CSV (4-Col)</option>
                        <option value="quickbooks_3col_csv">QB CSV (3-Col)</option>
                        <option value="xero_csv">Xero CSV</option>
                        <option value="csv">Standard CSV</option>
                        <option value="ofx">OFX (.ofx)</option>
                        <option value="audit_pdf">CPA Audit PDF</option>
                        <option value="json">JSON</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleExport(secondaryFormat)}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-200 cursor-pointer"
                      >
                        {lang === "tr" ? "İndir" : "Download"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4 Clean Reconciliation KPI Cards */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {lang === "tr" ? "Açılış Bakiyesi" : "Opening Balance"}
                    </span>
                    <span className="mono-nums mt-0.5 block text-sm font-bold text-slate-900 sm:text-base">
                      {formatMoney(reconciliation.openingBalance, metadata.currency)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {lang === "tr" ? "+ Toplam Giriş" : "+ Total Deposits"}
                    </span>
                    <span className="mono-nums mt-0.5 block text-sm font-bold text-emerald-700 sm:text-base">
                      +{formatMoney(reconciliation.totalCredits, metadata.currency)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {lang === "tr" ? "− Toplam Çıkış" : "− Total Withdrawals"}
                    </span>
                    <span className="mono-nums mt-0.5 block text-sm font-bold text-slate-900 sm:text-base">
                      -{formatMoney(reconciliation.totalDebits, metadata.currency)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {lang === "tr" ? "= Kapanış Bakiyesi" : "= Closing Balance"}
                    </span>
                    <span
                      className={`mono-nums mt-0.5 block text-sm font-bold sm:text-base ${
                        reconciliation.isFullyReconciled ? "text-slate-900" : "text-amber-700"
                      }`}
                    >
                      {formatMoney(
                        reconciliation.closingBalance ??
                          reconciliation.calculatedClosingBalance,
                        metadata.currency
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Search + Split View + Edit Tools Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 px-4 py-2.5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search merchant or date..."
                  className="w-52 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter transactions by category"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">All Categories ({result.transactions.length})</option>
                {Array.from(categoryCounts.entries()).map(([cat, count]) => (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                ))}
              </select>

              {reconciliation.duplicateRows > 0 && (
                <button
                  type="button"
                  onClick={handleRemoveDuplicates}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove {reconciliation.duplicateRows} Duplicates
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activePdfBytes && (
                <button
                  type="button"
                  onClick={() => setShowPdfSplitView((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition ${
                    showPdfSplitView
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Columns2 className="h-3.5 w-3.5" />
                  Split View: PDF + Table
                </button>
              )}

              <button
                type="button"
                onClick={() => handleExport("audit_pdf")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-blue-300 hover:text-blue-600"
              >
                <FileCheck2 className="h-3.5 w-3.5 text-blue-600" />
                CPA Audit PDF
                {!result.isSample && !accountTier.isPaid && (
                  <Lock className="h-3 w-3 opacity-60" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowAdvancedTools((prev) => !prev)}
                aria-expanded={showAdvancedTools}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition ${
                  showAdvancedTools
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Edit &amp; Advanced Tools
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${
                    showAdvancedTools ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Progressive Disclosure Drawer: Balance Settings + Custom Auto-Rules + Row Tools */}
          {showAdvancedTools && (
            <div className="space-y-4 border-b border-slate-200 bg-slate-50/90 px-4 py-4 sm:px-6">
              {/* Row 1: Balance & QBO Settings */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div>
                  <label
                    htmlFor="opening-balance-input"
                    className="block text-[11px] font-medium text-slate-600"
                  >
                    Opening Balance
                  </label>
                  <input
                    id="opening-balance-input"
                    type="number"
                    step="0.01"
                    value={explicitOpening ?? ""}
                    placeholder={
                      reconciliation.openingBalance !== null
                        ? reconciliation.openingBalance.toFixed(2)
                        : "Auto / Enter"
                    }
                    onChange={(e) => handleExplicitBalanceChange("opening", e.target.value)}
                    className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="closing-balance-input"
                    className="block text-[11px] font-medium text-slate-600"
                  >
                    Statement Closing
                  </label>
                  <input
                    id="closing-balance-input"
                    type="number"
                    step="0.01"
                    value={explicitClosing ?? ""}
                    placeholder={
                      reconciliation.closingBalance !== null
                        ? reconciliation.closingBalance.toFixed(2)
                        : "Auto / Enter"
                    }
                    onChange={(e) => handleExplicitBalanceChange("closing", e.target.value)}
                    className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="qbo-account-type"
                    className="block text-[11px] font-medium text-slate-600"
                  >
                    QuickBooks Type
                  </label>
                  <select
                    id="qbo-account-type"
                    value={metadata.accountType}
                    onChange={(e) =>
                      handleAccountTypeChange(e.target.value as AccountType)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="CHECKING">Checking (.qbo)</option>
                    <option value="SAVINGS">Savings (.qbo)</option>
                    <option value="CREDITCARD">Credit Card (.qbo)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="statement-currency"
                    className="block text-[11px] font-medium text-slate-600"
                  >
                    Currency
                  </label>
                  <select
                    id="statement-currency"
                    value={metadata.currency}
                    onChange={(e) => handleMetadataField("currency", e.target.value)}
                    className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="TRY">TRY</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="account-last4"
                    className="block text-[11px] font-medium text-slate-600"
                  >
                    Account Last 4
                  </label>
                  <input
                    id="account-last4"
                    type="text"
                    maxLength={4}
                    value={metadata.accountLast4}
                    onChange={(e) => handleMetadataField("accountLast4", e.target.value)}
                    className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={handleInvertAllSigns}
                    title="Invert all Debit/Credit signs"
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
                    Flip +/-
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Row
                  </button>
                </div>
              </div>

              {/* Row 2: Custom Auto-Categorization Rules */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Tag className="h-3.5 w-3.5 text-blue-600" />
                    <span>Auto-Category Keyword Rules ({customRules.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCustomRules}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Check className="h-3 w-3" />
                    Apply Rules Now
                  </button>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {customRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs"
                    >
                      <span className="mono-nums font-semibold text-slate-900">
                        &ldquo;{rule.keyword}&rdquo;
                      </span>
                      <span className="text-slate-400">&rarr;</span>
                      <span className="font-medium text-blue-700">{rule.category}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomRule(rule.id)}
                        className="ml-0.5 rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleAddCustomRule}
                  className="mt-2.5 flex flex-wrap items-center gap-2"
                >
                  <input
                    type="text"
                    value={newRuleKeyword}
                    onChange={(e) => setNewRuleKeyword(e.target.value)}
                    placeholder="Keyword (e.g. VERCEL, UBER)..."
                    className="w-48 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value as CategoryName)}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    + Add Rule
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Warnings if any */}
          {result.warnings.length > 0 && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 sm:px-6">
              {result.warnings.join(" ")}
            </div>
          )}

          {/* Side-by-Side Live PDF Split Viewer + Extracted Ledger Table */}
          <div
            className={
              showPdfSplitView && activePdfBytes
                ? "grid lg:grid-cols-12"
                : "block"
            }
          >
            {showPdfSplitView && activePdfBytes && (
              <div className="border-b border-slate-200 lg:col-span-5 lg:border-b-0 lg:border-r">
                <PdfPagePreview
                  pdfBytes={activePdfBytes}
                  pdfPassword={activePdfPassword}
                  activePage={previewPage}
                  onPageChange={setPreviewPage}
                />
              </div>
            )}

            <div
              className={`${
                showPdfSplitView && activePdfBytes ? "lg:col-span-7" : "w-full"
              } max-h-[540px] overflow-auto bg-white`}
            >
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5">Description</th>
                    <th className="px-3.5 py-2.5">Category</th>
                    <th className="px-3.5 py-2.5 text-right">Amount ({metadata.currency})</th>
                    <th className="px-3.5 py-2.5 text-right">Balance</th>
                    <th className="px-3.5 py-2.5 text-center">Audit</th>
                    <th className="px-3.5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => {
                        if (row.page && row.page !== previewPage) {
                          setPreviewPage(row.page);
                        }
                      }}
                      className={`transition hover:bg-blue-50/40 ${
                        row.balanceStatus === "mismatch" ? "bg-amber-50/60" : ""
                      }`}
                    >
                      <td className="px-3.5 py-2 align-top">
                        <input
                          type="text"
                          value={row.date}
                          onChange={(e) => handleCellChange(row.id, "date", e.target.value)}
                          aria-label="Transaction date"
                          className="mono-nums w-24 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="min-w-[220px] px-3.5 py-2 align-top">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            handleCellChange(row.id, "description", e.target.value)
                          }
                          aria-label="Transaction description"
                          className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-3.5 py-2 align-top">
                        <select
                          value={row.category}
                          onChange={(e) =>
                            handleCellChange(row.id, "category", e.target.value)
                          }
                          aria-label="Transaction category"
                          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3.5 py-2 text-right align-top">
                        <input
                          type="number"
                          step="0.01"
                          value={row.amount}
                          onChange={(e) => handleCellChange(row.id, "amount", e.target.value)}
                          aria-label="Transaction amount"
                          className={`mono-nums w-24 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-right font-semibold focus:border-blue-500 focus:bg-white focus:outline-none ${
                            row.amount >= 0 ? "text-emerald-700" : "text-slate-900"
                          }`}
                        />
                      </td>
                      <td className="px-3.5 py-2 text-right align-top">
                        <input
                          type="number"
                          step="0.01"
                          value={row.balance ?? ""}
                          onChange={(e) => handleCellChange(row.id, "balance", e.target.value)}
                          aria-label="Running balance"
                          className="mono-nums w-24 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-right text-slate-600 focus:border-blue-500 focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-3.5 py-2 text-center align-top">
                        <div className="inline-flex items-center gap-1">
                          {row.balanceStatus === "matched" ? (
                            <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Matched
                            </span>
                          ) : row.balanceStatus === "mismatch" ? (
                            <span className="inline-flex items-center rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              Diff
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2 text-right align-top">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title="Flip Debit / Credit Sign"
                            onClick={() => handleFlipSign(row.id)}
                            className="rounded border border-slate-200 p-1 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            title="Delete row"
                            onClick={() => handleDeleteRow(row.id)}
                            className="rounded border border-slate-200 p-1 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                        No matching transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tier & Account Status Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:px-6">
            <div>
              {result.isSample ? (
                <span className="font-medium text-emerald-700">
                  {lang === "tr"
                    ? "Örnek modu: Kendi ekstreni yüklemeden önce tüm 8 formatı ücretsiz test edebilirsin."
                    : "Interactive sample mode: Test all 8 export formats free before uploading your own statement."}
                </span>
              ) : accountTier.isPaid ? (
                <span className="font-medium text-emerald-700">
                  {accountTier.planName}: Unlimited rows, batch PDF merge &amp; all formats unlocked.
                </span>
              ) : freeExcelAvailable ? (
                <span className="font-medium text-emerald-700">
                  {lang === "tr"
                    ? "İlk Dosya Hediyesi: 100 satıra kadar ilk yüklenen ekstreni Excel (.xlsx) olarak ücretsiz indir."
                    : "1st Full Uploaded Statement Gift: Download Excel (.xlsx) free right above (up to 100 rows)."}
                </span>
              ) : accountTier.isLoggedIn ? (
                <span className="text-slate-600">
                  Free Account: Up to {FREE_ROW_LIMIT} CSV rows unlocked &middot;{" "}
                  <a
                    href={passCheckoutHref}
                    className="font-semibold text-blue-600 underline underline-offset-2"
                  >
                    Upgrade to 7-Day Pass ($12)
                  </a>{" "}
                  for Unlimited rows &amp; .XLSX / .QBO
                </span>
              ) : (
                <span className="text-slate-600">
                  Guest limit: {ANONYMOUS_ROW_LIMIT} CSV rows &middot;{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("signup");
                      setShowAuthModal(true);
                    }}
                    className="font-semibold text-blue-600 underline underline-offset-2"
                  >
                    Sign Up Free for {FREE_ROW_LIMIT} rows + saved history
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              Quick CSV
            </button>
          </div>
            </>
          )}
        </>
      )}

      {/* =========================================================================
          MODULE 3: LEAK, TAX & CLIENT AUDIT STUDIO (Clean, Focused Workspace)
         ========================================================================= */}
      {activeSuiteModule === "audit" && (
        <div className="bg-white">
          {/* Studio Top Sub-Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                {lang === "tr"
                  ? "Para Kaçağı, Vergi Kalkanı & Müşteri Denetim Stüdyosu"
                  : "Spend Leak, Tax Shield & Client Audit Studio"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {metadata.bankDetected} &middot; {lang === "tr" ? "Hesap" : "Acct"} ****
                {metadata.accountLast4} &middot; {result.transactions.length}{" "}
                {lang === "tr" ? "işlem" : "transactions"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAuditSummary}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50 cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5 text-blue-600" />
                {lang === "tr" ? "Denetim Özetini Kopyala" : "Copy Client Audit Summary"}
              </button>

              <button
                type="button"
                onClick={() => handleExport("audit_pdf")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer"
              >
                <FileCheck2 className="h-3.5 w-3.5 text-emerald-400" />
                {lang === "tr" ? "CPA Denetim Sertifikası (.pdf)" : "CPA Audit Certificate (.pdf)"}
                {!result.isSample && !accountTier.isPaid && (
                  <Lock className="h-3 w-3 opacity-80" />
                )}
              </button>
            </div>
          </div>

          {/* 3 Clean Summary Cards */}
          <div className="grid gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-4 sm:grid-cols-3 sm:px-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-600">
                {lang === "tr" ? "Yıllık Para Kaçağı Yükü" : "Annual Recurring Drains"}
              </span>
              <span className="mono-nums mt-1 block text-xl font-extrabold text-slate-900">
                {formatMoney(forensics.totalDetectedLeaksAnnual, metadata.currency)}
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                {forensics.leaks.length}{" "}
                {lang === "tr" ? "abonelik / banka kesintisi" : "subscriptions & fees"}
              </span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                {lang === "tr" ? "5 Yıllık Kurtarma (@ %12)" : "5-Yr Wealth Recovery (@ 12%)"}
              </span>
              <span className="mono-nums mt-1 block text-xl font-extrabold text-emerald-900">
                +{formatMoney(forensics.savedFiveYearCompounded, metadata.currency)}
              </span>
              <span className="mt-0.5 block text-[11px] text-emerald-700">
                {lang === "tr"
                  ? `Kesinti sonrası yıllık ${formatMoney(forensics.savedAnnualTotal, metadata.currency)}`
                  : `${formatMoney(forensics.savedAnnualTotal, metadata.currency)}/yr cash retained`}
              </span>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                {lang === "tr" ? "Vergi & KDV Kalkanı" : "Claimable Tax & VAT Shield"}
              </span>
              <span className="mono-nums mt-1 block text-xl font-extrabold text-indigo-950">
                +{formatMoney(forensics.totalTaxCashback, metadata.currency)}
              </span>
              <span className="mt-0.5 block text-[11px] text-indigo-700">
                %{taxBracketPct} {lang === "tr" ? "vergi dilimi" : "tax bracket"}
                {includeVat ? " + %20 KDV/VAT" : ""}
              </span>
            </div>
          </div>

          {/* Audit Sub-Navigation */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
            <button
              type="button"
              onClick={() => setAuditSubTab("leaks")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                auditSubTab === "leaks"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {lang === "tr"
                ? `Abonelik & İade Dilekçeleri (${forensics.leaks.length})`
                : `Money Leaks & Legal Notices (${forensics.leaks.length})`}
            </button>

            <button
              type="button"
              onClick={() => setAuditSubTab("tax")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                auditSubTab === "tax"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {lang === "tr"
                ? `Vergi & KDV Kalkanı (${forensics.taxItems.length})`
                : `Tax & VAT Shield (${forensics.taxItems.length})`}
            </button>

            <button
              type="button"
              onClick={() => setAuditSubTab("cashflow")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                auditSubTab === "cashflow"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {lang === "tr" ? "Kategori Dağılımı & Skor" : "Cashflow & Score"}
            </button>
          </div>

          {/* Audit Sub-Tab 1: Leaks & Legal Notices */}
          {auditSubTab === "leaks" && (
            <div className="space-y-4 p-4 sm:p-6">
              {forensics.leaks.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                  <div className="text-xs text-slate-800">
                    <span className="font-bold">
                      {cutLeakIds.length > 0
                        ? lang === "tr"
                          ? `${cutLeakIds.length} kesinti seçili`
                          : `${cutLeakIds.length} cuts selected`
                        : lang === "tr"
                          ? "Tüm abonelik & banka kesintileri simülasyonu"
                          : "Projected recovery across recurring leaks"}
                    </span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="mono-nums font-bold text-emerald-800">
                      {formatMoney(forensics.savedMonthlyTotal, metadata.currency)}/mo &rarr;{" "}
                      +{formatMoney(forensics.savedFiveYearCompounded, metadata.currency)} (5 yr @ 12%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCutLeakIds(
                          forensics.leaks
                            .filter(
                              (l) =>
                                l.leakType === "subscription" || l.leakType === "bank_fee"
                            )
                            .map((l) => l.id)
                        )
                      }
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                    >
                      {lang === "tr" ? "Abonelikleri Kes" : "Cut Subs & Fees"}
                    </button>
                    {cutLeakIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCutLeakIds([])}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        {lang === "tr" ? "Sıfırla" : "Reset"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {forensics.leaks.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
                  {lang === "tr"
                    ? "Bu ekstrede tekrarlayan abonelik veya banka masrafı tespit edilmedi."
                    : "No recurring subscriptions or hidden bank fees detected in this statement."}
                </div>
              ) : (
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
                  {forensics.leaks.map((leak) => {
                    const isCut = cutLeakIds.includes(leak.id);
                    return (
                      <div
                        key={leak.id}
                        className={`flex flex-col justify-between gap-3 p-4 transition lg:flex-row lg:items-center ${
                          isCut ? "bg-emerald-50/40" : "bg-white hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                leak.leakType === "bank_fee"
                                  ? "bg-rose-100 text-rose-800"
                                  : leak.leakType === "subscription"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {leak.leakType === "bank_fee"
                                ? lang === "tr"
                                  ? "Banka Masrafı"
                                  : "Bank Fee"
                                : leak.leakType === "subscription"
                                  ? lang === "tr"
                                    ? "Abonelik"
                                    : "Subscription"
                                  : lang === "tr"
                                    ? "Yüksek Yakım"
                                    : "High Burn"}
                            </span>
                            <span className="mono-nums text-xs text-slate-500">{leak.date}</span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {leak.category}
                            </span>
                          </div>
                          <p className="mt-1 font-bold text-slate-900 truncate">
                            {leak.merchant}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {lang === "tr" ? leak.reasonTr : leak.reasonEn}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-5 shrink-0">
                          <div className="text-right">
                            <span className="block text-[10px] font-semibold uppercase text-slate-400">
                              {lang === "tr" ? "Aylık" : "Monthly"}
                            </span>
                            <span className="mono-nums text-sm font-bold text-slate-900">
                              {formatMoney(leak.monthlyAmount, metadata.currency)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] font-semibold uppercase text-rose-500">
                              {lang === "tr" ? "5 Yıl (@%12)" : "5-Yr Cost"}
                            </span>
                            <span className="mono-nums text-sm font-bold text-emerald-700">
                              {formatMoney(leak.fiveYearCompoundedCost, metadata.currency)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleCutLeak(leak.id)}
                              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                isCut
                                  ? "bg-emerald-600 text-white"
                                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {isCut && <Check className="h-3.5 w-3.5" />}
                              {isCut
                                ? lang === "tr"
                                  ? "Kesildi"
                                  : "Cut"
                                : lang === "tr"
                                  ? "Gideri Kes"
                                  : "Cut"}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveNoticeItem(leak);
                                setCopiedNotice(false);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                            >
                              <Scale className="h-3.5 w-3.5 text-amber-300" />
                              {lang === "tr" ? "Dilekçe Üret" : "Legal Notice"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Audit Sub-Tab 2: Tax & VAT Shield */}
          {auditSubTab === "tax" && (
            <div className="space-y-4 p-4 sm:p-6">
              <div className="grid gap-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 sm:grid-cols-2 sm:items-center">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>
                      {lang === "tr"
                        ? `Vergi Dilimin: %${taxBracketPct}`
                        : `Tax Bracket: ${taxBracketPct}%`}
                    </span>
                    <span className="mono-nums text-indigo-700">%{taxBracketPct}</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={45}
                    step={1}
                    value={taxBracketPct}
                    onChange={(e) => setTaxBracketPct(Number(e.target.value))}
                    aria-label="Tax bracket percentage"
                    className="mt-2 w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={includeVat}
                      onChange={(e) => setIncludeVat(e.target.checked)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <span>
                      {lang === "tr" ? "KDV (%20) İndirimi Dahil" : "Include 20% VAT Recovery"}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleExport("xlsx")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Excel (.xlsx)
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-3.5 py-2.5">{lang === "tr" ? "Tarih" : "Date"}</th>
                      <th className="px-3.5 py-2.5">{lang === "tr" ? "Harcama" : "Expense"}</th>
                      <th className="px-3.5 py-2.5">{lang === "tr" ? "Mevzuat" : "Legal Rule"}</th>
                      <th className="px-3.5 py-2.5 text-right">{lang === "tr" ? "Tutar" : "Spend"}</th>
                      <th className="px-3.5 py-2.5 text-right">{lang === "tr" ? "Kalkan" : "Tax Shield"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {forensics.taxItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="mono-nums px-3.5 py-2.5 text-slate-600">{item.date}</td>
                        <td className="px-3.5 py-2.5">
                          <p className="font-semibold text-slate-900">{item.merchant}</p>
                          <span className="text-[10px] text-slate-500">
                            {item.category} &middot; %{item.deductibleSharePct}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">
                          {lang === "tr" ? item.lawRefTr : item.lawRefEn}
                        </td>
                        <td className="mono-nums px-3.5 py-2.5 text-right font-medium text-slate-800">
                          {formatMoney(item.grossSpend, metadata.currency)}
                        </td>
                        <td className="mono-nums px-3.5 py-2.5 text-right font-bold text-emerald-700">
                          +{formatMoney(item.totalTaxShield, metadata.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Sub-Tab 3: Cashflow & Category X-Ray */}
          {auditSubTab === "cashflow" && (
            <div className="space-y-4 p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900">
                    {lang === "tr" ? "Finansal Sağlık Skoru:" : "Financial Health Score:"}{" "}
                    {forensics.healthScore}/100
                  </span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-slate-600">
                    {lang === "tr" ? "Net Tasarruf Marjı:" : "Net Savings Rate:"}{" "}
                    <strong className="text-slate-900">{forensics.savingsRatePct}%</strong>
                  </span>
                </div>
                <span className="mono-nums font-bold text-emerald-700">
                  +{formatMoney(reconciliation.totalCredits, metadata.currency)} / -
                  {formatMoney(reconciliation.totalDebits, metadata.currency)}
                </span>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                {forensics.categoryBreakdown.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {cat.category}{" "}
                        <span className="font-normal text-slate-500">
                          ({cat.txCount} {lang === "tr" ? "işlem" : "txns"})
                        </span>
                      </span>
                      <span className="mono-nums font-bold text-slate-900">
                        {formatMoney(cat.totalOutflow, metadata.currency)} ({cat.sharePct}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${Math.max(4, Math.min(100, cat.sharePct))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          AUTH & UPGRADE MODAL (Sign Up Free / Log In / License Key + Checkout)
         ========================================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {authTab === "signup"
                    ? "Create Your Free VaultSheet Account"
                    : authTab === "login"
                      ? "Log In to VaultSheet"
                      : "Activate Pro License Key"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {upgradeReason && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {upgradeReason}
              </p>
            )}

            {/* 3-Tab Switcher */}
            <div className="mt-4 grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("signup");
                  setAuthError(null);
                }}
                className={`rounded-lg py-1.5 transition ${
                  authTab === "signup"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign Up Free
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("login");
                  setAuthError(null);
                }}
                className={`rounded-lg py-1.5 transition ${
                  authTab === "login"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("key");
                  setAuthError(null);
                }}
                className={`rounded-lg py-1.5 transition ${
                  authTab === "key"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                License Key
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3">
              {authTab === "signup" && (
                <>
                  <p className="text-xs text-slate-600">
                    Unlock <strong>{FREE_ROW_LIMIT} free rows/PDF</strong>, saved statement
                    history, and seamless Pro upgrades.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </>
              )}

              {(authTab === "signup" || authTab === "login") && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Password (min. 6 characters)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </>
              )}

              {authTab === "key" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Polar Checkout Email OR VS- License Key
                  </label>
                  <input
                    type="text"
                    value={licenseKeyInput}
                    onChange={(e) => {
                      setLicenseKeyDraft(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="you@example.com or VS-XXXX-XXXX-XXXX"
                    className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {authError && <p className="text-xs font-medium text-rose-600">{authError}</p>}

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isSubmittingAuth
                  ? "Verifying..."
                  : authTab === "signup"
                    ? "Create Free Account"
                    : authTab === "login"
                      ? "Log In"
                      : "Verify & Activate"}
              </button>
            </form>

            {/* Test Sample Export or Direct Paid Passes */}
            {!result.isSample && result.transactions.length > 0 && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-medium text-slate-700">
                  Or download your first {Math.min(accountTier.rowLimit, result.transactions.length)}{" "}
                  rows free right now to test QuickBooks/CSV import:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleExport("qbo", true)}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Free .QBO Test
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("csv", true)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Free .CSV Test
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Or Unlock Unlimited Pro Exports Immediately
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={passCheckoutHref}
                  onClick={() => {
                    if (passCheckoutHref === "#pricing") setShowAuthModal(false);
                  }}
                  className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-400 hover:bg-blue-50/40"
                >
                  <span className="text-xs font-semibold text-slate-700">7-Day Pass</span>
                  <span className="mono-nums mt-0.5 text-lg font-bold text-slate-900">$12</span>
                  <span className="text-[10px] text-slate-500">One-time &middot; Unlimited rows</span>
                </a>
                <a
                  href={proCheckoutHref}
                  onClick={() => {
                    if (proCheckoutHref === "#pricing") setShowAuthModal(false);
                  }}
                  className="flex flex-col rounded-xl border-2 border-blue-600 bg-blue-50/40 p-3 transition hover:bg-blue-50/80"
                >
                  <span className="text-xs font-semibold text-blue-700">Annual Pro</span>
                  <span className="mono-nums mt-0.5 text-lg font-bold text-slate-900">$29/yr</span>
                  <span className="text-[10px] text-slate-600">Full year &middot; No renewal</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MY ACCOUNT DASHBOARD MODAL
         ========================================================================= */}
      {showAccountModal && accountTier.isLoggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    accountTier.isPaid
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {storedProfile?.customerName || "VaultSheet Account"}
                  </h3>
                  <p
                    className={`text-xs font-semibold ${
                      accountTier.isPaid ? "text-emerald-700" : "text-blue-700"
                    }`}
                  >
                    {accountTier.planName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              {storedProfile?.customerEmail && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-semibold text-slate-900">
                    {storedProfile.customerEmail}
                  </span>
                </div>
              )}

              {accountTier.isPaid ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">License Key:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="mono-nums font-semibold text-slate-900">
                        {storedProfile?.displayKey ||
                          (storedLicenseKey
                            ? `VS-****-${storedLicenseKey.slice(-6)}`
                            : "Active")}
                      </span>
                      {(storedProfile?.key || storedLicenseKey) && (
                        <button
                          type="button"
                          onClick={() => {
                            const fullKey = storedProfile?.key || storedLicenseKey;
                            if (typeof navigator !== "undefined" && fullKey) {
                              void navigator.clipboard.writeText(fullKey);
                              setCopiedKey(true);
                              setTimeout(() => setCopiedKey(false), 1800);
                            }
                          }}
                          className="rounded border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100"
                        >
                          {copiedKey ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Valid Until:</span>
                    <span className="mono-nums font-semibold text-slate-900">
                      {formatExpiryShort(storedProfile?.expiresAt)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Export Limit:</span>
                  <span className="font-semibold text-slate-900">
                    Up to {FREE_ROW_LIMIT} CSV rows / PDF
                  </span>
                </div>
              )}
            </div>

            {!accountTier.isPaid && (
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <a
                  href={passCheckoutHref}
                  className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-400"
                >
                  <span className="text-xs font-semibold text-slate-800">Upgrade 7-Day Pass</span>
                  <span className="mono-nums mt-0.5 text-lg font-bold text-slate-900">$12</span>
                  <span className="text-[10px] text-slate-500">Unlimited + .XLSX/.QBO</span>
                </a>
                <a
                  href={proCheckoutHref}
                  className="flex flex-col rounded-xl border-2 border-blue-600 bg-blue-50/40 p-3 transition hover:bg-blue-50"
                >
                  <span className="text-xs font-semibold text-blue-700">Upgrade Annual Pro</span>
                  <span className="mono-nums mt-0.5 text-lg font-bold text-slate-900">$29/yr</span>
                  <span className="text-[10px] text-slate-600">Full year unlimited</span>
                </a>
              </div>
            )}

            {savedHistory.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Recent Saved Statements
                </p>
                <div className="mt-2 space-y-1.5">
                  {savedHistory.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setShowAccountModal(false);
                        handleRestoreHistory(item);
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs hover:border-blue-400"
                    >
                      <span className="truncate font-medium text-slate-800">
                        {item.result.metadata.fileName}
                      </span>
                      <span className="shrink-0 font-semibold text-blue-600">Open</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
              <a
                href={storedProfile?.portalUrl || "https://polar.sh/vaultsheet/portal"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                Billing Portal
              </a>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste Raw Statement / OCR Text Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Paste OCR or Raw Statement Text
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Works on copy-pasted scanned PDF OCR output, online banking tables, or raw CSV text.
              Processed strictly inside local browser memory.
            </p>
            <form onSubmit={handleParsePastedText} className="mt-4">
              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Opening Balance: 1000.00\n10/02/2026  AWS Cloud Services       -145.20    854.80\n10/05/2026  Stripe Payout Settlement  2400.00   3254.80\nClosing Balance: 3254.80`}
                className="mono-nums w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Extract &amp; Reconcile Locally
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unlock Password-Protected PDF Modal */}
      {pendingPasswordFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Password-Protected PDF
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingPasswordFile(null);
                  setPdfPasswordInput("");
                  setPdfPasswordError(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Enter the password to decrypt{" "}
              <strong className="text-slate-800">{pendingPasswordFile.name}</strong> locally in
              browser memory. Your password is never transmitted anywhere.
            </p>
            <form onSubmit={handleUnlockPdfSubmit} className="mt-4 space-y-3">
              <input
                type="password"
                autoFocus
                required
                value={pdfPasswordInput}
                onChange={(e) => setPdfPasswordInput(e.target.value)}
                placeholder="Enter statement PDF password..."
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
              {pdfPasswordError && (
                <p className="text-xs font-medium text-rose-600">{pdfPasswordError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingPasswordFile(null);
                    setPdfPasswordInput("");
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUnlockingPdf}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isUnlockingPdf ? "Unlocking..." : "Unlock & Convert Locally"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formal Legal Cancellation / Bank Fee Refund Notice Modal */}
      {activeNoticeItem && legalNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-amber-300">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{legalNotice.title}</h3>
                  <p className="text-xs text-slate-500">
                    {activeNoticeItem.merchant} &middot;{" "}
                    {formatMoney(activeNoticeItem.monthlyAmount, metadata.currency)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveNoticeItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
              <span className="font-semibold text-slate-500">
                {lang === "tr" ? "Konu / Subject:" : "Subject:"}{" "}
              </span>
              <span className="font-semibold text-slate-900">{legalNotice.subject}</span>
            </div>

            <textarea
              readOnly
              rows={13}
              value={legalNotice.body}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                {lang === "tr"
                  ? "Metin cihazınızda anında üretildi. Köşeli parantez içindeki iletişim bilginizi yazıp gönderin."
                  : "Generated 100% locally. Fill in your contact block and send via email or support ticket."}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const content = `${legalNotice.subject}\n\n${legalNotice.body}`;
                    const stem =
                      activeNoticeItem.merchant
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .slice(0, 32) || "notice";
                    triggerBlobDownload(content, "text/plain;charset=utf-8", `${stem}-dilekce.txt`);
                    showToast(
                      lang === "tr"
                        ? "İhtarname / dilekçe (.txt) indirildi."
                        : "Legal notice (.txt) downloaded."
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {lang === "tr" ? "İndir (.txt)" : "Download .txt"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== "undefined") {
                      void navigator.clipboard.writeText(
                        `${legalNotice.subject}\n\n${legalNotice.body}`
                      );
                      setCopiedNotice(true);
                      setTimeout(() => setCopiedNotice(false), 2000);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  {copiedNotice ? (
                    <>
                      <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" />
                      {lang === "tr" ? "Kopyalandı!" : "Copied!"}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      {lang === "tr" ? "Dilekçeyi Kopyala" : "Copy Notice"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
