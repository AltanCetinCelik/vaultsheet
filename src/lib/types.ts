export type SamplePresetId = "chase" | "wise" | "mercury" | "revolut";

export type AccountType = "CHECKING" | "SAVINGS" | "CREDITCARD";

export type CategoryName =
  | "SaaS & Cloud"
  | "Payroll & Contractors"
  | "Transfers & FX"
  | "Revenue & Payouts"
  | "Marketing & Ads"
  | "Travel & Meals"
  | "Bank Fees"
  | "Utilities & Office"
  | "Uncategorized";

export type ExportFormat =
  | "xlsx"
  | "csv"
  | "quickbooks_csv"
  | "quickbooks_3col_csv"
  | "xero_csv"
  | "qbo"
  | "ofx"
  | "json";

export interface PositionedTextItem {
  page: number;
  x: number;
  y: number;
  width: number;
  str: string;
}

export interface TransactionRow {
  id: string;
  sourceFile: string;
  page: number;
  date: string;
  description: string;
  debit: number | null;
  credit: number | null;
  amount: number;
  balance: number | null;
  category: CategoryName;
  stitchedLines: number;
  balanceStatus: "matched" | "mismatch" | "unverified";
  discrepancyCents: number;
  isDuplicate?: boolean;
}

export interface ReconciliationReport {
  openingBalance: number | null;
  closingBalance: number | null;
  calculatedClosingBalance: number | null;
  totalCredits: number;
  totalDebits: number;
  netChange: number;
  matchedRows: number;
  mismatchRows: number;
  mismatchRowIds: string[];
  stitchedLineCount: number;
  inferredSigns: number;
  duplicateRows: number;
  isFullyReconciled: boolean;
  discrepancy: number;
}

export interface StatementMetadata {
  fileName: string;
  bankDetected: string;
  currency: string;
  pageCount: number;
  accountLast4: string;
  accountType: AccountType;
  routingNumber: string;
  periodStart: string | null;
  periodEnd: string | null;
  parseMode: "pdfjs-browser" | "native-stream";
}

export interface ParseResult {
  metadata: StatementMetadata;
  transactions: TransactionRow[];
  reconciliation: ReconciliationReport;
  warnings: string[];
  isSample?: boolean;
}

export interface BankPresetMeta {
  id: SamplePresetId;
  label: string;
  bankName: string;
  currency: string;
  accountLast4: string;
  dateHint: string;
  sampleFileName: string;
  summary: string;
}

export interface SeoBankEntry {
  slug: string;
  bankName: string;
  shortName: string;
  region: "US" | "UK" | "EU" | "Canada" | "Australia" | "Global" | "Format";
  currency: string;
  dateFormat: string;
  columnLayout: string;
  samplePreset: SamplePresetId;
  title: string;
  metaDescription: string;
  keywords: string[];
  painPoints: string[];
  faqs: { question: string; answer: string }[];
}
