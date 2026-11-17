import { describe, expect, it } from "vitest";
import { BANK_PRESETS, generateSampleStatementPdf } from "@/lib/samplePdfGenerator";
import {
  buildParseResultFromTextItems,
  normalizeDateString,
  parseLocalizedNumber,
  parsePdfBytesDeterministic,
  parseRawStatementText,
  reconcileTransactions,
} from "@/lib/statementParser";
import {
  exportAuditCertificatePdfBytes,
  exportToCsv,
  exportToExcelBytes,
  exportToJsonString,
  exportToQboOrOfx,
  getExportMimeAndFilename,
} from "@/lib/exporters";
import { computeKeyChecksum, verifyLicenseKey } from "@/lib/licensing";
import { getSeoBankBySlug, SEO_BANKS } from "@/lib/seoCatalog";
import {
  analyzeStatementForensics,
  generateLegalActionNotice,
} from "@/lib/financialForensics";
import {
  generateFallbackCandles,
  optimizeStrategyConfig,
  runStrategyBacktest,
  runStrategyTournament,
} from "@/lib/quantBacktester";
import type { PositionedTextItem, SamplePresetId, TransactionRow } from "@/lib/types";

const PRESET_IDS: SamplePresetId[] = ["chase", "wise", "mercury", "revolut", "garanti"];

describe("Sample PDF 1.4 Generator & Deterministic Parser", () => {
  it.each(PRESET_IDS)("generates valid binary PDF and reconciles 100% for %s", (presetId) => {
    const pdfBytes = generateSampleStatementPdf(presetId);
    const ascii = new TextDecoder("latin1").decode(pdfBytes);

    expect(ascii.startsWith("%PDF-1.4")).toBe(true);
    expect(ascii.trimEnd().endsWith("%%EOF")).toBe(true);

    const meta = BANK_PRESETS[presetId];
    const parsed = parsePdfBytesDeterministic(pdfBytes, meta.sampleFileName, true);

    expect(parsed.transactions.length).toBeGreaterThanOrEqual(8);
    expect(parsed.reconciliation.isFullyReconciled).toBe(true);
    expect(parsed.reconciliation.mismatchRows).toBe(0);
    expect(parsed.reconciliation.discrepancy).toBe(0);
    expect(parsed.reconciliation.stitchedLineCount).toBeGreaterThan(0);
  });
});

describe("Locale Number & Date Parsing", () => {
  it("parses US, EU, accounting parentheses, and CR/DR suffixes", () => {
    expect(parseLocalizedNumber("$1,234.56")).toBeCloseTo(1234.56, 2);
    expect(parseLocalizedNumber("€1.234,56")).toBeCloseTo(1234.56, 2);
    expect(parseLocalizedNumber("(450.25)")).toBeCloseTo(-450.25, 2);
    expect(parseLocalizedNumber("320.00 DR")).toBeCloseTo(-320, 2);
    expect(parseLocalizedNumber("980,50 CR")).toBeCloseTo(980.5, 2);
  });

  it("normalizes ISO, US, EU, and named dates into YYYY-MM-DD", () => {
    expect(normalizeDateString("2026-10-15")).toBe("2026-10-15");
    expect(normalizeDateString("10/15/2026", 2026, false)).toBe("2026-10-15");
    expect(normalizeDateString("15/10/2026", 2026, true)).toBe("2026-10-15");
    expect(normalizeDateString("Oct 15, 2026")).toBe("2026-10-15");
  });
});

describe("Cent-Level Running Balance Reconciliation & Sign Inference", () => {
  it("infers negative debit sign from running balance drop and catches mismatches", () => {
    const unsignedRow: TransactionRow = {
      id: "tx-1",
      sourceFile: "test.pdf",
      page: 1,
      date: "2026-10-02",
      description: "AWS Cloud Invoice",
      debit: null,
      credit: null,
      amount: 150,
      balance: 850,
      category: "SaaS & Cloud",
      stitchedLines: 1,
      balanceStatus: "unverified",
      discrepancyCents: 0,
    };

    const reconciled = reconcileTransactions([unsignedRow], 1000, 850);
    expect(reconciled.transactions[0].amount).toBe(-150);
    expect(reconciled.transactions[0].debit).toBe(150);
    expect(reconciled.transactions[0].credit).toBeNull();
    expect(reconciled.reconciliation.inferredSigns).toBe(1);
    expect(reconciled.reconciliation.isFullyReconciled).toBe(true);
    expect(reconciled.reconciliation.mismatchRows).toBe(0);

    const brokenRow: TransactionRow = {
      ...unsignedRow,
      id: "tx-2",
      amount: -100,
      debit: 100,
      credit: null,
      balance: 850,
    };
    const broken = reconcileTransactions([brokenRow], 1000, 850);
    expect(broken.reconciliation.isFullyReconciled).toBe(false);
    expect(broken.reconciliation.mismatchRows).toBeGreaterThan(0);
    expect(broken.reconciliation.discrepancy).not.toBe(0);
  });
});

describe("Export Formats (CSV, QuickBooks, Xero, QBO, OFX, XLSX, JSON)", () => {
  it("produces valid outputs and metadata across all 7 formats", () => {
    const bytes = generateSampleStatementPdf("chase");
    const parsed = parsePdfBytesDeterministic(bytes, "chase-oct-2026.pdf", true);

    const stdCsv = exportToCsv(parsed, "standard");
    expect(stdCsv.replace(/^\uFEFF/, "").split(/\r?\n/)[0]).toBe(
      "Date,Description,Category,Debit,Credit,Amount,Balance,AuditStatus,SourceFile",
    );

    const qbCsv = exportToCsv(parsed, "quickbooks");
    expect(qbCsv.replace(/^\uFEFF/, "").split(/\r?\n/)[0]).toBe(
      "Date,Description,Credit,Debit",
    );

    const qb3ColCsv = exportToCsv(parsed, "quickbooks_3col");
    expect(qb3ColCsv.replace(/^\uFEFF/, "").split(/\r?\n/)[0]).toBe(
      "Date,Description,Amount",
    );
    expect(getExportMimeAndFilename("chase-oct.pdf", "quickbooks_3col_csv").downloadName).toBe(
      "chase-oct-qbo-3col.csv",
    );

    const xeroCsv = exportToCsv(parsed, "xero");
    expect(xeroCsv.replace(/^\uFEFF/, "").split(/\r?\n/)[0]).toBe(
      "*Date,*Amount,Payee,Description,Reference",
    );

    const qbo = exportToQboOrOfx(parsed, "qbo");
    expect(qbo).toContain("INTU.BID");
    expect(qbo).toContain("<FITID>");
    expect(qbo).toContain("<TRNAMT>");

    const ofx = exportToQboOrOfx(parsed, "ofx");
    expect(ofx).toContain("<OFX>");
    expect(ofx).not.toContain("INTU.BID");

    const xlsxBytes = exportToExcelBytes(parsed);
    expect(xlsxBytes.length).toBeGreaterThan(1000);
    expect(xlsxBytes[0]).toBe(0x50); // 'P'
    expect(xlsxBytes[1]).toBe(0x4b); // 'K'

    const json = JSON.parse(exportToJsonString(parsed));
    expect(json.transactions.length).toBe(parsed.transactions.length);
    expect(json.reconciliation.isFullyReconciled).toBe(true);

    expect(getExportMimeAndFilename("chase-oct.pdf", "xlsx").downloadName).toBe(
      "chase-oct-vaultsheet.xlsx",
    );
    expect(getExportMimeAndFilename("chase-oct.pdf", "qbo").downloadName).toBe(
      "chase-oct.qbo",
    );
  });
});

describe("License Checksum Verification & SEO Catalog", () => {
  it("accepts valid structured and UUID license keys and rejects forged keys", () => {
    const passSig = computeKeyChecksum("PASS-8A2F");
    const validPass = `VS-PASS-8A2F-${passSig}`;
    expect(verifyLicenseKey(validPass)).toMatchObject({ valid: true, plan: "pass_7d" });

    const proSig = computeKeyChecksum("PRO-9B4C");
    const validPro = `VS-PRO-9B4C-${proSig}`;
    expect(verifyLicenseKey(validPro)).toMatchObject({ valid: true, plan: "pro_monthly" });

    expect(verifyLicenseKey("550e8400-e29b-41d4-a716-446655440000")).toMatchObject({
      valid: true,
      plan: "pro_monthly",
    });

    expect(verifyLicenseKey("VS-PRO-9B4C-00").valid).toBe(false);
    expect(verifyLicenseKey("").valid).toBe(false);
  });

  it("exposes 64 unique bank/format slugs in SEO catalog", () => {
    expect(SEO_BANKS).toHaveLength(64);
    const uniqueSlugs = new Set(SEO_BANKS.map((b) => b.slug));
    expect(uniqueSlugs.size).toBe(64);
    expect(getSeoBankBySlug("chase-pdf-to-excel")?.currency).toBe("USD");
    expect(getSeoBankBySlug("pdf-bank-statement-to-qbo")?.region).toBe("Format");
  });
});

describe("Commercial Hardening: Multi-Section, Split Runs, OCR Paste & QuickBooks OL-222 Compliance", () => {
  it("handles multi-section unsigned deposits/withdrawals, split date spans, and merged money tokens", () => {
    const items: PositionedTextItem[] = [
      { page: 1, x: 40, y: 760, width: 120, str: "Bank of America Statement" },
      { page: 1, x: 40, y: 740, width: 150, str: "Opening Balance: 1,000.00" },
      { page: 1, x: 40, y: 720, width: 150, str: "Closing Balance: 1,750.00" },
      { page: 1, x: 40, y: 700, width: 35, str: "Date" },
      { page: 1, x: 110, y: 700, width: 80, str: "Description" },
      { page: 1, x: 380, y: 700, width: 55, str: "Amount" },
      { page: 1, x: 40, y: 680, width: 160, str: "DEPOSITS AND ADDITIONS" },
      // Split 3-span date + merged date case test
      { page: 1, x: 40, y: 660, width: 20, str: "Oct" },
      { page: 1, x: 64, y: 660, width: 16, str: "05," },
      { page: 1, x: 84, y: 660, width: 26, str: "2026" },
      { page: 1, x: 115, y: 660, width: 140, str: "Stripe Payout" },
      { page: 1, x: 380, y: 660, width: 60, str: "1,000.00" },
      { page: 1, x: 40, y: 640, width: 180, str: "ATM & DEBIT CARD WITHDRAWALS" },
      // Unsigned positive inside withdrawals section -> must become debit (-250.00)
      { page: 1, x: 40, y: 620, width: 180, str: "10/10/2026 AWS Cloud Hosting" },
      { page: 1, x: 380, y: 620, width: 120, str: "250.00 1,750.00" },
    ];

    const parsed = buildParseResultFromTextItems(items, "bofa-oct.pdf", 1, "pdfjs-browser");
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.transactions[0]).toMatchObject({ date: "2026-10-05", amount: 1000 });
    expect(parsed.transactions[1]).toMatchObject({
      date: "2026-10-10",
      description: "AWS Cloud Hosting",
      amount: -250,
      debit: 250,
    });
    expect(parsed.reconciliation.isFullyReconciled).toBe(true);
    expect(parsed.reconciliation.discrepancy).toBe(0);
  });

  it("parses raw OCR / CSV text, Balance Brought/Carried Forward, and flags cross-statement duplicates", () => {
    const rawText = [
      "Balance Brought Forward: 1000.00",
      "10/02/2026  AWS Cloud Services       -145.20    854.80",
      "10/05/2026  Stripe Payout Settlement  2400.00   3254.80",
      "Balance Carried Forward: 3254.80",
    ].join("\n");

    const parsed = parseRawStatementText(rawText, "ocr-oct.txt");
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.reconciliation.isFullyReconciled).toBe(true);
    expect(parsed.reconciliation.calculatedClosingBalance).toBeCloseTo(3254.8, 2);

    const dupRowA: TransactionRow = { ...parsed.transactions[0], id: "a", sourceFile: "sep.pdf" };
    const dupRowB: TransactionRow = { ...parsed.transactions[0], id: "b", sourceFile: "oct.pdf" };
    const dedupCheck = reconcileTransactions([dupRowA, dupRowB], null, null);
    expect(dedupCheck.reconciliation.duplicateRows).toBe(1);
    expect(dedupCheck.transactions[1].isDuplicate).toBe(true);
  });

  it("generates QuickBooks-compliant numeric 9-digit <BANKID> and <CREDITCARDMSGSRSV1> QBO files", () => {
    const bytes = generateSampleStatementPdf("chase");
    const checking = parsePdfBytesDeterministic(bytes, "chase-checking.pdf", true);
    const qboChecking = exportToQboOrOfx(checking, "qbo");

    expect(qboChecking).toContain("<BANKID>021000021");
    expect(qboChecking).not.toContain("<BANKID>VAULTSHEET");
    expect(qboChecking).toContain("<INTU.BID>10898");

    const creditCard = {
      ...checking,
      metadata: {
        ...checking.metadata,
        accountType: "CREDITCARD" as const,
      },
    };
    const qboCard = exportToQboOrOfx(creditCard, "qbo");
    expect(qboCard).toContain("<CREDITCARDMSGSRSV1>");
    expect(qboCard).toContain("<CCACCTFROM>");
    expect(qboCard).not.toContain("<BANKMSGSRSV1>");
  });

  it("generates valid binary CPA Reconciliation & Audit Certificate PDF", () => {
    const bytes = generateSampleStatementPdf("chase");
    const parsed = parsePdfBytesDeterministic(bytes, "chase-oct.pdf", true);
    const auditPdf = exportAuditCertificatePdfBytes(parsed);
    const ascii = new TextDecoder("latin1").decode(auditPdf);

    expect(ascii.startsWith("%PDF-1.4")).toBe(true);
    expect(ascii.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(ascii).toContain("VAULTSHEET - MATHEMATICAL RECONCILIATION & AUDIT CERTIFICATE");
    expect(ascii).toContain("VERIFIED TO THE EXACT CENT");
  });

  it("parses Turkish Garanti BBVA statements (TRY, Devreden Bakiye, (B)/(A), Turkish months)", () => {
    const bytes = generateSampleStatementPdf("garanti");
    const parsed = parsePdfBytesDeterministic(bytes, "garanti-bbva-ekim.pdf", true);

    expect(parsed.metadata.currency).toBe("TRY");
    expect(parsed.metadata.bankDetected).toContain("Garanti");
    expect(parsed.metadata.periodStart).toBe("2026-10-02");
    expect(parsed.metadata.periodEnd).toBe("2026-10-29");
    expect(parsed.transactions[0]?.date).toBe("2026-10-02");
    expect(parsed.transactions).toHaveLength(10);
    expect(parsed.reconciliation.isFullyReconciled).toBe(true);
    expect(parsed.reconciliation.discrepancy).toBe(0);

    expect(parseLocalizedNumber("1.250,40 TL (B)")).toBe(-1250.4);
    expect(parseLocalizedNumber("4.800,00 ₺ (A)")).toBe(4800);
    expect(normalizeDateString("14 Ekim 2026")).toBe("2026-10-14");
  });
});

describe("AI CFO Financial Forensics, Money Leak Radar & Tax Shield Engine", () => {
  it("detects recurring subscriptions, bank fees, 5-yr wealth impact, and Tax/VAT shields for Garanti BBVA & Chase", () => {
    const garantiBytes = generateSampleStatementPdf("garanti");
    const garanti = parsePdfBytesDeterministic(garantiBytes, "garanti-bbva-ekim.pdf", true);
    const reportTr = analyzeStatementForensics(garanti, {
      taxBracketPct: 25,
      includeVat: true,
    });

    expect(reportTr.leaks.some((l) => l.leakType === "bank_fee")).toBe(true);
    expect(reportTr.leaks.some((l) => l.leakType === "subscription")).toBe(true);
    expect(reportTr.totalDetectedLeaksAnnual).toBeGreaterThan(0);
    expect(reportTr.savedFiveYearCompounded).toBeGreaterThan(reportTr.savedAnnualTotal);
    expect(reportTr.totalVatShield).toBeGreaterThan(0);
    expect(reportTr.totalIncomeTaxShield).toBeGreaterThan(0);
    expect(reportTr.totalTaxCashback).toBeCloseTo(
      reportTr.totalVatShield + reportTr.totalIncomeTaxShield,
      2
    );
    expect(reportTr.taxItems.some((t) => t.lawRefTr.includes("GVK Md. 40"))).toBe(true);
    expect(reportTr.healthScore).toBeGreaterThanOrEqual(12);
    expect(reportTr.healthScore).toBeLessThanOrEqual(98);

    const chaseBytes = generateSampleStatementPdf("chase");
    const chase = parsePdfBytesDeterministic(chaseBytes, "chase-oct.pdf", true);
    const reportUs = analyzeStatementForensics(chase, {
      taxBracketPct: 30,
      includeVat: false,
    });
    expect(reportUs.totalVatShield).toBe(0);
    expect(reportUs.totalIncomeTaxShield).toBeGreaterThan(0);
    expect(reportUs.taxItems.some((t) => t.lawRefEn.includes("IRS Schedule C"))).toBe(true);

    const cutTargets = reportTr.leaks.slice(0, 2).map((l) => l.id);
    const cutSim = analyzeStatementForensics(garanti, { cutLeakIds: cutTargets });
    expect(cutSim.savedMonthlyTotal).toBeCloseTo(
      reportTr.leaks.slice(0, 2).reduce((sum, l) => sum + l.monthlyAmount, 0),
      2
    );
  });

  it("generates formal Turkish (BDDK/6502 TKHK) and English legal cancellation/refund notices", () => {
    const garanti = parsePdfBytesDeterministic(
      generateSampleStatementPdf("garanti"),
      "garanti-bbva-ekim.pdf",
      true
    );
    const forensics = analyzeStatementForensics(garanti);
    const feeLeak = forensics.leaks.find((l) => l.leakType === "bank_fee");
    const subLeak = forensics.leaks.find((l) => l.leakType === "subscription");
    expect(feeLeak).toBeDefined();
    expect(subLeak).toBeDefined();

    const trFeeNotice = generateLegalActionNotice(feeLeak!, garanti.metadata, "tr", "₺12.40");
    expect(trFeeNotice.title).toContain("6502");
    expect(trFeeNotice.body).toContain("BDDK");
    expect(trFeeNotice.body).toContain(feeLeak!.merchant);
    expect(trFeeNotice.body).toContain(garanti.metadata.accountLast4);

    const trSubNotice = generateLegalActionNotice(subLeak!, garanti.metadata, "tr", "₺1,890.50");
    expect(trSubNotice.title).toContain("6502");
    expect(trSubNotice.body).toContain("İptal");

    const enSubNotice = generateLegalActionNotice(subLeak!, garanti.metadata, "en", "$145.20");
    expect(enSubNotice.title).toContain("Termination");
    expect(enSubNotice.body).toContain("Refund");
    expect(enSubNotice.body).toContain(subLeak!.merchant);
  });
});

describe("Quantitative Backtester, 6-Strategy Tournament & Auto-Optimizer", () => {
  it("generates 300 deterministic OHLCV candles with valid High/Low/Close bounds", () => {
    const candles = generateFallbackCandles("BTCUSDT", "4h", 300);
    expect(candles).toHaveLength(300);
    for (const c of candles) {
      expect(c.high).toBeGreaterThanOrEqual(c.low);
      expect(c.high).toBeGreaterThanOrEqual(c.close);
      expect(c.low).toBeLessThanOrEqual(c.close);
      expect(c.close).toBeGreaterThan(0);
      expect(c.volume).toBeGreaterThan(0);
    }
  });

  it("runs all 6 strategies in tournament mode with intrabar SL/TP execution and equity curves", () => {
    const candles = generateFallbackCandles("ETHUSDT", "4h", 300);
    const results = runStrategyTournament(candles, {
      capital: 10000,
      leverage: 2,
      stopLossPct: 2.5,
      takeProfitPct: 7.0,
      feePct: 0.08,
      fastPeriod: 9,
      slowPeriod: 21,
      rsiOversold: 32,
      rsiOverbought: 70,
    });

    expect(results).toHaveLength(6);
    for (const r of results) {
      expect(r.equityCurve).toHaveLength(300);
      expect(r.finalEquity).toBeGreaterThan(0);
      expect(r.maxDrawdownPct).toBeGreaterThanOrEqual(0);
    }

    const single = runStrategyBacktest(candles, {
      strategyId: "donchian_breakout",
      capital: 10000,
      leverage: 2,
      stopLossPct: 2.5,
      takeProfitPct: 7.0,
      feePct: 0.08,
      fastPeriod: 9,
      slowPeriod: 21,
      rsiOversold: 32,
      rsiOverbought: 70,
    });
    expect(single.trades.length).toBeGreaterThan(0);
  });

  it("sweeps 36 combinations in optimizeStrategyConfig and selects a ranked winner", () => {
    const candles = generateFallbackCandles("SOLUSDT", "1h", 300);
    const { best, testedCount } = optimizeStrategyConfig(candles, 10000, 2);

    expect(testedCount).toBe(36);
    expect(best.totalTrades).toBeGreaterThan(0);
    expect(best.equityCurve).toHaveLength(300);
    expect(best.suggestedStopPrice).toBeGreaterThan(0);
    expect(best.suggestedTargetPrice).toBeGreaterThan(best.suggestedStopPrice);
  });
});
