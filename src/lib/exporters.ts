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

function escapePdfString(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function pdfTextOp(x: number, y: number, text: string, bold = false, size = 10): string {
  const font = bold ? "/F2" : "/F1";
  return `BT ${font} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${escapePdfString(text)}) Tj ET`;
}

function formatAuditAmount(val: number | null, currency: string): string {
  if (val === null || !Number.isFinite(val)) return "N/A";
  const sign = val < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(val));
  return `${sign}${formatted} ${currency}`;
}

export function exportAuditCertificatePdfBytes(result: ParseResult): Uint8Array {
  const { metadata, transactions, reconciliation } = result;
  const currency = metadata.currency || "USD";
  const generatedIso = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  const ops: string[] = [];

  // Header Banner Rule & Title
  ops.push("0.06 0.09 0.16 rg");
  ops.push("42 715 528 52 re f");
  ops.push("1 1 1 rg");
  ops.push(pdfTextOp(56, 745, "VAULTSHEET - MATHEMATICAL RECONCILIATION & AUDIT CERTIFICATE", true, 12));
  ops.push(
    pdfTextOp(
      56,
      727,
      `Generated Locally in Browser RAM (${generatedIso}) | Zero Server Uploads`,
      false,
      8.5
    )
  );

  // Reset fill to dark slate
  ops.push("0.06 0.09 0.16 rg");
  ops.push("0.88 0.91 0.94 RG 0.8 w");

  // Statement Metadata Section
  ops.push(pdfTextOp(42, 690, "1. STATEMENT METADATA", true, 10.5));
  ops.push("42 683 m 570 683 l S");

  const metaLines: [string, string][] = [
    ["Bank / Financial Institution:", metadata.bankDetected || "Unknown Statement"],
    ["Account Identifier:", `****${metadata.accountLast4 || "0000"} (${metadata.accountType || "CHECKING"})`],
    ["Source Document:", metadata.fileName || "statement.pdf"],
    ["Statement Period:", `${metadata.periodStart ?? "N/A"} to ${metadata.periodEnd ?? "N/A"}`],
    ["Currency / Parsing Mode:", `${currency} (${metadata.parseMode || "local"})`],
    [
      "Transactions Audited:",
      `${transactions.length} rows (${reconciliation.stitchedLineCount} wrapped memos stitched)`,
    ],
  ];

  let y = 665;
  for (const [label, val] of metaLines) {
    ops.push(pdfTextOp(48, y, label, true, 9.5));
    ops.push(pdfTextOp(230, y, val, false, 9.5));
    y -= 16;
  }

  // Reconciliation Equation Box
  y -= 10;
  ops.push("0.97 0.98 0.99 rg");
  ops.push(`42 ${y - 118} 528 128 re f`);
  ops.push(`42 ${y - 118} 528 128 re S`);
  ops.push("0.06 0.09 0.16 rg");

  ops.push(pdfTextOp(54, y - 8, "2. MATHEMATICAL BALANCE RECONCILIATION PROOF", true, 10.5));
  const auditLines: [string, string, boolean][] = [
    ["Opening Balance:", formatAuditAmount(reconciliation.openingBalance, currency), false],
    ["+ Total Deposits (Credits):", `+${formatAuditAmount(reconciliation.totalCredits, currency)}`, false],
    ["- Total Withdrawals (Debits):", `-${formatAuditAmount(reconciliation.totalDebits, currency)}`, false],
    [
      "= Calculated Closing Balance:",
      formatAuditAmount(reconciliation.calculatedClosingBalance, currency),
      true,
    ],
    ["Statement Closing Balance:", formatAuditAmount(reconciliation.closingBalance, currency), false],
    [
      "Audit Status:",
      reconciliation.isFullyReconciled
        ? `VERIFIED TO THE EXACT CENT (0.00 ${currency} DISCREPANCY | ${reconciliation.matchedRows}/${transactions.length} ROWS)`
        : `DISCREPANCY DETECTED (${formatAuditAmount(reconciliation.discrepancy, currency)} | ${reconciliation.mismatchRows} ROW MISMATCH)`,
      true,
    ],
  ];

  let eqY = y - 28;
  for (const [label, val, bold] of auditLines) {
    ops.push(pdfTextOp(54, eqY, label, true, 9.5));
    ops.push(pdfTextOp(240, eqY, val, bold, 9.5));
    eqY -= 16;
  }

  // Category Summary Breakdown
  let catY = y - 144;
  ops.push(pdfTextOp(42, catY, "3. CATEGORY SUMMARY BREAKDOWN", true, 10.5));
  catY -= 7;
  ops.push(`42 ${catY} m 570 ${catY} l S`);
  catY -= 15;
  ops.push(pdfTextOp(48, catY, "Category", true, 9));
  ops.push(pdfTextOp(245, catY, "Txns", true, 9));
  ops.push(pdfTextOp(315, catY, `Total Inflows (${currency})`, true, 9));
  ops.push(pdfTextOp(455, catY, `Total Outflows (${currency})`, true, 9));
  catY -= 6;
  ops.push(`42 ${catY} m 570 ${catY} l S`);
  catY -= 14;

  const categoryTotals = new Map<CategoryName, { credits: number; debits: number; count: number }>();
  for (const tx of transactions) {
    const entry = categoryTotals.get(tx.category) ?? { credits: 0, debits: 0, count: 0 };
    entry.count += 1;
    if (tx.amount >= 0) entry.credits += tx.amount;
    else entry.debits += Math.abs(tx.amount);
    categoryTotals.set(tx.category, entry);
  }

  for (const [cat, stats] of categoryTotals.entries()) {
    if (catY < 72) break;
    ops.push(pdfTextOp(48, catY, cat, false, 9));
    ops.push(pdfTextOp(245, catY, String(stats.count), false, 9));
    ops.push(pdfTextOp(315, catY, formatAuditAmount(stats.credits, currency), false, 9));
    ops.push(pdfTextOp(455, catY, formatAuditAmount(stats.debits, currency), false, 9));
    catY -= 15;
  }

  // Footer
  ops.push("0.39 0.45 0.54 rg");
  ops.push("42 52 m 570 52 l S");
  ops.push(
    pdfTextOp(
      42,
      36,
      "Generated 100% locally in browser RAM by VaultSheet (https://vaultsheet.tech) - Zero server uploads.",
      false,
      8.5
    )
  );

  const streamContent = ops.join("\n") + "\n";
  const encoder = new TextEncoder();
  const streamByteLen = encoder.encode(streamContent).length;

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${streamByteLen} >>\nstream\n${streamContent}endstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(encoder.encode(pdf).length);
    pdf += obj;
  }

  const xrefStart = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return encoder.encode(pdf);
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
