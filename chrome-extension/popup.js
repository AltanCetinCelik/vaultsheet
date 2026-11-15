"use strict";

const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const statusBox = document.getElementById("statusBox");
const summaryGrid = document.getElementById("summaryGrid");
const tableWrap = document.getElementById("tableWrap");
const actions = document.getElementById("actions");
const previewBody = document.getElementById("previewBody");
const rowCountEl = document.getElementById("rowCount");
const totalCreditsEl = document.getElementById("totalCredits");
const totalDebitsEl = document.getElementById("totalDebits");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportQboBtn = document.getElementById("exportQboBtn");

let parsedRows = [];
let currentFileBase = "vaultsheet-export";

function showStatus(message, isWarn = false) {
  statusBox.textContent = message;
  statusBox.className = isWarn ? "status warn" : "status";
  statusBox.classList.remove("hidden");
}

function parseLocalizedNumber(raw) {
  if (!raw) return null;
  let cleaned = String(raw).trim();
  const hasParen = cleaned.startsWith("(") && cleaned.endsWith(")");
  const isDR = /\bDR\b/i.test(cleaned);
  cleaned = cleaned
    .replace(/[$€£¥₹\s]/g, "")
    .replace(/\b(CR|DR)\b/gi, "")
    .replace(/[()]/g, "");

  if (!cleaned || !/\d/.test(cleaned)) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    cleaned = lastComma > lastDot ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (lastComma > -1) {
    cleaned = cleaned.length - lastComma - 1 === 2 ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  }
  const num = Number.parseFloat(cleaned);
  if (!Number.isFinite(num)) return null;
  return (hasParen || isDR) && num > 0 ? -num : num;
}

function normalizeDate(raw) {
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const mdy = raw.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (mdy) {
    const year = mdy[3] ? (mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3]) : String(new Date().getFullYear());
    const a = Number(mdy[1]);
    const b = Number(mdy[2]);
    const month = a > 12 ? b : a;
    const day = a > 12 ? a : b;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const monthNames = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const named = raw.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
  if (named) {
    const yr = named[3] || String(new Date().getFullYear());
    return `${yr}-${monthNames[named[1].toLowerCase()]}-${named[2].padStart(2, "0")}`;
  }
  return null;
}

function extractLinesFromUncompressedPdf(bytes) {
  const latin = new TextDecoder("latin1").decode(bytes);
  const btRegex = /BT([\s\S]*?)ET/g;
  const rows = [];
  let block;
  while ((block = btRegex.exec(latin)) !== null) {
    const inner = block[1];
    const yMatch = inner.match(/([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)\s+Tm/);
    const strMatches = inner.match(/\((?:\\.|[^\\)])*\)/g);
    if (!strMatches) continue;
    const yKey = yMatch ? Math.round(Number(yMatch[2]) / 3) * 3 : rows.length;
    const text = strMatches
      .map((token) =>
        token
          .slice(1, -1)
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\"),
      )
      .join(" ")
      .trim();
    if (text) rows.push({ yKey, text });
  }
  const grouped = new Map();
  for (const item of rows) {
    const prev = grouped.get(item.yKey) || [];
    prev.push(item.text);
    grouped.set(item.yKey, prev);
  }
  return Array.from(grouped.values()).map((parts) => parts.join("   "));
}

function parseRowsFromLines(lines) {
  const dateRegex =
    /\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,?\s*\d{4})?)\b/i;
  const amountRegex = /(?:^|\s)([-+(]?[$€£]?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})\)?(?:\s?(?:CR|DR))?)(?=$|\s)/gi;

  const out = [];
  for (const line of lines) {
    const dm = line.match(dateRegex);
    if (!dm) continue;
    const isoDate = normalizeDate(dm[0]);
    if (!isoDate) continue;

    const nums = [];
    let m;
    amountRegex.lastIndex = 0;
    while ((m = amountRegex.exec(line)) !== null) {
      const val = parseLocalizedNumber(m[1]);
      if (val !== null) nums.push({ raw: m[1], val });
    }
    if (nums.length === 0) continue;
    const txAmount = nums.length >= 2 ? nums[nums.length - 2].val : nums[0].val;
    const desc = line
      .replace(dm[0], "")
      .replace(amountRegex, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!desc || /opening balance|closing balance/i.test(desc)) continue;
    out.push({ date: isoDate, description: desc, amount: txAmount });
  }
  return out;
}

function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const date = normalizeDate(cols[0] || "");
    const amt = parseLocalizedNumber(cols[cols.length - 1] || cols[2] || "");
    if (date && amt !== null) {
      out.push({ date, description: cols[1] || "Transaction", amount: amt });
    }
  }
  return out;
}

function renderResults(rows) {
  parsedRows = rows;
  if (rows.length === 0) {
    summaryGrid.classList.add("hidden");
    tableWrap.classList.add("hidden");
    actions.classList.add("hidden");
    return;
  }

  let credits = 0;
  let debits = 0;
  for (const r of rows) {
    if (r.amount >= 0) credits += r.amount;
    else debits += Math.abs(r.amount);
  }

  rowCountEl.textContent = String(rows.length);
  totalCreditsEl.textContent = `$${credits.toFixed(2)}`;
  totalDebitsEl.textContent = `$${debits.toFixed(2)}`;

  previewBody.innerHTML = "";
  for (const row of rows.slice(0, 50)) {
    const tr = document.createElement("tr");
    const tdDate = document.createElement("td");
    tdDate.textContent = row.date;
    const tdDesc = document.createElement("td");
    tdDesc.className = "desc";
    tdDesc.textContent = row.description;
    const tdAmt = document.createElement("td");
    tdAmt.className = `num ${row.amount >= 0 ? "pos" : "neg"}`;
    tdAmt.textContent = row.amount.toFixed(2);
    tr.append(tdDate, tdDesc, tdAmt);
    previewBody.appendChild(tr);
  }

  summaryGrid.classList.remove("hidden");
  tableWrap.classList.remove("hidden");
  actions.classList.remove("hidden");
}

async function handleFile(file) {
  if (!file) return;
  currentFileBase = file.name.replace(/\.[^.]+$/, "") || "vaultsheet-export";

  if (file.name.toLowerCase().endsWith(".csv")) {
    const text = await file.text();
    const rows = parseCsvText(text);
    renderResults(rows);
    showStatus(
      rows.length > 0
        ? `Parsed ${rows.length} transactions locally from CSV.`
        : "No valid CSV transaction rows detected.",
      rows.length === 0,
    );
    return;
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const rawLines = extractLinesFromUncompressedPdf(bytes);
  const rows = parseRowsFromLines(rawLines);

  if (rows.length === 0) {
    renderResults([]);
    showStatus(
      "This PDF uses FlateDecode compressed streams. Click 'Open Full Workbench' below to run the PDF.js Web Worker locally in your browser.",
      true,
    );
    return;
  }

  renderResults(rows);
  showStatus(`Extracted ${rows.length} rows locally with 0 bytes uploaded.`);
}

function downloadContent(content, mime, filename) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

exportCsvBtn.addEventListener("click", () => {
  const header = "Date,Description,Amount";
  const body = parsedRows.map(
    (r) => `${r.date},"${r.description.replace(/"/g, '""')}",${r.amount.toFixed(2)}`,
  );
  downloadContent([header, ...body].join("\n"), "text/csv;charset=utf-8", `${currentFileBase}.csv`);
});

exportQboBtn.addEventListener("click", () => {
  const now = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const txXml = parsedRows
    .map(
      (r, idx) =>
        `<STMTTRN>\n<TRNTYPE>${r.amount >= 0 ? "CREDIT" : "DEBIT"}</TRNTYPE>\n<DTPOSTED>${r.date.replace(/-/g, "")}</DTPOSTED>\n<TRNAMT>${r.amount.toFixed(2)}</TRNAMT>\n<FITID>VS-${idx + 1}</FITID>\n<NAME>${r.description.slice(0, 32).replace(/[<>&]/g, "")}</NAME>\n</STMTTRN>`,
    )
    .join("\n");

  const qbo = [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "VERSION:102",
    "ENCODING:UTF-8",
    "",
    "<OFX>",
    `<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS><DTSERVER>${now}</DTSERVER><LANGUAGE>ENG</LANGUAGE></SONRS></SIGNONMSGSRSV1>`,
    "<BANKMSGSRSV1><STMTTRNRS><TRNUID>1001</TRNUID><STMTRS><CURDEF>USD</CURDEF><BANKTRANLIST>",
    txXml,
    "</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1>",
    "</OFX>",
  ].join("\n");

  downloadContent(qbo, "application/vnd.intu.qbo", `${currentFileBase}.qbo`);
});

fileInput.addEventListener("change", (e) => {
  handleFile(e.target.files?.[0]);
});

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  handleFile(e.dataTransfer?.files?.[0]);
});
