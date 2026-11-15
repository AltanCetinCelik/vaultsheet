import type {
  AccountType,
  CategoryName,
  ParseResult,
  PositionedTextItem,
  ReconciliationReport,
  SamplePresetId,
  StatementMetadata,
  TransactionRow,
} from "./types";
import { BANK_PRESETS, generateSampleStatementPdf } from "./samplePdfGenerator";

const MONTH_MAP: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export function parseLocalizedNumber(raw: string): number | null {
  if (!raw) return null;
  let cleaned = raw.trim();
  if (!cleaned || cleaned === "-" || cleaned === "—") return null;

  let isNegative = false;
  if (/^\(.*\)$/.test(cleaned)) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (/\bDR\b$/i.test(cleaned)) {
    isNegative = true;
    cleaned = cleaned.replace(/\bDR\b$/i, "").trim();
  } else if (/\bCR\b$/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bCR\b$/i, "").trim();
  }

  cleaned = cleaned.replace(/^(USD|EUR|GBP|CAD|AUD|CHF|TRY)\s*/i, "").trim();
  cleaned = cleaned.replace(/\s*(USD|EUR|GBP|CAD|AUD|CHF|TRY)$/i, "").trim();
  cleaned = cleaned.replace(/[$€£¥₺\s]/g, "");

  if (cleaned.startsWith("-")) {
    isNegative = true;
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // Handle trailing minus (e.g. "145.20-")
  if (cleaned.endsWith("-")) {
    isNegative = true;
    cleaned = cleaned.slice(0, -1);
  }

  if (!/^\d[\d.,]*$/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized = cleaned;
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // European: 1.234,56
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // US/UK: 1,234.56
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    const afterComma = cleaned.slice(lastComma + 1);
    if (afterComma.length === 2 || afterComma.length === 1) {
      // European decimal without thousands dot: 420,50
      normalized = cleaned.replace(",", ".");
    } else if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
      // US thousands without cents: 1,250
      normalized = cleaned.replace(/,/g, "");
    } else {
      normalized = cleaned.replace(",", ".");
    }
  } else if (lastDot !== -1) {
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      // European integer thousands: 1.250
      normalized = cleaned.replace(/\./g, "");
    } else {
      normalized = cleaned;
    }
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return null;
  const signed = isNegative ? -Math.abs(parsed) : parsed;
  return fromCents(toCents(signed));
}

export function normalizeDateString(
  raw: string,
  defaultYear = 2026,
  preferDayFirst = false
): string | null {
  const s = raw.trim();
  if (!s) return null;

  // ISO YYYY-MM-DD or YYYY/MM/DD
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const m = iso[2].padStart(2, "0");
    const d = iso[3].padStart(2, "0");
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${iso[1]}-${m}-${d}`;
    }
  }

  // Numeric with full year: DD/MM/YYYY, MM/DD/YYYY, DD.MM.YYYY, MM-DD-YYYY
  const fullSlash = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (fullSlash) {
    const a = Number(fullSlash[1]);
    const b = Number(fullSlash[2]);
    let yr = Number(fullSlash[3]);
    if (yr < 100) yr += 2000;

    let month: number;
    let day: number;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else if (preferDayFirst || s.includes(".")) {
      day = a;
      month = b;
    } else {
      month = a;
      day = b;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${yr}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Short date without year: MM/DD or DD/MM
  const shortSlash = s.match(/^(\d{1,2})[./-](\d{1,2})$/);
  if (shortSlash) {
    const a = Number(shortSlash[1]);
    const b = Number(shortSlash[2]);
    let month: number;
    let day: number;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else if (preferDayFirst || s.includes(".")) {
      day = a;
      month = b;
    } else {
      month = a;
      day = b;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${defaultYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // DD MMM YYYY (02 Oct 2026, 02-Oct-2026)
  const dmy = s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,9})(?:[\s,]+(\d{2,4}))?$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = MONTH_MAP[dmy[2].toLowerCase()];
    let yr = dmy[3] ? Number(dmy[3]) : defaultYear;
    if (yr < 100) yr += 2000;
    if (month && day >= 1 && day <= 31) {
      return `${yr}-${month}-${String(day).padStart(2, "0")}`;
    }
  }

  // MMM DD, YYYY (Oct 02, 2026 or Oct 02)
  const mdy = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2})(?:,?\s+(\d{2,4}))?$/);
  if (mdy) {
    const month = MONTH_MAP[mdy[1].toLowerCase()];
    const day = Number(mdy[2]);
    let yr = mdy[3] ? Number(mdy[3]) : defaultYear;
    if (yr < 100) yr += 2000;
    if (month && day >= 1 && day <= 31) {
      return `${yr}-${month}-${String(day).padStart(2, "0")}`;
    }
  }

  return null;
}

export function classifyMerchantCategory(
  description: string,
  amount: number
): CategoryName {
  const d = description.toLowerCase();
  if (
    /(stripe|paypal|paddle|lemon\s*squeezy|polar|shopify.*payout|bacs.*settlement|client retainer|payout|settlement)/i.test(
      d
    ) &&
    amount > 0
  ) {
    return "Revenue & Payouts";
  }
  if (
    /(wire.*fee|service charge|account maintenance|plan fee|bank fee|fx conversion fee|overdraft|atm fee)/i.test(
      d
    )
  ) {
    return "Bank Fees";
  }
  if (
    /(gusto|rippling|payroll|deel|salary|contractor|wages|adp|justworks)/i.test(d)
  ) {
    return "Payroll & Contractors";
  }
  if (
    /(aws|amazon web services|hetzner|vercel|cloudflare|openai|anthropic|github|figma|linear|notion|slack|google workspace|heroku|digitalocean|supabase|datadog|sentry)/i.test(
      d
    )
  ) {
    return "SaaS & Cloud";
  }
  if (
    /(google ads|meta platforms|facebook ads|linkedin|tiktok ads|reddit ads|ads billing)/i.test(
      d
    )
  ) {
    return "Marketing & Ads";
  }
  if (
    /(airline|united|lufthansa|delta|trainline|uber|lyft|hotel|airbnb|coffee|sweetgreen|restaurant|cafe|flight|rail)/i.test(
      d
    )
  ) {
    return "Travel & Meals";
  }
  if (/(wise|revolut|sepa|transfer|ach|wire|treasury|fx)/i.test(d)) {
    return "Transfers & FX";
  }
  if (/(electric|internet|verizon|comcast|wework|regus|office|staples)/i.test(d)) {
    return "Utilities & Office";
  }
  return amount > 0 ? "Revenue & Payouts" : "Uncategorized";
}

function unescapePdfLiteral(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractLiteralsFromTjArray(arrayBody: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < arrayBody.length) {
    if (arrayBody[i] === "(") {
      let buf = "";
      i++;
      let depth = 1;
      while (i < arrayBody.length && depth > 0) {
        const ch = arrayBody[i];
        if (ch === "\\" && i + 1 < arrayBody.length) {
          buf += ch + arrayBody[i + 1];
          i += 2;
        } else if (ch === "(") {
          depth++;
          buf += ch;
          i++;
        } else if (ch === ")") {
          depth--;
          if (depth > 0) buf += ch;
          i++;
        } else {
          buf += ch;
          i++;
        }
      }
      parts.push(unescapePdfLiteral(buf));
    } else {
      i++;
    }
  }
  return parts.join("");
}

function extractPdfTextBlocks(content: string): string[] {
  const blocks: string[] = [];
  let inString = false;
  let parenDepth = 0;
  let blockStart = -1;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inString) {
      if (ch === "\\") {
        i++;
      } else if (ch === "(") {
        parenDepth++;
      } else if (ch === ")") {
        parenDepth--;
        if (parenDepth <= 0) {
          inString = false;
          parenDepth = 0;
        }
      }
      continue;
    }

    if (ch === "(") {
      inString = true;
      parenDepth = 1;
      continue;
    }

    const prevOk = i === 0 || /[\s\]/>]/.test(content[i - 1]);
    if (
      blockStart === -1 &&
      prevOk &&
      content[i] === "B" &&
      content[i + 1] === "T" &&
      (i + 2 >= content.length || /[\s/<([]/.test(content[i + 2]))
    ) {
      blockStart = i;
      i += 1;
      continue;
    }

    if (
      blockStart !== -1 &&
      prevOk &&
      content[i] === "E" &&
      content[i + 1] === "T" &&
      (i + 2 >= content.length || /[\s/<([]/.test(content[i + 2]))
    ) {
      blocks.push(content.slice(blockStart, i + 2));
      blockStart = -1;
      i += 1;
    }
  }

  return blocks;
}

/**
 * Deterministic native PDF text-stream coordinate extractor.
 * Works synchronously on uncompressed PDF streams (and browser fallback) without worker setup.
 */
export function extractPositionedTextFromPdfBytes(
  bytes: Uint8Array
): { items: PositionedTextItem[]; pageCount: number } {
  let latin1 = "";
  for (let i = 0; i < bytes.length; i++) {
    latin1 += String.fromCharCode(bytes[i]);
  }

  const items: PositionedTextItem[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let pageIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(latin1)) !== null) {
    const content = match[1];
    if (!content.includes("BT") || !content.includes("ET")) {
      continue;
    }
    pageIndex++;
    const btBlocks = extractPdfTextBlocks(content);
    for (const block of btBlocks) {
      let curX = 0;
      let curY = 0;
      let leading = 12;

      const tlMatch = block.match(/([-+]?\d*\.?\d+)\s+TL/);
      if (tlMatch) leading = Number.parseFloat(tlMatch[1]) || 12;

      const tmMatch = block.match(
        /([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+Tm/
      );
      if (tmMatch) {
        curX = Number.parseFloat(tmMatch[5]);
        curY = Number.parseFloat(tmMatch[6]);
      } else {
        const tdRegex = /([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+T[dD]/g;
        let td: RegExpExecArray | null;
        while ((td = tdRegex.exec(block)) !== null) {
          curX += Number.parseFloat(td[1]);
          curY += Number.parseFloat(td[2]);
        }
      }

      // Extract Tj or TJ text chunks cleanly
      const tjRegex = /\(((?:\\.|[^\\)])*)\)\s*Tj|\[([\s\S]*?)\]\s*TJ/g;
      let tj: RegExpExecArray | null;
      while ((tj = tjRegex.exec(block)) !== null) {
        const text =
          tj[1] !== undefined
            ? unescapePdfLiteral(tj[1])
            : extractLiteralsFromTjArray(tj[2] ?? "");
        const trimmed = text.trim();
        if (trimmed) {
          items.push({
            page: pageIndex,
            x: curX,
            y: curY,
            width: trimmed.length * 4.5,
            str: text,
          });
          curY -= leading;
        }
      }
    }
  }

  return { items, pageCount: Math.max(pageIndex, 1) };
}

interface VisualRow {
  page: number;
  y: number;
  items: PositionedTextItem[];
  text: string;
}

function groupItemsIntoVisualRows(items: PositionedTextItem[]): VisualRow[] {
  const byPage = new Map<number, PositionedTextItem[]>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    const arr = byPage.get(item.page) ?? [];
    arr.push(item);
    byPage.set(item.page, arr);
  }

  const rows: VisualRow[] = [];
  const pages = Array.from(byPage.keys()).sort((a, b) => a - b);

  for (const page of pages) {
    const pageItems = [...(byPage.get(page) ?? [])].sort((a, b) => {
      if (Math.abs(b.y - a.y) > 3.5) return b.y - a.y;
      return a.x - b.x;
    });

    const clusters: VisualRow[] = [];
    for (const item of pageItems) {
      const existing = clusters.find((c) => Math.abs(c.y - item.y) <= 3.5);
      if (existing) {
        existing.items.push(item);
        existing.y =
          existing.items.reduce((acc, it) => acc + it.y, 0) /
          existing.items.length;
      } else {
        clusters.push({ page, y: item.y, items: [item], text: "" });
      }
    }

    for (const c of clusters) {
      c.items.sort((a, b) => a.x - b.x);
      c.text = c.items.map((it) => it.str.trim()).join(" ").trim();
      rows.push(c);
    }
  }

  return rows;
}

function detectStatementMetadata(
  rows: VisualRow[],
  fileName: string,
  pageCount: number,
  parseMode: "pdfjs-browser" | "native-stream"
): {
  metadata: StatementMetadata;
  openingBalance: number | null;
  closingBalance: number | null;
  preferDayFirst: boolean;
  defaultYear: number;
} {
  const headerText = rows.slice(0, 6).map((r) => r.text).join("\n");
  const fullText = rows.slice(0, 25).map((r) => r.text).join("\n");
  const headerLower = headerText.toLowerCase();
  const lower = fullText.toLowerCase();

  let bankDetected = "Bank Statement PDF";
  let routingNumber = "021000021";
  const bankPatterns: [RegExp, string, string][] = [
    [/chase|jpmorgan/i, "Chase Bank", "021000021"],
    [/wise|transferwise/i, "Wise Business", "026073150"],
    [/mercury/i, "Mercury", "021000021"],
    [/revolut/i, "Revolut Business", "021000021"],
    [/bank of america/i, "Bank of America", "026009593"],
    [/wells fargo/i, "Wells Fargo", "121000248"],
    [/citibank|citi\b/i, "Citibank", "021000089"],
    [/barclays/i, "Barclays", "021000021"],
    [/hsbc/i, "HSBC", "021001088"],
    [/monzo/i, "Monzo", "021000021"],
    [/lloyds/i, "Lloyds Bank", "021000021"],
    [/santander/i, "Santander", "231372691"],
    [/stripe/i, "Stripe", "021000021"],
    [/payoneer/i, "Payoneer", "026073150"],
    [/paypal/i, "PayPal", "021000021"],
    [/brex/i, "Brex", "021000021"],
    [/ramp/i, "Ramp", "021000021"],
    [/td bank/i, "TD Bank", "031101266"],
    [/royal bank|rbc/i, "RBC Royal Bank", "021000021"],
    [/american express|\bamex\b/i, "American Express", "124085066"],
    [/capital one/i, "Capital One", "051405515"],
    [/ing\b/i, "ING", "021000021"],
    [/n26/i, "N26", "021000021"],
  ];
  let matchedHeader = false;
  for (const [rx, label, routing] of bankPatterns) {
    if (rx.test(headerLower)) {
      bankDetected = label;
      routingNumber = routing;
      matchedHeader = true;
      break;
    }
  }
  if (!matchedHeader) {
    for (const [rx, label, routing] of bankPatterns) {
      if (rx.test(lower)) {
        bankDetected = label;
        routingNumber = routing;
        break;
      }
    }
  }

  let accountType: AccountType = "CHECKING";
  if (
    /\b(credit\s*card|minimum\s*payment|credit\s*limit|new\s*charges|cash\s*advance|billing\s*cycle|statement\s*balance)\b/i.test(
      `${fullText} ${fileName}`
    )
  ) {
    accountType = "CREDITCARD";
  } else if (/\b(savings\s*account|high[- ]yield\s*savings|money\s*market)\b/i.test(fullText)) {
    accountType = "SAVINGS";
  }

  let currency = "USD";
  if (/\bEUR\b|€/.test(fullText)) currency = "EUR";
  else if (/\bGBP\b|£/.test(fullText)) currency = "GBP";
  else if (/\bCAD\b/.test(fullText)) currency = "CAD";
  else if (/\bAUD\b/.test(fullText)) currency = "AUD";

  const acctMatch = fullText.match(/(?:Account(?:\s*(?:Number|No\.?|Ending))?|IBAN)\s*[:#]?\s*[*A-Z0-9\s-]*(\d{4})\b/i);
  const accountLast4 = acctMatch ? acctMatch[1] : "0000";

  const yearMatch = fullText.match(/\b(202[0-9])\b/);
  const defaultYear = yearMatch ? Number(yearMatch[1]) : 2026;

  const preferDayFirst =
    currency === "EUR" ||
    currency === "GBP" ||
    /\b(Wise|Revolut|Barclays|Monzo|Lloyds|HSBC|ING|N26)\b/i.test(bankDetected) ||
    /\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i.test(fullText);

  let openingBalance: number | null = null;
  let closingBalance: number | null = null;

  for (const row of rows) {
    const t = row.text;
    const openMatch = t.match(
      /(?:(?:Opening|Beginning|Starting|Previous|Prior)\s+Balance|Balance\s+(?:Forward|Brought\s+Forward))\s*[:\s]+([()\-+$€£\d.,]+(?:\s*(?:CR|DR|USD|EUR|GBP))?)/i
    );
    if (openMatch && openingBalance === null) {
      openingBalance = parseLocalizedNumber(openMatch[1]);
    }
    const closeMatch = t.match(
      /(?:(?:Closing|Ending|New|Current|Final|Total\s+New)\s+Balance|Balance\s+Carried\s+Forward)\s*[:\s]+([()\-+$€£\d.,]+(?:\s*(?:CR|DR|USD|EUR|GBP))?)/i
    );
    if (closeMatch) {
      closingBalance = parseLocalizedNumber(closeMatch[1]);
    }
  }

  return {
    metadata: {
      fileName,
      bankDetected,
      currency,
      pageCount,
      accountLast4,
      accountType,
      routingNumber,
      periodStart: null,
      periodEnd: null,
      parseMode,
    },
    openingBalance,
    closingBalance,
    preferDayFirst,
    defaultYear,
  };
}

interface ColumnLayout {
  headerIndex: number;
  dateMaxX: number;
  descMinX: number;
  descMaxX: number;
  debitX: number | null;
  creditX: number | null;
  amountX: number | null;
  balanceX: number | null;
}

function detectColumnLayout(rows: VisualRow[]): ColumnLayout | null {
  for (let i = 0; i < rows.length; i++) {
    const items = rows[i].items;
    const labels = items.map((it) => it.str.trim().toLowerCase());
    const hasDate = labels.some((l) => /^date|posted|value date/.test(l));
    const hasMoneyCol = labels.some((l) =>
      /(amount|debit|credit|money out|money in|withdrawal|deposit|paid out|paid in|balance)/.test(l)
    );
    if (!hasDate || !hasMoneyCol) continue;

    let dateX = 40;
    let descX = 110;
    let debitX: number | null = null;
    let creditX: number | null = null;
    let amountX: number | null = null;
    let balanceX: number | null = null;

    for (const it of items) {
      const l = it.str.trim().toLowerCase();
      if (/^date|posted/.test(l)) dateX = it.x;
      else if (/description|details|particulars|merchant|narrative/.test(l)) descX = it.x;
      else if (/debit|money out|withdrawal|paid out|spent/.test(l)) debitX = it.x;
      else if (/credit|money in|deposit|paid in|received/.test(l)) creditX = it.x;
      else if (/^amount/.test(l)) amountX = it.x;
      else if (/balance/.test(l)) balanceX = it.x;
    }

    const numericXs = [debitX, creditX, amountX, balanceX]
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    const firstNumX = numericXs.length > 0 ? numericXs[0] : 360;

    return {
      headerIndex: i,
      dateMaxX: Math.max(dateX + 55, descX - 6),
      descMinX: descX - 10,
      descMaxX: firstNumX - 14,
      debitX,
      creditX,
      amountX,
      balanceX,
    };
  }
  return null;
}

function isIgnorableNoiseLine(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower) return true;
  if (/^page\s+\d+(\s+of\s+\d+)?$/.test(lower)) return true;
  if (/^(opening|beginning|closing|ending|previous)\s+balance\b/.test(lower)) return true;
  if (/^(date|description|details|debit|credit|amount|balance|\s)+$/i.test(lower)) return true;
  if (/^(statement period|account number|iban|sort code|continued on next page)/i.test(lower)) return true;
  return false;
}

function nearestColumnKind(
  x: number,
  layout: ColumnLayout | null
): "debit" | "credit" | "amount" | "balance" | null {
  if (!layout) return null;
  const candidates: { kind: "debit" | "credit" | "amount" | "balance"; dist: number }[] = [];
  if (layout.debitX !== null) candidates.push({ kind: "debit", dist: Math.abs(x - layout.debitX) });
  if (layout.creditX !== null) candidates.push({ kind: "credit", dist: Math.abs(x - layout.creditX) });
  if (layout.amountX !== null) candidates.push({ kind: "amount", dist: Math.abs(x - layout.amountX) });
  if (layout.balanceX !== null) candidates.push({ kind: "balance", dist: Math.abs(x - layout.balanceX) });
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0]?.kind ?? null;
}

export function reconcileTransactions(
  rows: TransactionRow[],
  explicitOpeningBalance: number | null,
  explicitClosingBalance: number | null
): { transactions: TransactionRow[]; reconciliation: ReconciliationReport } {
  const cloned = rows.map((r) => ({ ...r, isDuplicate: false }));
  let inferredSigns = 0;

  // Determine opening balance in cents
  let openingCents: number | null =
    explicitOpeningBalance !== null ? toCents(explicitOpeningBalance) : null;
  if (openingCents === null && cloned.length > 0 && cloned[0].balance !== null) {
    openingCents = toCents(cloned[0].balance) - toCents(cloned[0].amount);
  }

  let runningCents = openingCents;
  let totalCreditCents = 0;
  let totalDebitCents = 0;
  let matchedRows = 0;
  const mismatchRowIds: string[] = [];
  let stitchedLineCount = 0;

  for (const row of cloned) {
    stitchedLineCount += row.stitchedLines;
    let amtCents = toCents(row.amount);

    // If amount sign was unsigned positive but balance dropped by that exact amount, infer debit sign automatically
    if (
      runningCents !== null &&
      row.balance !== null &&
      row.debit === null &&
      row.credit === null &&
      amtCents > 0
    ) {
      const actualBalCents = toCents(row.balance);
      if (
        Math.abs(runningCents - amtCents - actualBalCents) <= 1 &&
        Math.abs(runningCents + amtCents - actualBalCents) > 1
      ) {
        amtCents = -amtCents;
        row.amount = fromCents(amtCents);
        inferredSigns++;
      }
    }

    if (amtCents < 0) {
      row.debit = fromCents(Math.abs(amtCents));
      row.credit = null;
      totalDebitCents += Math.abs(amtCents);
    } else if (amtCents > 0) {
      row.credit = fromCents(amtCents);
      row.debit = null;
      totalCreditCents += amtCents;
    } else {
      row.debit = null;
      row.credit = null;
    }

    if (runningCents !== null) {
      runningCents += amtCents;
      if (row.balance !== null) {
        const expectedDiff = Math.abs(runningCents - toCents(row.balance));
        row.discrepancyCents = expectedDiff;
        if (expectedDiff <= 1) {
          row.balanceStatus = "matched";
          matchedRows++;
        } else {
          row.balanceStatus = "mismatch";
          mismatchRowIds.push(row.id);
        }
      } else {
        row.balance = fromCents(runningCents);
        row.balanceStatus = "matched";
        row.discrepancyCents = 0;
        matchedRows++;
      }
    } else {
      row.balanceStatus = "unverified";
      row.discrepancyCents = 0;
    }
  }

  const lastRowBalanceCents =
    cloned.length > 0 && cloned[cloned.length - 1].balance !== null
      ? toCents(cloned[cloned.length - 1].balance as number)
      : null;
  const closingCents =
    explicitClosingBalance !== null
      ? toCents(explicitClosingBalance)
      : lastRowBalanceCents;

  const calculatedClosingCents =
    openingCents !== null ? openingCents + totalCreditCents - totalDebitCents : null;

  const discrepancyCents =
    closingCents !== null && calculatedClosingCents !== null
      ? Math.abs(closingCents - calculatedClosingCents)
      : 0;

  let duplicateRows = 0;
  const seenFingerprints = new Map<
    string,
    { sourceFile: string; balanceCents: number | null }
  >();
  for (const row of cloned) {
    const normDesc = row.description
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 48);
    const key = `${row.date}|${toCents(row.amount)}|${normDesc}`;
    const balCents = row.balance !== null ? toCents(row.balance) : null;
    const prev = seenFingerprints.get(key);
    if (
      prev &&
      (prev.sourceFile !== row.sourceFile ||
        (balCents !== null && prev.balanceCents !== null && balCents === prev.balanceCents))
    ) {
      row.isDuplicate = true;
      duplicateRows++;
    } else if (!prev) {
      seenFingerprints.set(key, {
        sourceFile: row.sourceFile,
        balanceCents: balCents,
      });
    }
  }

  const isFullyReconciled =
    cloned.length > 0 &&
    mismatchRowIds.length === 0 &&
    discrepancyCents <= 1 &&
    calculatedClosingCents !== null;

  return {
    transactions: cloned,
    reconciliation: {
      openingBalance: openingCents !== null ? fromCents(openingCents) : null,
      closingBalance: closingCents !== null ? fromCents(closingCents) : null,
      calculatedClosingBalance:
        calculatedClosingCents !== null ? fromCents(calculatedClosingCents) : null,
      totalCredits: fromCents(totalCreditCents),
      totalDebits: fromCents(totalDebitCents),
      netChange: fromCents(totalCreditCents - totalDebitCents),
      matchedRows,
      mismatchRows: mismatchRowIds.length,
      mismatchRowIds,
      stitchedLineCount,
      inferredSigns,
      duplicateRows,
      isFullyReconciled,
      discrepancy: fromCents(discrepancyCents),
    },
  };
}

const LEADING_DATE_REGEX =
  /^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{2,4})?|\d{1,2}[\s-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:[\s,]+\d{2,4})?)\s+(.+)$/i;

function detectSectionSign(text: string): "credit" | "debit" | null {
  const clean = text.trim().toLowerCase();
  if (
    /\b(deposits?\s+and\s+additions?|electronic\s+deposits?|credits?\s+and\s+additions?|payments?\s+and\s+(?:other\s+)?credits?|money\s+in)\b/i.test(
      clean
    )
  ) {
    return "credit";
  }
  if (
    /\b(withdrawals?\s+and\s+(?:other\s+)?subtractions?|atm\s*&?\s*debit\s+card\s+withdrawals?|electronic\s+withdrawals?|checks?\s+paid|other\s+subtractions?|service\s+fees?|purchases?\s+and\s+adjustments?|new\s+charges?|card\s+transactions?|money\s+out)\b/i.test(
      clean
    )
  ) {
    return "debit";
  }
  return null;
}

function splitMergedNumericItem(item: PositionedTextItem): PositionedTextItem[] {
  const parts = item.str
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length <= 1) return [item];
  // Check if all parts look like localized money tokens (optionally ignoring trailing CR/DR absorbed earlier)
  const moneyTokens: string[] = [];
  for (let idx = 0; idx < parts.length; idx++) {
    const p = parts[idx];
    const next = parts[idx + 1];
    if (next && /^(CR|DR)$/i.test(next)) {
      moneyTokens.push(`${p} ${next}`);
      idx++;
    } else {
      moneyTokens.push(p);
    }
  }
  if (moneyTokens.length > 1 && moneyTokens.every((tok) => parseLocalizedNumber(tok) !== null)) {
    const step = Math.max(item.width / moneyTokens.length, 48);
    return moneyTokens.map((tok, i) => ({
      page: item.page,
      x: item.x + i * step,
      y: item.y,
      width: step - 4,
      str: tok,
    }));
  }
  return [item];
}

function normalizeRowItemsForExtraction(
  row: VisualRow,
  layout: ColumnLayout | null,
  defaultYear: number,
  preferDayFirst: boolean
): { foundDate: string | null; dateItemIdx: number; items: PositionedTextItem[] } {
  const expandedItems: PositionedTextItem[] = [];
  for (const it of row.items) {
    const isDesc = layout && it.x >= layout.descMinX && it.x <= layout.descMaxX;
    if (!isDesc) {
      expandedItems.push(...splitMergedNumericItem(it));
    } else {
      expandedItems.push(it);
    }
  }

  for (let k = 0; k < Math.min(expandedItems.length, 2); k++) {
    const item = expandedItems[k];
    if (layout && item.x > layout.dateMaxX + 20) continue;
    const d = normalizeDateString(item.str, defaultYear, preferDayFirst);
    if (d) {
      return { foundDate: d, dateItemIdx: k, items: expandedItems };
    }
  }

  // Handle dates split across adjacent PDF.js spans (e.g. "Oct", "15,", "2026")
  if (expandedItems.length >= 2) {
    for (const spanLen of [3, 2]) {
      if (expandedItems.length < spanLen) continue;
      if (layout && expandedItems[0].x > layout.dateMaxX + 25) continue;
      const joined = expandedItems
        .slice(0, spanLen)
        .map((it) => it.str.trim())
        .join(" ");
      const d = normalizeDateString(joined, defaultYear, preferDayFirst);
      if (d) {
        const mergedDateItem: PositionedTextItem = {
          page: expandedItems[0].page,
          x: expandedItems[0].x,
          y: expandedItems[0].y,
          width: 55,
          str: joined,
        };
        return {
          foundDate: d,
          dateItemIdx: 0,
          items: [mergedDateItem, ...expandedItems.slice(spanLen)],
        };
      }
    }
  }

  // Handle single text run merging date + description (e.g. "10/15/2026 STRIPE PAYOUT")
  if (expandedItems.length >= 1) {
    const first = expandedItems[0];
    if (!layout || first.x <= layout.dateMaxX + 45) {
      const m = first.str.trim().match(LEADING_DATE_REGEX);
      if (m) {
        const d = normalizeDateString(m[1], defaultYear, preferDayFirst);
        if (d) {
          const dateItem: PositionedTextItem = {
            page: first.page,
            x: first.x,
            y: first.y,
            width: 48,
            str: m[1],
          };
          const descItem: PositionedTextItem = {
            page: first.page,
            x: Math.max(first.x + 56, layout?.descMinX ?? first.x + 56),
            y: first.y,
            width: Math.max(first.width - 56, m[2].length * 4.5),
            str: m[2].trim(),
          };
          return {
            foundDate: d,
            dateItemIdx: 0,
            items: [dateItem, descItem, ...expandedItems.slice(1)],
          };
        }
      }
    }
  }

  return { foundDate: null, dateItemIdx: -1, items: expandedItems };
}

export function buildParseResultFromTextItems(
  items: PositionedTextItem[],
  fileName: string,
  pageCount: number,
  parseMode: "pdfjs-browser" | "native-stream",
  isSample = false
): ParseResult {
  const rows = groupItemsIntoVisualRows(items);
  const {
    metadata,
    openingBalance,
    closingBalance,
    preferDayFirst,
    defaultYear,
  } = detectStatementMetadata(rows, fileName, pageCount, parseMode);

  const layout = detectColumnLayout(rows);
  const startIndex = layout ? layout.headerIndex + 1 : 0;
  const warnings: string[] = [];
  const rawTxns: TransactionRow[] = [];
  let currentSectionSign: "credit" | "debit" | null = null;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const sectionHint = detectSectionSign(row.text);
    if (sectionHint) {
      currentSectionSign = sectionHint;
      continue;
    }
    if (isIgnorableNoiseLine(row.text)) continue;

    const { foundDate, dateItemIdx, items: rowItems } = normalizeRowItemsForExtraction(
      row,
      layout,
      defaultYear,
      preferDayFirst
    );

    if (foundDate) {
      const descParts: string[] = [];
      let debit: number | null = null;
      let credit: number | null = null;
      let explicitAmount: number | null = null;
      let balance: number | null = null;
      const fallbackNums: number[] = [];

      for (let k = 0; k < rowItems.length; k++) {
        if (k === dateItemIdx) continue;
        const it = rowItems[k];
        const token = it.str.trim();
        if (!token) continue;

        const isDescZone = layout
          ? it.x >= layout.descMinX && it.x <= layout.descMaxX
          : false;
        const parsedNum = !isDescZone ? parseLocalizedNumber(token) : null;

        if (parsedNum !== null && (!layout || it.x > layout.descMaxX)) {
          const kind = nearestColumnKind(it.x, layout);
          if (kind === "debit") {
            if (debit === null) debit = Math.abs(parsedNum);
            else if (balance === null) balance = parsedNum;
          } else if (kind === "credit") {
            if (credit === null) credit = Math.abs(parsedNum);
            else if (balance === null) balance = parsedNum;
          } else if (kind === "amount") {
            if (explicitAmount === null) explicitAmount = parsedNum;
            else if (balance === null) balance = parsedNum;
          } else if (kind === "balance") {
            balance = parsedNum;
          } else {
            fallbackNums.push(parsedNum);
          }
        } else {
          descParts.push(token);
        }
      }

      if (fallbackNums.length > 0 && explicitAmount === null && debit === null && credit === null) {
        if (fallbackNums.length === 1) {
          explicitAmount = fallbackNums[0];
        } else if (fallbackNums.length === 2) {
          explicitAmount = fallbackNums[0];
          balance = balance ?? fallbackNums[1];
        } else {
          debit = Math.abs(fallbackNums[0]);
          credit = Math.abs(fallbackNums[1]);
          balance = balance ?? fallbackNums[2];
        }
      } else if (fallbackNums.length > 0 && balance === null) {
        balance = fallbackNums[fallbackNums.length - 1];
      }

      let amount = 0;
      if (debit !== null || credit !== null) {
        const dCents = debit !== null ? toCents(Math.abs(debit)) : 0;
        const cCents = credit !== null ? toCents(Math.abs(credit)) : 0;
        amount = fromCents(cCents - dCents);
      } else if (explicitAmount !== null) {
        if (currentSectionSign === "debit" && explicitAmount > 0) {
          amount = -Math.abs(explicitAmount);
          debit = Math.abs(explicitAmount);
        } else {
          amount = explicitAmount;
        }
      }

      const description = descParts.join(" ").trim() || "Uncategorized Transaction";

      rawTxns.push({
        id: `tx-${fileName}-${rawTxns.length + 1}`,
        sourceFile: fileName,
        page: row.page,
        date: foundDate,
        description,
        debit: debit !== null ? Math.abs(debit) : null,
        credit: credit !== null ? Math.abs(credit) : null,
        amount,
        balance,
        category: classifyMerchantCategory(description, amount),
        stitchedLines: 0,
        balanceStatus: "unverified",
        discrepancyCents: 0,
      });
    } else if (rawTxns.length > 0) {
      // Multi-line description stitching
      const prev = rawTxns[rawTxns.length - 1];
      const hasNumericCols = rowItems.some(
        (it) => layout && it.x > layout.descMaxX && parseLocalizedNumber(it.str) !== null
      );
      if (!hasNumericCols && row.text.length <= 120) {
        prev.description = `${prev.description} ${row.text}`.replace(/\s+/g, " ").trim();
        prev.stitchedLines += 1;
        prev.category = classifyMerchantCategory(prev.description, prev.amount);
      }
    }
  }

  if (rawTxns.length === 0) {
    warnings.push(
      "No tabular transaction rows could be parsed cleanly from text coordinates. Check if this PDF is a scanned bitmap image without embedded text."
    );
  } else {
    metadata.periodStart = rawTxns[0].date;
    metadata.periodEnd = rawTxns[rawTxns.length - 1].date;
  }

  const { transactions, reconciliation } = reconcileTransactions(
    rawTxns,
    openingBalance,
    closingBalance
  );

  return {
    metadata,
    transactions,
    reconciliation,
    warnings,
    isSample,
  };
}

export function parsePdfBytesDeterministic(
  bytes: Uint8Array,
  fileName: string,
  isSample = false
): ParseResult {
  const { items, pageCount } = extractPositionedTextFromPdfBytes(bytes);
  return buildParseResultFromTextItems(
    items,
    fileName,
    pageCount,
    "native-stream",
    isSample
  );
}

export function loadSamplePreset(presetId: SamplePresetId): ParseResult {
  const preset = BANK_PRESETS[presetId];
  const pdfBytes = generateSampleStatementPdf(presetId);
  const parsed = parsePdfBytesDeterministic(pdfBytes, preset.sampleFileName, true);
  parsed.metadata.bankDetected = preset.bankName;
  parsed.metadata.currency = preset.currency;
  parsed.metadata.accountLast4 = preset.accountLast4;
  return parsed;
}

/**
 * Browser client parser: tries full pdfjs-dist extraction first (handles compressed streams & CMap fonts),
 * and seamlessly falls back to native-stream coordinate extraction if worker fails.
 */
export async function parsePdfFileInBrowser(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  try {
    const pdfjs = await import("pdfjs-dist");
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }
    const loadingTask = pdfjs.getDocument({ data: bytes.slice() });
    const pdfDoc = await loadingTask.promise;
    const allItems: PositionedTextItem[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();
      for (const rawItem of content.items) {
        if ("str" in rawItem && rawItem.str.trim()) {
          const transform = rawItem.transform as number[];
          allItems.push({
            page: pageNum,
            x: transform[4] ?? 0,
            y: transform[5] ?? 0,
            width: rawItem.width ?? rawItem.str.length * 4.5,
            str: rawItem.str,
          });
        }
      }
    }

    if (allItems.length > 0) {
      return buildParseResultFromTextItems(
        allItems,
        file.name,
        pdfDoc.numPages,
        "pdfjs-browser",
        false
      );
    }
  } catch {
    // Fallback to deterministic uncompressed stream extractor
  }

  return parsePdfBytesDeterministic(bytes, file.name, false);
}

function splitCsvFields(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "," || ch === "\t" || ch === ";") && !inQuotes && (ch !== ";" || !line.includes(","))) {
      fields.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

/**
 * Parse raw OCR / copy-pasted bank statement text or CSV/TSV text into a reconciled ParseResult.
 */
export function parseRawStatementText(
  rawText: string,
  fileName = "pasted-statement.txt"
): ParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  const items: PositionedTextItem[] = [];
  const rowsPerPage = 45;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const page = Math.floor(i / rowsPerPage) + 1;
    const y = 760 - (i % rowsPerPage) * 14;

    // Detect delimiter-separated CSV/TSV vs whitespace-delimited statement OCR
    const isDelimited =
      line.includes("\t") ||
      (line.includes(",") && splitCsvFields(line).length >= 3);

    if (isDelimited) {
      const cells = splitCsvFields(line);
      let cursorX = 40;
      for (let c = 0; c < cells.length; c++) {
        const val = cells[c];
        if (val) {
          items.push({
            page,
            x: cursorX,
            y,
            width: Math.max(val.length * 4.5, 40),
            str: val,
          });
        }
        cursorX += c === 1 ? 220 : 90;
      }
      continue;
    }

    // Break OCR line at 2+ spaces or right-hand numeric clusters while preserving wrapped descriptions
    const segments = line.split(/\s{2,}/).filter(Boolean);
    if (segments.length >= 2) {
      let cursorX = 40;
      for (let s = 0; s < segments.length; s++) {
        const seg = segments[s];
        const isTrailingNum = s >= 1 && parseLocalizedNumber(seg) !== null;
        const colX = isTrailingNum ? 360 + (s - Math.max(segments.length - 2, 1)) * 85 : cursorX;
        items.push({
          page,
          x: colX,
          y,
          width: Math.max(seg.length * 4.5, 40),
          str: seg,
        });
        cursorX += s === 0 ? 80 : 180;
      }
    } else {
      // Single whitespace stream: peel trailing numbers off the right edge cleanly
      const tokens = line.split(/\s+/);
      const trailingNums: string[] = [];
      let endIdx = tokens.length;
      while (endIdx > 1) {
        const tok = tokens[endIdx - 1];
        if (parseLocalizedNumber(tok) !== null) {
          trailingNums.unshift(tok);
          endIdx--;
          if (trailingNums.length >= 3) break;
        } else {
          break;
        }
      }
      const leftText = tokens.slice(0, endIdx).join(" ");
      if (leftText) {
        items.push({
          page,
          x: 40,
          y,
          width: Math.max(leftText.length * 4.5, 120),
          str: leftText,
        });
      }
      for (let n = 0; n < trailingNums.length; n++) {
        items.push({
          page,
          x: 360 + n * 85,
          y,
          width: 60,
          str: trailingNums[n],
        });
      }
    }
  }

  return buildParseResultFromTextItems(
    items,
    fileName,
    Math.max(Math.ceil(lines.length / rowsPerPage), 1),
    "native-stream",
    false
  );
}
