import * as XLSX from "xlsx";
import type { CategoryName, ExportFormat, ParseResult, TransactionRow } from "./types";

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  // Mitigate spreadsheet formula injection for string values starting with = + @ (keep negative numeric literals clean)
  if (typeof value === "string" && /^[=+@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toUsSlashDate(isoDate: string): string {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : isoDate;
}

function toUkSlashDate(isoDate: string): string {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : isoDate;
}

function toOfxDate(isoDate: string): string {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}${m[2]}${m[3]}120000` : "20261001120000";
}

function escapeXmlSgml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim();
}

function deterministicFitId(row: TransactionRow, index: number): string {
  const seed = `${row.date}|${row.amount.toFixed(2)}|${row.description}|${index}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return `VS${row.date.replace(/-/g, "")}${hex}${String(index + 1).padStart(4, "0")}`;
}

export function exportToCsv(
  result: ParseResult,
  mode: "standard" | "quickbooks" | "quickbooks_3col" | "xero" = "standard"
): string {
  const lines: string[] = [];

  if (mode === "quickbooks") {
    lines.push("Date,Description,Credit,Debit");
    for (const r of result.transactions) {
      lines.push(
        [
          escapeCsvCell(toUsSlashDate(r.date)),
          escapeCsvCell(r.description),
          escapeCsvCell(r.credit !== null ? r.credit.toFixed(2) : ""),
          escapeCsvCell(r.debit !== null ? r.debit.toFixed(2) : ""),
        ].join(",")
      );
    }
  } else if (mode === "quickbooks_3col") {
    lines.push("Date,Description,Amount");
    for (const r of result.transactions) {
      lines.push(
        [
          escapeCsvCell(toUsSlashDate(r.date)),
          escapeCsvCell(r.description),
          escapeCsvCell(r.amount.toFixed(2)),
        ].join(",")
      );
    }
  } else if (mode === "xero") {
    lines.push("*Date,*Amount,Payee,Description,Reference");
    for (const r of result.transactions) {
      const payee = r.description.split(/\s+/).slice(0, 3).join(" ");
      lines.push(
        [
          escapeCsvCell(toUkSlashDate(r.date)),
          escapeCsvCell(r.amount.toFixed(2)),
          escapeCsvCell(payee),
          escapeCsvCell(r.description),
          escapeCsvCell(r.id),
        ].join(",")
      );
    }
  } else {
    lines.push("Date,Description,Category,Debit,Credit,Amount,Balance,AuditStatus,SourceFile");
    for (const r of result.transactions) {
      lines.push(
        [
          escapeCsvCell(r.date),
          escapeCsvCell(r.description),
          escapeCsvCell(r.category),
          escapeCsvCell(r.debit !== null ? r.debit.toFixed(2) : ""),
          escapeCsvCell(r.credit !== null ? r.credit.toFixed(2) : ""),
          escapeCsvCell(r.amount.toFixed(2)),
          escapeCsvCell(r.balance !== null ? r.balance.toFixed(2) : ""),
          escapeCsvCell(r.balanceStatus),
          escapeCsvCell(r.sourceFile),
        ].join(",")
      );
    }
  }

  return "\uFEFF" + lines.join("\r\n");
}

function getIntuitBid(bankDetected: string): string {
  const b = bankDetected.toLowerCase();
  if (b.includes("chase")) return "10898";
  if (b.includes("bank of america")) return "14590";
  if (b.includes("wells fargo")) return "03000";
  if (b.includes("citi")) return "24909";
  return "2430";
}

export function exportToQboOrOfx(
  result: ParseResult,
  format: "qbo" | "ofx"
): string {
  const { metadata, transactions, reconciliation } = result;
  const startDate =
    transactions.length > 0 ? toOfxDate(transactions[0].date) : "20261001120000";
  const endDate =
    transactions.length > 0
      ? toOfxDate(transactions[transactions.length - 1].date)
      : "20261031120000";
  const closingAmt = (
    reconciliation.closingBalance ??
    reconciliation.calculatedClosingBalance ??
    0
  ).toFixed(2);

  const trnBlocks = transactions
    .map((tx, idx) => {
      const trnType = tx.amount >= 0 ? "CREDIT" : "DEBIT";
      const safeName = escapeXmlSgml(tx.description).slice(0, 32);
      const safeMemo = escapeXmlSgml(tx.description).slice(0, 255);
      const fitId = deterministicFitId(tx, idx);
      return [
        "<STMTTRN>",
        `<TRNTYPE>${trnType}`,
        `<DTPOSTED>${toOfxDate(tx.date)}`,
        `<TRNAMT>${tx.amount.toFixed(2)}`,
        `<FITID>${fitId}`,
        `<NAME>${safeName}`,
        `<MEMO>${safeMemo}`,
        "</STMTTRN>",
      ].join("\n");
    })
    .join("\n");

  const intuBid =
    format === "qbo"
      ? `\n<INTU.BID>${getIntuitBid(metadata.bankDetected)}\n<INTU.USERID>VAULTSHEET`
      : "";
  const bankId =
    (metadata.routingNumber || "021000021").replace(/\D/g, "").padStart(9, "0").slice(0, 9) ||
    "021000021";
  const acctId = metadata.accountLast4 || "0000";
  const acctType = metadata.accountType === "SAVINGS" ? "SAVINGS" : "CHECKING";

  const header = [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "VERSION:102",
    "SECURITY:NONE",
    "ENCODING:UTF-8",
    "CHARSET:NONE",
    "COMPRESSION:NONE",
    "OLDFILEUID:NONE",
    "NEWFILEUID:NONE",
    "",
  ].join("\n");

  const statementSet =
    metadata.accountType === "CREDITCARD"
      ? `<CREDITCARDMSGSRSV1>
<CCSTMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<CCSTMTRS>
<CURDEF>${metadata.currency || "USD"}
<CCACCTFROM>
<ACCTID>${acctId}
</CCACCTFROM>
<BANKTRANLIST>
<DTSTART>${startDate}
<DTEND>${endDate}
${trnBlocks}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>${closingAmt}
<DTASOF>${endDate}
</LEDGERBAL>
</CCSTMTRS>
</CCSTMTTRNRS>
</CREDITCARDMSGSRSV1>`
      : `<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>${metadata.currency || "USD"}
<BANKACCTFROM>
<BANKID>${bankId}
<ACCTID>${acctId}
<ACCTTYPE>${acctType}
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${startDate}
<DTEND>${endDate}
${trnBlocks}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>${closingAmt}
<DTASOF>${endDate}
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>`;

  const body = `<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>${endDate}
<LANGUAGE>ENG${intuBid}
</SONRS>
</SIGNONMSGSRSV1>
${statementSet}
</OFX>
`;

  return header + body;
}

export function exportToExcelBytes(result: ParseResult): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Transactions
  const txRows = result.transactions.map((r) => ({
    Date: r.date,
    Description: r.description,
    Category: r.category,
    Debit: r.debit ?? "",
    Credit: r.credit ?? "",
    Amount: r.amount,
    "Running Balance": r.balance ?? "",
    "Audit Status": r.balanceStatus.toUpperCase(),
    "Source File": r.sourceFile,
    Page: r.page,
  }));
  const wsTx = XLSX.utils.json_to_sheet(txRows);
  wsTx["!cols"] = [
    { wch: 12 },
    { wch: 48 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 28 },
    { wch: 6 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTx, "Transactions");

  // Sheet 2: Executive Summary
  const categoryTotals = new Map<CategoryName, { credits: number; debits: number; count: number }>();
  for (const tx of result.transactions) {
    const entry = categoryTotals.get(tx.category) ?? { credits: 0, debits: 0, count: 0 };
    entry.count += 1;
    if (tx.amount >= 0) entry.credits += tx.amount;
    else entry.debits += Math.abs(tx.amount);
    categoryTotals.set(tx.category, entry);
  }

  const summaryRows: (string | number)[][] = [
    ["VaultSheet Reconciliation Audit Summary", ""],
    ["Bank / Institution", result.metadata.bankDetected],
    ["Account Ending", `****${result.metadata.accountLast4}`],
    ["Currency", result.metadata.currency],
    ["Period", `${result.metadata.periodStart ?? "-"} to ${result.metadata.periodEnd ?? "-"}`],
    ["Opening Balance", result.reconciliation.openingBalance ?? "N/A"],
    ["Total Credits (Inflows)", result.reconciliation.totalCredits],
    ["Total Debits (Outflows)", result.reconciliation.totalDebits],
    ["Net Cash Flow", result.reconciliation.netChange],
    ["Calculated Closing Balance", result.reconciliation.calculatedClosingBalance ?? "N/A"],
    ["Statement Closing Balance", result.reconciliation.closingBalance ?? "N/A"],
    ["Reconciliation Discrepancy", result.reconciliation.discrepancy],
    [
      "Mathematical Audit Status",
      result.reconciliation.isFullyReconciled ? "RECONCILED (0.00 DIFF)" : "NEEDS REVIEW",
    ],
    ["", ""],
    ["Category Breakdown", "Transactions", "Total Inflows", "Total Outflows"],
  ];

  for (const [cat, stats] of categoryTotals.entries()) {
    summaryRows.push([
      cat,
      stats.count,
      Number(stats.credits.toFixed(2)),
      Number(stats.debits.toFixed(2)),
    ]);
  }
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 32 }, { wch: 24 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

  // Sheet 3: Accounting Import (QuickBooks Online CSV layout)
  const importRows = result.transactions.map((r) => ({
    Date: toUsSlashDate(r.date),
    Description: r.description,
    Credit: r.credit ?? "",
    Debit: r.debit ?? "",
    Category: r.category,
  }));
  const wsImport = XLSX.utils.json_to_sheet(importRows);
  wsImport["!cols"] = [{ wch: 12 }, { wch: 48 }, { wch: 12 }, { wch: 12 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsImport, "Accounting Import");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Uint8Array(buf);
}

export function exportToJsonString(result: ParseResult): string {
  return JSON.stringify(result, null, 2);
}

export function getExportMimeAndFilename(
  baseFileName: string,
  format: ExportFormat
): { mimeType: string; downloadName: string } {
  const stem = baseFileName.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9_-]+/g, "-") || "statement";
  switch (format) {
    case "xlsx":
      return {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        downloadName: `${stem}-vaultsheet.xlsx`,
      };
    case "csv":
      return { mimeType: "text/csv;charset=utf-8", downloadName: `${stem}-vaultsheet.csv` };
    case "quickbooks_csv":
      return { mimeType: "text/csv;charset=utf-8", downloadName: `${stem}-quickbooks.csv` };
    case "quickbooks_3col_csv":
      return { mimeType: "text/csv;charset=utf-8", downloadName: `${stem}-qbo-3col.csv` };
    case "xero_csv":
      return { mimeType: "text/csv;charset=utf-8", downloadName: `${stem}-xero.csv` };
    case "qbo":
      return { mimeType: "application/vnd.intu.qbo", downloadName: `${stem}.qbo` };
    case "ofx":
      return { mimeType: "application/x-ofx", downloadName: `${stem}.ofx` };
    case "json":
      return { mimeType: "application/json;charset=utf-8", downloadName: `${stem}.json` };
  }
}
