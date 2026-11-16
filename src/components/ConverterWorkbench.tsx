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
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
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
  CHECKOUT_URLS,
  FREE_ROW_LIMIT,
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

const LICENSE_CHANGE_EVENT = "vaultsheet-license-changed";
const LICENSE_PROFILE_STORAGE_KEY = "vaultsheet_license_profile_v1";
const CUSTOM_RULES_STORAGE_KEY = "vaultsheet_custom_rules_v1";
const CUSTOM_RULES_CHANGE_EVENT = "vaultsheet-rules-changed";

interface CustomCategoryRule {
  id: string;
  keyword: string;
  category: CategoryName;
}

const DEFAULT_CUSTOM_RULES: CustomCategoryRule[] = [
  { id: "rule-stripe", keyword: "STRIPE", category: "Revenue & Payouts" },
  { id: "rule-aws", keyword: "AWS", category: "SaaS & Cloud" },
  { id: "rule-gusto", keyword: "GUSTO", category: "Payroll & Contractors" },
  { id: "rule-ads", keyword: "GOOGLE ADS", category: "Marketing & Ads" },
];
const DEFAULT_CUSTOM_RULES_JSON = JSON.stringify(DEFAULT_CUSTOM_RULES);

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

function getServerLicenseSnapshot(): string {
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

function formatExpiryShort(iso?: string): string {
  if (!iso) return "Lifetime / No Expiry";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "Active";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
  const [activePreset, setActivePreset] = useState<SamplePresetId>(defaultPreset);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const storedLicenseKey = useSyncExternalStore(
    subscribeLicenseStorage,
    loadStoredLicenseKey,
    getServerLicenseSnapshot
  );
  const rawLicenseProfileJson = useSyncExternalStore(
    subscribeLicenseStorage,
    loadRawLicenseProfileJson,
    getServerLicenseSnapshot
  );
  const rawCustomRulesJson = useSyncExternalStore(
    subscribeRulesStorage,
    loadRawRulesJson,
    getServerRulesSnapshot
  );

  const [licenseKeyDraft, setLicenseKeyDraft] = useState<string | null>(null);
  const [licenseFeedback, setLicenseFeedback] = useState<{
    valid: boolean;
    plan: "free" | "pass_7d" | "pro_monthly";
    message: string;
  } | null>(null);
  const [isVerifyingLicense, setIsVerifyingLicense] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showRulesDrawer, setShowRulesDrawer] = useState(false);
  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState<CategoryName>("SaaS & Cloud");
  const [copiedKey, setCopiedKey] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [secondaryFormat, setSecondaryFormat] = useState<ExportFormat>("quickbooks_csv");
  const [pastedText, setPastedText] = useState("");
  const [upgradeReason, setUpgradeReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoVerifyAttemptedRef = useRef(false);

  const storedProfile = useMemo<StoredLicenseProfile | null>(() => {
    if (!rawLicenseProfileJson) return null;
    try {
      const parsed = JSON.parse(rawLicenseProfileJson) as StoredLicenseProfile;
      if (!parsed || typeof parsed.key !== "string") return null;
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

  const licenseKey = licenseKeyDraft ?? storedLicenseKey;
  const licenseStatus = useMemo(() => {
    if (licenseFeedback && !licenseFeedback.valid) return licenseFeedback;
    if (storedProfile) {
      return {
        valid: true,
        plan: storedProfile.plan,
        message: `${storedProfile.planName} active.`,
      };
    }
    if (storedLicenseKey) return verifyLicenseKey(storedLicenseKey);
    return { valid: false, plan: "free" as const, message: "" };
  }, [licenseFeedback, storedProfile, storedLicenseKey]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || autoVerifyAttemptedRef.current) return;
    const params = new URLSearchParams(window.location.search);
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
            window.history.replaceState({}, "", nextUrl.pathname + nextUrl.search + nextUrl.hash);
            setShowAccountModal(true);
            showToast(data.message || "Your Pro Pass is now active!");
          }
        })
        .catch(() => {
          // Ignore transient network failures
        });
      return;
    }

    // Upgrade any legacy pasted key in localStorage into a live Polar profile automatically
    if (storedLicenseKey && !storedProfile) {
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
          // Offline fallback continues to honor checksum keys
        });
    }
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

  const handleLoadSample = useCallback((presetId: SamplePresetId) => {
    setActivePreset(presetId);
    const parsed = loadSamplePreset(presetId);
    setResult(parsed);
    setExplicitOpening(parsed.reconciliation.openingBalance);
    setExplicitClosing(parsed.reconciliation.closingBalance);
    setCategoryFilter("ALL");
    setSearchQuery("");
  }, []);

  const handleDownloadSamplePdf = useCallback(() => {
    const pdfBytes = generateSampleStatementPdf(activePreset);
    const copy = new Uint8Array(pdfBytes.byteLength);
    copy.set(pdfBytes);
    triggerBlobDownload(
      copy.buffer,
      "application/pdf",
      BANK_PRESETS[activePreset].sampleFileName
    );
    showToast(`Downloaded real PDF (${BANK_PRESETS[activePreset].sampleFileName}) — try dropping it back in.`);
  }, [activePreset, showToast]);

  const applyCustomRulesToRows = useCallback(
    (rows: TransactionRow[]): TransactionRow[] => {
      if (!licenseStatus.valid || customRules.length === 0) return rows;
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
    [licenseStatus.valid, customRules]
  );

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
        showToast("Please drop valid .pdf, .csv, or .txt bank statement files.");
        return;
      }

      setIsParsing(true);
      try {
        const parsedList: ParseResult[] = [];
        for (const f of files) {
          const lower = f.name.toLowerCase();
          if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
            const raw = await f.text();
            parsedList.push(parseRawStatementText(raw, f.name));
          } else {
            parsedList.push(await parsePdfFileInBrowser(f));
          }
        }

        if (parsedList.length === 1) {
          const singleRaw = parsedList[0];
          const categorizedRows = applyCustomRulesToRows(singleRaw.transactions);
          const single = { ...singleRaw, transactions: categorizedRows };
          setResult(single);
          setExplicitOpening(single.reconciliation.openingBalance);
          setExplicitClosing(single.reconciliation.closingBalance);
          showToast(
            `Parsed ${single.transactions.length} transactions locally (${single.metadata.parseMode}).`
          );
        } else {
          // Batch merge sorted chronologically so user sees consolidated table before exporting
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
          setResult({
            metadata: {
              fileName: `${files.length}-statements-merged.pdf`,
              bankDetected: `${first.metadata.bankDetected} (Batch ${files.length} Files)`,
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
          });
          showToast(`Merged ${files.length} files (${transactions.length} rows) locally — preview ready.`);
        }
        setCategoryFilter("ALL");
        setSearchQuery("");
      } finally {
        setIsParsing(false);
      }
    },
    [showToast, applyCustomRulesToRows]
  );

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
        return Number.isFinite(parsed) ? { ...r, balance: fromCents(toCents(parsed)) } : r;
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
    showToast(`Statement QBO type set to ${nextType}.`);
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
    showToast("Inverted Debit/Credit signs across all rows (Credit Card / Statement Flip).");
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
    setExplicitOpening(parsed.reconciliation.openingBalance);
    setExplicitClosing(parsed.reconciliation.closingBalance);
    setCategoryFilter("ALL");
    setSearchQuery("");
    setShowPasteModal(false);
    showToast(`Parsed ${parsed.transactions.length} rows locally from pasted text.`);
  };

  const handleExport = (format: ExportFormat, sampleSliceOnly = false) => {
    if (result.transactions.length === 0) {
      showToast("No transactions loaded to export.");
      return;
    }

    const isProFormat = format === "xlsx" || format === "qbo" || format === "ofx";
    const isMultiFileBatch = result.metadata.fileName.endsWith("-statements-merged.pdf");
    const exceedsFreeRows =
      !result.isSample && result.transactions.length > FREE_ROW_LIMIT;

    if (
      !result.isSample &&
      !licenseStatus.valid &&
      !sampleSliceOnly &&
      (isProFormat || exceedsFreeRows || isMultiFileBatch)
    ) {
      setUpgradeReason(
        isMultiFileBatch
          ? `Multi-statement consolidated batches (${result.transactions.length} rows) require a $12 Pass or Pro license to export cleanly.`
          : exceedsFreeRows
            ? `Uploaded statement has ${result.transactions.length} rows (Free preview caps full downloads at ${FREE_ROW_LIMIT} rows). You can still download a 25-row sample of your file to test QuickBooks/Excel import right now.`
            : `Full accounting exports (.xlsx 3-sheet workbook, .qbo, .ofx) on uploaded files require a $12 7-Day Pass or Pro license — or download a free 25-row sample of your file below to test the import first.`
      );
      setShowUpgradeModal(true);
      return;
    }

    let exportTarget = result;
    let exportFileBase = result.metadata.fileName;
    if (sampleSliceOnly && result.transactions.length > FREE_ROW_LIMIT) {
      const slicedRows = result.transactions.slice(0, FREE_ROW_LIMIT);
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
      exportFileBase = `${result.metadata.fileName.replace(/\.[^.]+$/, "")}-sample25.pdf`;
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

    showToast(
      sampleSliceOnly
        ? `Exported free 25-row test (${downloadName}) locally — verify import quality first.`
        : `Exported ${downloadName} locally — 0 bytes sent to any server.`
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

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = licenseKey.trim();
    if (!trimmed) {
      setLicenseFeedback({
        valid: false,
        plan: "free",
        message: "Enter your checkout email address or VS- license key.",
      });
      return;
    }

    setIsVerifyingLicense(true);
    setLicenseFeedback(null);
    try {
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
        setLicenseFeedback(null);
        setLicenseKeyDraft(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
        }
        setShowUpgradeModal(false);
        setShowAccountModal(true);
        showToast(data.message || "Account verified and activated.");
      } else {
        setLicenseFeedback({
          valid: false,
          plan: "free",
          message: data?.message || "Invalid email or license key.",
        });
      }
    } catch {
      setLicenseFeedback({
        valid: false,
        plan: "free",
        message: "Network error while verifying license. Please try again.",
      });
    } finally {
      setIsVerifyingLicense(false);
    }
  };

  const handleSignOut = () => {
    saveStoredLicenseProfile(null);
    setLicenseKeyDraft("");
    setLicenseFeedback(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
    }
    setShowAccountModal(false);
    showToast("Signed out of VaultSheet Pro on this browser.");
  };

  const handleDownloadAuditPdf = () => {
    if (!result.isSample && !licenseStatus.valid) {
      setUpgradeReason(
        "Downloadable CPA Reconciliation & Audit Certificate PDFs require a $12 7-Day Pass or Annual Pro license (or test it free on any sample preset above)."
      );
      setShowUpgradeModal(true);
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
  };

  const persistCustomRules = (nextRules: CustomCategoryRule[]) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOM_RULES_STORAGE_KEY, JSON.stringify(nextRules));
    window.dispatchEvent(new Event(CUSTOM_RULES_CHANGE_EVENT));
  };

  const handleAddCustomRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!result.isSample && !licenseStatus.valid) {
      setUpgradeReason(
        "Custom Auto-Categorization Rules require a $12 7-Day Pass or Annual Pro license."
      );
      setShowUpgradeModal(true);
      return;
    }
    const kw = newRuleKeyword.trim();
    if (!kw) return;
    const nextRules: CustomCategoryRule[] = [
      ...customRules,
      { id: `rule-${Date.now()}`, keyword: kw.toUpperCase(), category: newRuleCategory },
    ];
    persistCustomRules(nextRules);
    setNewRuleKeyword("");
    showToast(`Saved auto-category rule: "${kw.toUpperCase()}" -> ${newRuleCategory}`);
  };

  const handleDeleteCustomRule = (ruleId: string) => {
    persistCustomRules(customRules.filter((r) => r.id !== ruleId));
  };

  const handleApplyCustomRules = () => {
    if (!result.isSample && !licenseStatus.valid) {
      setUpgradeReason(
        "Applying Custom Auto-Categorization Rules on uploaded statements requires a $12 Pass or Annual Pro license."
      );
      setShowUpgradeModal(true);
      return;
    }
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
        ? `Auto-categorized ${updatedCount} transaction${updatedCount === 1 ? "" : "s"} using your rules.`
        : "All matching transactions already match your category rules."
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

  const { reconciliation, metadata } = result;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.08)]">
      {/* Top Application Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span>Bank Statement Ledger</span>
            {contextBankName && (
              <span className="font-normal text-slate-500">&middot; {contextBankName}</span>
            )}
          </div>
          <span className="hidden h-3.5 w-px bg-slate-300 sm:inline-block" />
          <span className="hidden items-center gap-1.5 text-[11px] font-medium text-slate-500 sm:inline-flex">
            <Lock className="h-3 w-3 text-emerald-600" />
            Local Browser Mode &mdash; Zero Server Uploads
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSamplePdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900"
          >
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            Download Sample PDF
          </button>
          {licenseStatus.valid ? (
            <button
              type="button"
              onClick={() => setShowAccountModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span>
                {licenseStatus.plan === "pass_7d" ? "7-Day Audit Pass" : "Annual Pro"}
              </span>
              {(storedProfile?.customerEmail || storedProfile?.displayKey) && (
                <span className="hidden font-normal text-emerald-700 sm:inline">
                  &middot; {storedProfile.customerEmail || storedProfile.displayKey}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-75" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setUpgradeReason("");
                setShowUpgradeModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-blue-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <KeyRound className="h-3.5 w-3.5 text-blue-600" />
              Sign In / License Key
            </button>
          )}
        </div>
      </div>

      {/* Streamlined Upload Dropzone & Sample Preset Switcher */}
      <div className="border-b border-slate-200 bg-white p-4 sm:p-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) {
              void handleFiles(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-start justify-between gap-4 rounded-xl border-2 border-dashed p-5 transition sm:flex-row sm:items-center ${
            isDragging
              ? "border-blue-500 bg-blue-50/80"
              : "border-blue-200 bg-blue-50/30 hover:border-blue-400 hover:bg-blue-50/55"
          }`}
        >
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

          <div className="flex items-start gap-4 sm:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 sm:text-base">
                {isParsing
                  ? "Reading your statement securely inside browser RAM..."
                  : "Drop your PDF bank statement here, or click to browse"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Supports single or multi-page PDFs from Chase, Wells Fargo, BofA, Wise, Mercury, Revolut &amp; 60+ banks
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800"
            >
              <Upload className="h-3.5 w-3.5" />
              Choose PDF File
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPasteModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              Paste Scanned / OCR Text
            </button>
          </div>
        </div>

        {/* Horizontal Instant Demo Preset Switcher */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
          <span className="text-xs font-medium text-slate-500">
            Instant live demo preset (unlimited free test exports):
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(BANK_PRESETS) as SamplePresetId[]).map((id) => {
              const p = BANK_PRESETS[id];
              const active = result.isSample && activePreset === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleLoadSample(id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                    active
                      ? "bg-slate-900 font-semibold text-white shadow-2xs"
                      : "bg-slate-100 font-medium text-slate-700 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  <span>{p.label}</span>
                  <span
                    className={`mono-nums text-[10px] ${
                      active ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {p.currency}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reconciliation Summary, Export Controls & 4 Financial KPI Cards */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900 truncate">
                {metadata.bankDetected}
              </h2>
              {reconciliation.isFullyReconciled ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Reconciled ($0.00 diff &middot; {reconciliation.matchedRows}/{result.transactions.length})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Review Needed ({reconciliation.mismatchRows} mismatch &middot;{" "}
                  {formatMoney(reconciliation.discrepancy, metadata.currency)})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="mono-nums font-medium text-slate-700">
                Acct ****{metadata.accountLast4}
              </span>
              <span>&middot;</span>
              <span className="mono-nums font-medium text-slate-700">{metadata.currency}</span>
              <span>&middot;</span>
              <span className="mono-nums">
                {metadata.periodStart ?? "—"} to {metadata.periodEnd ?? "—"}
              </span>
              <span>&middot;</span>
              <span>{result.transactions.length} transactions</span>
              {reconciliation.stitchedLineCount > 0 && (
                <>
                  <span>&middot;</span>
                  <span className="text-blue-700 font-medium">
                    {reconciliation.stitchedLineCount} wrapped memos stitched
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Primary Export Hierarchy */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleExport("xlsx")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download Excel (.xlsx)
              {!result.isSample && !licenseStatus.valid && <Lock className="h-3 w-3 opacity-85" />}
            </button>

            <button
              type="button"
              onClick={() => handleExport("qbo")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              Download QuickBooks (.QBO)
              {!result.isSample && !licenseStatus.valid && <Lock className="h-3 w-3 opacity-85" />}
            </button>

            <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
              <select
                value={secondaryFormat}
                onChange={(e) => setSecondaryFormat(e.target.value as ExportFormat)}
                aria-label="Additional accounting export format"
                className="bg-transparent px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="quickbooks_csv">QB CSV (4-Col)</option>
                <option value="quickbooks_3col_csv">QB CSV (3-Col)</option>
                <option value="xero_csv">Xero CSV</option>
                <option value="csv">Standard CSV</option>
                <option value="ofx">OFX (.ofx)</option>
                <option value="json">JSON</option>
              </select>
              <button
                type="button"
                onClick={() => handleExport(secondaryFormat)}
                className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
              >
                Export
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSettings((prev) => !prev)}
              aria-expanded={showSettings}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium shadow-2xs transition ${
                showSettings
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Settings
            </button>
          </div>
        </div>

        {/* 4 Clean Financial KPI Metric Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Opening Balance
            </span>
            <span className="mono-nums mt-0.5 block text-sm font-bold text-slate-900 sm:text-base">
              {formatMoney(reconciliation.openingBalance, metadata.currency)}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              + Total Deposits
            </span>
            <span className="mono-nums mt-0.5 block text-sm font-bold text-emerald-700 sm:text-base">
              +{formatMoney(reconciliation.totalCredits, metadata.currency)}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              &minus; Total Withdrawals
            </span>
            <span className="mono-nums mt-0.5 block text-sm font-bold text-slate-900 sm:text-base">
              -{formatMoney(reconciliation.totalDebits, metadata.currency)}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              = Closing Balance
            </span>
            <span
              className={`mono-nums mt-0.5 block text-sm font-bold sm:text-base ${
                reconciliation.isFullyReconciled ? "text-slate-900" : "text-amber-700"
              }`}
            >
              {formatMoney(
                reconciliation.closingBalance ?? reconciliation.calculatedClosingBalance,
                metadata.currency
              )}
            </span>
          </div>
        </div>

        {/* Collapsible Balance & QuickBooks Account Settings Drawer */}
        {showSettings && (
          <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-6">
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
                className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
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
                className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="qbo-account-type"
                className="block text-[11px] font-medium text-slate-600"
              >
                QuickBooks Account Type
              </label>
              <select
                id="qbo-account-type"
                value={metadata.accountType}
                onChange={(e) => handleAccountTypeChange(e.target.value as AccountType)}
                aria-label="Statement account type for QuickBooks export"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
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
                aria-label="Statement currency"
                className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="account-last4"
                className="block text-[11px] font-medium text-slate-600"
              >
                Account Last 4 Digits
              </label>
              <input
                id="account-last4"
                type="text"
                maxLength={4}
                value={metadata.accountLast4}
                onChange={(e) => handleMetadataField("accountLast4", e.target.value)}
                aria-label="Account last 4 digits"
                className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleInvertAllSigns}
                title="Invert all Debit/Credit signs (useful for Credit Card PDFs)"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
                Flip All +/- Signs
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pro Bookkeeper Toolkit Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 sm:px-6 ${
          licenseStatus.valid
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-slate-200 bg-slate-50/90"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {licenseStatus.valid ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              PRO WORKSPACE ACTIVE: Unlimited Rows &middot; Batch PDF Merge &middot; .XLSX / .QBO / Audit PDF / Auto-Rules Unlocked
            </span>
          ) : (
            <span className="text-slate-600">
              <strong className="font-semibold text-slate-800">FREE PREVIEW:</strong> Max {FREE_ROW_LIMIT} rows/PDF &middot;{" "}
              <button
                type="button"
                onClick={() => {
                  setUpgradeReason("");
                  setShowUpgradeModal(true);
                }}
                className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
              >
                Sign in or get a $12 Pass
              </button>{" "}
              to unlock .XLSX, .QBO, CPA Audit PDF &amp; Auto-Rules
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadAuditPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs transition hover:border-blue-400 hover:bg-blue-50/40"
          >
            <FileCheck2 className="h-3.5 w-3.5 text-blue-600" />
            Download Audit Certificate (.PDF)
            {!result.isSample && !licenseStatus.valid && <Lock className="h-3 w-3 opacity-70" />}
          </button>

          <button
            type="button"
            onClick={() => setShowRulesDrawer((prev) => !prev)}
            aria-expanded={showRulesDrawer}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition ${
              showRulesDrawer
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Tag className="h-3.5 w-3.5 text-blue-600" />
            Auto-Category Rules ({customRules.length})
          </button>
        </div>
      </div>

      {/* Custom Auto-Categorization Rules Drawer */}
      {showRulesDrawer && (
        <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Custom Keyword Auto-Categorization Rules
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Automatically assign QuickBooks/Xero accounting categories whenever merchant descriptions match these keywords.
              </p>
            </div>
            <button
              type="button"
              onClick={handleApplyCustomRules}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800"
            >
              <Check className="h-3.5 w-3.5" />
              Apply Rules to Statement ({result.transactions.length} rows)
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {customRules.map((rule) => (
              <div
                key={rule.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs shadow-2xs"
              >
                <span className="mono-nums font-semibold text-slate-900">
                  &ldquo;{rule.keyword}&rdquo;
                </span>
                <span className="text-slate-400">&rarr;</span>
                <span className="font-medium text-blue-700">{rule.category}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteCustomRule(rule.id)}
                  title="Delete rule"
                  className="ml-1 rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddCustomRule} className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newRuleKeyword}
              onChange={(e) => setNewRuleKeyword(e.target.value)}
              placeholder="Merchant keyword (e.g. VERCEL, FIGMA, UBER)..."
              className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={newRuleCategory}
              onChange={(e) => setNewRuleCategory(e.target.value as CategoryName)}
              aria-label="Target category for keyword rule"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Rule
            </button>
          </form>
        </div>
      )}

      {/* Search, Category Filter & Row Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchant, date, or memo..."
              className="w-60 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter transactions by category"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Categories ({result.transactions.length})</option>
            {Array.from(categoryCounts.entries()).map(([cat, count]) => (
              <option key={cat} value={cat}>
                {cat} ({count})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            Add Row
          </button>

          {reconciliation.duplicateRows > 0 && (
            <button
              type="button"
              onClick={handleRemoveDuplicates}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove {reconciliation.duplicateRows} Duplicates
            </button>
          )}
        </div>

        <span className="text-xs text-slate-500">
          Click any cell to edit inline &middot; Balances recalculate automatically
        </span>
      </div>

      {/* Warnings if any */}
      {result.warnings.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 sm:px-6">
          {result.warnings.join(" ")}
        </div>
      )}

      {/* Interactive Financial Spreadsheet Table */}
      <div className="max-h-[440px] overflow-auto bg-white">
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
                <td className="min-w-[260px] px-3.5 py-2 align-top">
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => handleCellChange(row.id, "description", e.target.value)}
                    aria-label="Transaction description"
                    className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </td>
                <td className="px-3.5 py-2 align-top">
                  <select
                    value={row.category}
                    onChange={(e) => handleCellChange(row.id, "category", e.target.value)}
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
                    {row.isDuplicate && (
                      <span
                        title="Potential duplicate from overlapping statements"
                        className="inline-flex items-center rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                      >
                        DUP
                      </span>
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

      {/* Clean Footer Status & Quick CSV Export Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-6">
        <div className="text-xs text-slate-600">
          {result.isSample ? (
            <span className="font-medium text-emerald-700">
              Sample mode: All 8 export formats are unlocked so you can verify import formatting first.
            </span>
          ) : licenseStatus.valid ? (
            <span className="font-medium text-emerald-700">
              License active: Unlimited rows, batch PDFs &amp; all accounting feeds unlocked.
            </span>
          ) : (
            <span>
              Uploaded PDFs: Free up to {FREE_ROW_LIMIT} rows in CSV/JSON &middot; Full Excel/QBO/OFX require{" "}
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
              >
                $12 Pass or Annual Pro
              </button>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport("csv")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport("xero_csv")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Xero CSV
          </button>
        </div>
      </div>

      {/* License & Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Unlock Unlimited &amp; Accounting Exports
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
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

            {!result.isSample && result.transactions.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-medium text-slate-700">
                  Want to verify format compatibility before purchasing? Export the first{" "}
                  {Math.min(FREE_ROW_LIMIT, result.transactions.length)} rows of your statement free:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleExport("qbo", true)}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Download Free 25-Row .QBO Sample
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("csv", true)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Download Free 25-Row .CSV Sample
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <a
                href={CHECKOUT_URLS.pass7Day}
                onClick={() => {
                  if (CHECKOUT_URLS.pass7Day === "#pricing") setShowUpgradeModal(false);
                }}
                className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-3.5 transition hover:border-blue-400 hover:bg-blue-50/40"
              >
                <span className="text-xs font-semibold text-slate-700">7-Day Audit Pass</span>
                <span className="mono-nums mt-1 text-xl font-bold text-slate-900">$12</span>
                <span className="mt-1 text-[11px] text-slate-500">One-time &middot; No renewal</span>
              </a>

              <a
                href={CHECKOUT_URLS.proMonthly}
                onClick={() => {
                  if (CHECKOUT_URLS.proMonthly === "#pricing") setShowUpgradeModal(false);
                }}
                className="flex flex-col rounded-xl border-2 border-blue-600 bg-blue-50/40 p-3.5 transition hover:bg-blue-50/80"
              >
                <span className="text-xs font-semibold text-blue-700">Annual Pro Bookkeeper</span>
                <span className="mono-nums mt-1 text-xl font-bold text-slate-900">$29 / year</span>
                <span className="mt-1 text-[11px] text-slate-600">One-time pass, no renewal</span>
              </a>
            </div>

            <form onSubmit={handleActivateLicense} className="mt-5 border-t border-slate-200 pt-4">
              <label className="block text-xs font-semibold text-slate-800">
                Already purchased? Sign in with your Polar checkout Email OR License Key:
              </label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Verified directly with Polar.sh — no password needed.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => {
                    setLicenseKeyDraft(e.target.value);
                    if (licenseFeedback) setLicenseFeedback(null);
                  }}
                  placeholder="you@example.com or VS-XXXX-XXXX-XXXX"
                  disabled={isVerifyingLicense}
                  className="mono-nums flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isVerifyingLicense}
                  className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {isVerifyingLicense ? "Verifying..." : "Verify & Sign In"}
                </button>
              </div>
              {licenseStatus.message && !licenseStatus.valid && (
                <p className="mt-1.5 text-xs text-rose-600">{licenseStatus.message}</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* My Pro Account & Polar License Modal */}
      {showAccountModal && licenseStatus.valid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">VaultSheet Pro Account</h3>
                  <p className="text-xs text-emerald-700 font-medium">
                    {storedProfile?.planName ||
                      (licenseStatus.plan === "pass_7d"
                        ? "7-Day Tax & Audit Pass"
                        : "Annual Pro Bookkeeper Pass")}
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

            <div className="mt-4 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              {storedProfile?.customerEmail && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Account Email:</span>
                  <span className="font-semibold text-slate-900">
                    {storedProfile.customerName
                      ? `${storedProfile.customerName} (${storedProfile.customerEmail})`
                      : storedProfile.customerEmail}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">License Key:</span>
                <div className="flex items-center gap-1.5">
                  <span className="mono-nums font-semibold text-slate-900">
                    {storedProfile?.displayKey ||
                      (storedLicenseKey ? `VS-****-${storedLicenseKey.slice(-6)}` : "Active")}
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
                      title="Copy full license key"
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
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Unlocked Pro Capabilities
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Unlimited rows &amp; multi-PDF statement batch merge
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Full Excel (.xlsx 3-sheet), QuickBooks (.qbo), Xero CSV &amp; OFX exports
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Downloadable CPA Reconciliation &amp; Audit Certificate (.pdf)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Custom Keyword Auto-Categorization Rules
                </li>
              </ul>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
              <a
                href={storedProfile?.portalUrl || "https://polar.sh/vaultsheet/portal"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                Billing &amp; Receipts (Polar)
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

      {/* Floating Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
