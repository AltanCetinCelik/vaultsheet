"use client";

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
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
  saveStoredLicenseKey,
  verifyLicenseKey,
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
  const [licenseKeyDraft, setLicenseKeyDraft] = useState<string | null>(null);
  const [licenseFeedback, setLicenseFeedback] = useState<{
    valid: boolean;
    plan: "free" | "pass_7d" | "pro_monthly";
    message: string;
  } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [secondaryFormat, setSecondaryFormat] = useState<ExportFormat>("quickbooks_csv");
  const [pastedText, setPastedText] = useState("");
  const [upgradeReason, setUpgradeReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const licenseKey = licenseKeyDraft ?? storedLicenseKey;
  const licenseStatus = useMemo(() => {
    if (licenseFeedback && !licenseFeedback.valid) return licenseFeedback;
    if (storedLicenseKey) return verifyLicenseKey(storedLicenseKey);
    return { valid: false, plan: "free" as const, message: "" };
  }, [licenseFeedback, storedLicenseKey]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  }, []);

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
          const single = parsedList[0];
          setResult(single);
          setExplicitOpening(single.reconciliation.openingBalance);
          setExplicitClosing(single.reconciliation.closingBalance);
          showToast(
            `Parsed ${single.transactions.length} transactions locally (${single.metadata.parseMode}).`
          );
        } else {
          // Batch merge sorted chronologically so user sees consolidated table before exporting
          const mergedRows = parsedList
            .flatMap((p) => p.transactions)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((r, i) => ({ ...r, id: `batch-${i + 1}` }));
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
    [showToast]
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
    const parsed = parseRawStatementText(pastedText, "pasted-statement.txt");
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

  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    const res = verifyLicenseKey(licenseKey);
    if (res.valid) {
      saveStoredLicenseKey(licenseKey);
      setLicenseFeedback(null);
      setLicenseKeyDraft(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
      }
      setShowUpgradeModal(false);
      showToast(res.message);
    } else {
      setLicenseFeedback(res);
    }
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
    <div className="w-full rounded-2xl border border-white/10 bg-[#0c111a]/95 shadow-[0_24px_90px_rgba(0,0,0,0.65)] backdrop-blur-sm">
      {/* Guided 3-Step Workflow & Privacy Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">
              1
            </span>
            Drop Bank PDF
          </span>
          <span className="text-slate-600">&rarr;</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium text-slate-200">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold text-white">
              2
            </span>
            Instant Balance Check
          </span>
          <span className="text-slate-600">&rarr;</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium text-slate-200">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold text-white">
              3
            </span>
            Download Excel or .QBO
          </span>
          {contextBankName && (
            <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
              {contextBankName}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            100% Private · Files Never Leave Your Computer
          </span>
          {licenseStatus.valid ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
              <KeyRound className="h-3.5 w-3.5" />
              {licenseStatus.plan === "pass_7d" ? "7-Day Audit Pass Active" : "Annual Pro Active"}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setUpgradeReason("");
                setShowUpgradeModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-400/50 hover:bg-white/10"
            >
              <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
              Activate License Key
            </button>
          )}
        </div>
      </div>

      {/* Dropzone & Sample Statement Bar */}
      <div className="grid gap-4 border-b border-white/10 p-4 sm:p-6 lg:grid-cols-12">
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
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center transition lg:col-span-5 ${
            isDragging
              ? "border-emerald-400 bg-emerald-500/10"
              : "border-white/20 bg-[#080c13] hover:border-emerald-400/50 hover:bg-[#0e1522]"
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
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-white">
            {isParsing
              ? "Reading your statement safely on this device..."
              : "Drop Your PDF Bank Statement Here — or Click to Browse"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Works with single or multi-month PDFs from Chase, Wells Fargo, BofA, Wise, Mercury, Revolut &amp; 60+ banks
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPasteModal(true);
            }}
            className="mt-2.5 inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-emerald-400/50 hover:text-white"
          >
            <FileText className="h-3 w-3 text-emerald-400" />
            Or Paste Scanned OCR / Portal Table Text
          </button>
        </div>

        {/* Preset Samples + Sample PDF Download */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#080c13] p-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-200">
                No PDF handy? Click a sample statement to test live:
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Each button generates a real bank statement PDF and converts it instantly with unlimited free exports.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadSamplePdf}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              Download Sample PDF
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(BANK_PRESETS) as SamplePresetId[]).map((id) => {
              const p = BANK_PRESETS[id];
              const active = result.isSample && activePreset === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleLoadSample(id)}
                  className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition ${
                    active
                      ? "border-emerald-400/70 bg-emerald-500/15 text-white"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="text-xs font-semibold">{p.label}</span>
                  <span className="mono-nums mt-0.5 text-[11px] text-slate-400">
                    {p.currency} · {p.dateHint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Balance Check Summary + Eye-Level Primary Downloads + Collapsible Accountant Settings */}
      <div className="border-b border-white/10 bg-[#090e17] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              {reconciliation.isFullyReconciled ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Balance Verified to the Exact Cent ($0.00 Diff · {reconciliation.matchedRows}/{result.transactions.length} Rows)
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  Review Needed ({reconciliation.mismatchRows} row mismatch · Diff:{" "}
                  {formatMoney(reconciliation.discrepancy, metadata.currency)})
                </div>
              )}

              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                <span className="font-medium text-white">{metadata.bankDetected}</span>
                <span className="text-slate-500">&middot;</span>
                <span className="mono-nums">****{metadata.accountLast4}</span>
                <span className="text-slate-500">&middot;</span>
                <span className="mono-nums text-emerald-300">{metadata.currency}</span>
                <span className="text-slate-500">&middot;</span>
                <span className="mono-nums text-slate-400">
                  {metadata.periodStart ?? "—"} to {metadata.periodEnd ?? "—"} ({result.transactions.length} txns)
                </span>
              </span>
            </div>

            {/* Clean Read-Only Balance Equation Strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Opening:</span>
                <span className="mono-nums font-semibold text-white">
                  {formatMoney(reconciliation.openingBalance, metadata.currency)}
                </span>
              </div>
              <span className="text-slate-600">&middot;</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">+ Deposits:</span>
                <span className="mono-nums font-semibold text-emerald-400">
                  +{formatMoney(reconciliation.totalCredits, metadata.currency)}
                </span>
              </div>
              <span className="text-slate-600">&middot;</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">&minus; Withdrawals:</span>
                <span className="mono-nums font-semibold text-rose-400">
                  -{formatMoney(reconciliation.totalDebits, metadata.currency)}
                </span>
              </div>
              <span className="text-slate-600">=</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Closing:</span>
                <span
                  className={`mono-nums font-semibold ${
                    reconciliation.isFullyReconciled ? "text-emerald-400" : "text-amber-300"
                  }`}
                >
                  {formatMoney(
                    reconciliation.closingBalance ?? reconciliation.calculatedClosingBalance,
                    metadata.currency
                  )}
                </span>
              </div>
              {reconciliation.stitchedLineCount > 0 && (
                <span className="text-[11px] text-slate-500">
                  ({reconciliation.stitchedLineCount} wrapped memos merged)
                </span>
              )}
            </div>
          </div>

          {/* Primary Actions at Eye Level */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleExport("xlsx")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download Excel (.xlsx)
              {!result.isSample && !licenseStatus.valid && <Lock className="h-3 w-3 opacity-80" />}
            </button>

            <button
              type="button"
              onClick={() => handleExport("qbo")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              Download QuickBooks (.QBO)
              {!result.isSample && !licenseStatus.valid && <Lock className="h-3 w-3 opacity-80" />}
            </button>

            <button
              type="button"
              onClick={() => setShowSettings((prev) => !prev)}
              aria-expanded={showSettings}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                showSettings
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                  : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Adjust Balances &amp; Settings
            </button>
          </div>
        </div>

        {/* Collapsible Balance & QuickBooks Account Settings Drawer */}
        {showSettings && (
          <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-[#0d1420] p-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <label
                htmlFor="opening-balance-input"
                className="block text-[11px] font-medium text-slate-400"
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
                className="mono-nums mt-1 w-full rounded-lg border border-white/15 bg-[#080c13] px-2.5 py-1.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="closing-balance-input"
                className="block text-[11px] font-medium text-slate-400"
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
                className="mono-nums mt-1 w-full rounded-lg border border-white/15 bg-[#080c13] px-2.5 py-1.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="qbo-account-type"
                className="block text-[11px] font-medium text-slate-400"
              >
                QuickBooks Account Type
              </label>
              <select
                id="qbo-account-type"
                value={metadata.accountType}
                onChange={(e) => handleAccountTypeChange(e.target.value as AccountType)}
                aria-label="Statement account type for QuickBooks export"
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#080c13] px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-400/60 focus:outline-none"
              >
                <option value="CHECKING">Checking (.qbo)</option>
                <option value="SAVINGS">Savings (.qbo)</option>
                <option value="CREDITCARD">Credit Card (.qbo)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="statement-currency"
                className="block text-[11px] font-medium text-slate-400"
              >
                Currency
              </label>
              <select
                id="statement-currency"
                value={metadata.currency}
                onChange={(e) => handleMetadataField("currency", e.target.value)}
                aria-label="Statement currency"
                className="mono-nums mt-1 w-full rounded-lg border border-white/15 bg-[#080c13] px-2.5 py-1.5 text-xs text-emerald-300 focus:border-emerald-400/60 focus:outline-none"
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
                className="block text-[11px] font-medium text-slate-400"
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
                className="mono-nums mt-1 w-full rounded-lg border border-white/15 bg-[#080c13] px-2.5 py-1.5 text-xs text-white focus:border-emerald-400/60 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleInvertAllSigns}
                title="Invert all Debit/Credit signs (useful for Credit Card PDFs)"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-400/40 hover:bg-white/10"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-emerald-400" />
                Flip All +/- Signs
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clean Search, Filter & Row Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchant, date, or memo..."
              className="w-60 rounded-lg border border-white/10 bg-[#080c13] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter transactions by category"
            className="rounded-lg border border-white/10 bg-[#080c13] px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-400/60 focus:outline-none"
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
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </button>

          {reconciliation.duplicateRows > 0 && (
            <button
              type="button"
              onClick={handleRemoveDuplicates}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-500/25"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove {reconciliation.duplicateRows} Duplicates
            </button>
          )}
        </div>

        <span className="text-xs text-slate-400">
          Click any cell to edit · Totals update automatically
        </span>
      </div>

      {/* Warnings if any */}
      {result.warnings.length > 0 && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200 sm:px-6">
          {result.warnings.join(" ")}
        </div>
      )}

      {/* Interactive Financial Spreadsheet Table */}
      <div className="max-h-[430px] overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0f18] text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Description (Stitched Multi-Line)</th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5 text-right">Amount ({metadata.currency})</th>
              <th className="px-3 py-2.5 text-right">Balance</th>
              <th className="px-3 py-2.5 text-center">Audit</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredRows.map((row) => (
              <tr
                key={row.id}
                className={`transition hover:bg-white/[0.03] ${
                  row.balanceStatus === "mismatch" ? "bg-amber-500/10" : ""
                }`}
              >
                <td className="px-3 py-2 align-top">
                  <input
                    type="text"
                    value={row.date}
                    onChange={(e) => handleCellChange(row.id, "date", e.target.value)}
                    aria-label="Transaction date"
                    className="mono-nums w-24 rounded border border-transparent bg-transparent px-1 py-0.5 text-slate-200 focus:border-emerald-400/50 focus:bg-[#080c13] focus:outline-none"
                  />
                </td>
                <td className="min-w-[240px] px-3 py-2 align-top">
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => handleCellChange(row.id, "description", e.target.value)}
                    aria-label="Transaction description"
                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-slate-100 focus:border-emerald-400/50 focus:bg-[#080c13] focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <select
                    value={row.category}
                    onChange={(e) => handleCellChange(row.id, "category", e.target.value)}
                    aria-label="Transaction category"
                    className="rounded border border-white/10 bg-[#080c13] px-2 py-0.5 text-[11px] text-slate-300 focus:border-emerald-400/50 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <input
                    type="number"
                    step="0.01"
                    value={row.amount}
                    onChange={(e) => handleCellChange(row.id, "amount", e.target.value)}
                    aria-label="Transaction amount"
                    className={`mono-nums w-24 rounded border border-transparent bg-transparent px-1 py-0.5 text-right font-medium focus:border-emerald-400/50 focus:bg-[#080c13] focus:outline-none ${
                      row.amount >= 0 ? "text-emerald-400" : "text-rose-300"
                    }`}
                  />
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <input
                    type="number"
                    step="0.01"
                    value={row.balance ?? ""}
                    onChange={(e) => handleCellChange(row.id, "balance", e.target.value)}
                    aria-label="Running balance"
                    className="mono-nums w-24 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-slate-300 focus:border-emerald-400/50 focus:bg-[#080c13] focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2 text-center align-top">
                  <div className="inline-flex items-center gap-1">
                    {row.balanceStatus === "matched" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        OK
                      </span>
                    ) : row.balanceStatus === "mismatch" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                        DIFF
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">—</span>
                    )}
                    {row.isDuplicate && (
                      <span
                        title="Potential duplicate from overlapping statements"
                        className="inline-flex items-center rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300"
                      >
                        DUP
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      title="Flip Debit / Credit Sign"
                      onClick={() => handleFlipSign(row.id)}
                      className="rounded border border-white/10 p-1 text-slate-400 hover:border-white/25 hover:text-white"
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Delete row"
                      onClick={() => handleDeleteRow(row.id)}
                      className="rounded border border-white/10 p-1 text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No matching transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Streamlined Bottom Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#080c13] px-4 py-4 sm:px-6">
        <div className="text-xs text-slate-400">
          {result.isSample ? (
            <span className="text-emerald-300">
              Sample mode: All 8 export formats are unlocked so you can verify output quality.
            </span>
          ) : licenseStatus.valid ? (
            <span className="text-emerald-300">
              License active: Unlimited rows, batch PDFs &amp; all accounting feeds unlocked.
            </span>
          ) : (
            <span>
              Uploaded PDFs: CSV/JSON free up to {FREE_ROW_LIMIT} rows · Excel/QBO/OFX require{" "}
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="font-semibold text-emerald-400 underline underline-offset-2"
              >
                $12 Pass or Annual Pro
              </button>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport("xlsx")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download Excel (.xlsx)
            {!result.isSample && !licenseStatus.valid && <Lock className="h-3 w-3 opacity-80" />}
          </button>

          <button
            type="button"
            onClick={() => handleExport("qbo")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
          >
            Download QuickBooks (.QBO)
            {!result.isSample && !licenseStatus.valid && <Lock className="h-3 w-3 opacity-80" />}
          </button>

          <button
            type="button"
            onClick={() => handleExport("csv")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            Standard CSV
          </button>

          <div className="flex items-center rounded-lg border border-white/15 bg-[#0c111a] p-0.5">
            <select
              value={secondaryFormat}
              onChange={(e) => setSecondaryFormat(e.target.value as ExportFormat)}
              aria-label="Additional accounting export format"
              className="bg-transparent px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="quickbooks_csv" className="bg-[#0c111a]">
                QuickBooks Online CSV (4-Col)
              </option>
              <option value="quickbooks_3col_csv" className="bg-[#0c111a]">
                QuickBooks Online CSV (3-Col)
              </option>
              <option value="xero_csv" className="bg-[#0c111a]">
                Xero Bank Feed CSV
              </option>
              <option value="ofx" className="bg-[#0c111a]">
                OFX Money / Wave (.ofx)
              </option>
              <option value="json" className="bg-[#0c111a]">
                JSON Ledger
              </option>
            </select>
            <button
              type="button"
              onClick={() => handleExport(secondaryFormat)}
              className="rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 hover:text-slate-950"
            >
              Export Selected
            </button>
          </div>
        </div>
      </div>

      {/* License & Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0e1420] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Unlock Unlimited & Accounting Exports</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {upgradeReason && (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {upgradeReason}
              </p>
            )}

            {!result.isSample && result.transactions.length > 0 && (
              <div className="mt-3 rounded-xl border border-white/10 bg-[#080c13] p-3">
                <p className="text-[11px] font-medium text-slate-300">
                  Skeptical before paying? Test QuickBooks/Excel import with the first{" "}
                  {Math.min(FREE_ROW_LIMIT, result.transactions.length)} rows of your own file free:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleExport("qbo", true)}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                  >
                    Download Free 25-Row .QBO Sample
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("csv", true)}
                    className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/10"
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
                className="flex flex-col rounded-xl border border-white/15 bg-white/[0.03] p-3.5 transition hover:border-emerald-400/60"
              >
                <span className="text-xs font-semibold text-slate-300">7-Day Audit Pass</span>
                <span className="mono-nums mt-1 text-xl font-bold text-white">$12</span>
                <span className="mt-1 text-[11px] text-slate-400">One-time · No subscription</span>
              </a>

              <a
                href={CHECKOUT_URLS.proMonthly}
                onClick={() => {
                  if (CHECKOUT_URLS.proMonthly === "#pricing") setShowUpgradeModal(false);
                }}
                className="flex flex-col rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-3.5 transition hover:bg-emerald-500/15"
              >
                <span className="text-xs font-semibold text-emerald-300">Annual Pro Bookkeeper</span>
                <span className="mono-nums mt-1 text-xl font-bold text-white">$29 / year</span>
                <span className="mt-1 text-[11px] text-slate-300">One-time pass, no auto-renewal</span>
              </a>
            </div>

            <form onSubmit={handleActivateLicense} className="mt-5 border-t border-white/10 pt-4">
              <label className="block text-xs font-medium text-slate-300">
                Already purchased via Polar / Lemon Squeezy? Enter License Key:
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => {
                    setLicenseKeyDraft(e.target.value);
                    if (licenseFeedback) setLicenseFeedback(null);
                  }}
                  placeholder="VS-PRO-XXXX-XX or UUID key"
                  className="mono-nums flex-1 rounded-lg border border-white/15 bg-[#080c13] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Activate
                </button>
              </div>
              {licenseStatus.message && !licenseStatus.valid && (
                <p className="mt-1.5 text-xs text-rose-400">{licenseStatus.message}</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Paste Raw Statement / OCR Text Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0e1420] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Paste OCR or Raw Statement Text</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Works on copy-pasted scanned PDF OCR output, messy bank portal tables, or CSV lines.
              Runs strictly inside browser RAM.
            </p>
            <form onSubmit={handleParsePastedText} className="mt-4">
              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Opening Balance: 1000.00\n10/02/2026  AWS Cloud Services       -145.20    854.80\n10/05/2026  Stripe Payout Settlement  2400.00   3254.80\nClosing Balance: 3254.80`}
                className="mono-nums w-full rounded-xl border border-white/15 bg-[#080c13] p-3 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="rounded-lg border border-white/15 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
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
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-emerald-500/40 bg-[#0d1522] px-4 py-3 text-xs font-medium text-emerald-200 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
