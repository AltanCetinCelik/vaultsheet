import type { BankPresetMeta, SamplePresetId } from "./types";

export const BANK_PRESETS: Record<SamplePresetId, BankPresetMeta> = {
  chase: {
    id: "chase",
    label: "Chase Business",
    bankName: "Chase Business Complete Checking",
    currency: "USD",
    accountLast4: "4821",
    dateHint: "MM/DD",
    sampleFileName: "chase-business-statement-sample.pdf",
    summary: "Single signed amount column, multi-line ACH/merchant descriptions, running balance.",
  },
  wise: {
    id: "wise",
    label: "Wise Business (EUR)",
    bankName: "Wise Multi-Currency Business EUR",
    currency: "EUR",
    accountLast4: "9104",
    dateHint: "DD/MM/YYYY",
    sampleFileName: "wise-business-eur-statement-sample.pdf",
    summary: "European decimal formatting (1.240,50), split Debit/Credit columns, FX conversions.",
  },
  mercury: {
    id: "mercury",
    label: "Mercury Checking",
    bankName: "Mercury Business Checking",
    currency: "USD",
    accountLast4: "7319",
    dateHint: "ISO / Mon DD",
    sampleFileName: "mercury-checking-statement-sample.pdf",
    summary: "Startup stack transactions (AWS, Stripe payouts, payroll, SaaS subscriptions).",
  },
  revolut: {
    id: "revolut",
    label: "Revolut Business (GBP)",
    bankName: "Revolut Business GBP",
    currency: "GBP",
    accountLast4: "3508",
    dateHint: "DD MMM YYYY",
    sampleFileName: "revolut-business-gbp-statement-sample.pdf",
    summary: "Split Money Out / Money In columns with card spend, transfers, and bank fees.",
  },
  garanti: {
    id: "garanti",
    label: "Garanti BBVA (TRY)",
    bankName: "Garanti BBVA Ticari Vadesiz TL",
    currency: "TRY",
    accountLast4: "6190",
    dateHint: "DD.MM.YYYY",
    sampleFileName: "garanti-bbva-ticari-ekstre-sample.pdf",
    summary: "Turkish format (DD.MM.YYYY, 1.240,50 TL), Tarih / Aciklama / Tutar / Bakiye.",
  },
};

interface SampleTxnSpec {
  date: string;
  lines: string[];
  amountCents: number; // negative = debit, positive = credit
}

interface PresetBlueprint {
  bankTitle: string;
  accountLine: string;
  periodLine: string;
  openingLabel?: string;
  closingLabel?: string;
  currency: "USD" | "EUR" | "GBP" | "TRY";
  numberStyle: "us" | "eu";
  layout: "single-amount" | "split-debit-credit";
  colHeaders: string[];
  openingCents: number;
  txns: SampleTxnSpec[];
}

function formatCents(cents: number, style: "us" | "eu", currencySymbol = ""): string {
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toString();
  const frac = (abs % 100).toString().padStart(2, "0");
  const sign = cents < 0 ? "-" : "";

  if (style === "eu") {
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${sign}${currencySymbol}${grouped},${frac}`;
  }
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${currencySymbol}${grouped}.${frac}`;
}

const BLUEPRINTS: Record<SamplePresetId, PresetBlueprint> = {
  chase: {
    bankTitle: "JPMORGAN CHASE BANK, N.A. - BUSINESS COMPLETE CHECKING",
    accountLine: "Account Number: 0000004821   Currency: USD   Year: 2026",
    periodLine: "Statement Period: October 01, 2026 - October 31, 2026",
    currency: "USD",
    numberStyle: "us",
    layout: "single-amount",
    colHeaders: ["Date", "Description", "Amount", "Balance"],
    openingCents: 1845000, // $18,450.00
    txns: [
      {
        date: "10/01/2026",
        lines: ["STRIPE TRANSFER PAYOUT BATCH 992014", "CCD ID: 1800948598 SETTLEMENT"],
        amountCents: 642050,
      },
      {
        date: "10/03/2026",
        lines: ["AMAZON WEB SERVICES AWS.AMAZON.CO WA", "CLOUD INFRASTRUCTURE USAGE OCT"],
        amountCents: -41280,
      },
      {
        date: "10/05/2026",
        lines: ["GUSTO PAYROLL DEBIT 884120", "BIWEEKLY ENGINEERING TEAM RUN"],
        amountCents: -425000,
      },
      {
        date: "10/07/2026",
        lines: ["GOOGLE ADS 4419-8812-0010", "SEARCH CAMPAIGN BILLING"],
        amountCents: -89000,
      },
      {
        date: "10/10/2026",
        lines: ["FIGMA INC SAN FRANCISCO CA", "TEAM DESIGN SEATS ANNUAL"],
        amountCents: -14400,
      },
      {
        date: "10/14/2026",
        lines: ["LEMON SQUEEZY PAYOUT #LS-4410", "MERCHANT OF RECORD SETTLEMENT"],
        amountCents: 318040,
      },
      {
        date: "10/16/2026",
        lines: ["UNITED AIRLINES 01624119002", "CLIENT CONFERENCE FLIGHT SFO"],
        amountCents: -62875,
      },
      {
        date: "10/19/2026",
        lines: ["OPENAI *API PLATFORM SAN FRANCISCO", "GPT EVALUATION & EMBEDDINGS"],
        amountCents: -18645,
      },
      {
        date: "10/22/2026",
        lines: ["WIRE TRANSFER FEE DOMESTIC OUTGOING", "SERVICE CHARGE ACCT 4821"],
        amountCents: -2500,
      },
      {
        date: "10/25/2026",
        lines: ["SHOPIFY APP STORE DEVELOPER PAYOUT", "MONTHLY PARTNER DISTRIBUTION"],
        amountCents: 215000,
      },
      {
        date: "10/28/2026",
        lines: ["VERCEL INC PRO WORKSPACE", "HOSTING & EDGE BANDWIDTH"],
        amountCents: -6000,
      },
      {
        date: "10/30/2026",
        lines: ["SWEETGREEN #0412 AUSTIN TX", "TEAM WORKING LUNCH"],
        amountCents: -8420,
      },
    ],
  },
  wise: {
    bankTitle: "WISE EUROPE SA - MULTI-CURRENCY BUSINESS STATEMENT (EUR)",
    accountLine: "IBAN: BE79 9670 2281 9104   Account: ****9104   Currency: EUR",
    periodLine: "Statement Period: 01/10/2026 - 31/10/2026",
    currency: "EUR",
    numberStyle: "eu",
    layout: "split-debit-credit",
    colHeaders: ["Date", "Description", "Debit", "Credit", "Balance"],
    openingCents: 1245080, // EUR 12.450,80
    txns: [
      {
        date: "02/10/2026",
        lines: ["Paddle.com Market Ltd Settlement", "Monthly SaaS Payout Batch EU-19"],
        amountCents: 384050,
      },
      {
        date: "04/10/2026",
        lines: ["Hetzner Online GmbH Invoice 99214", "Dedicated Cloud Nodes Germany"],
        amountCents: -28990,
      },
      {
        date: "08/10/2026",
        lines: ["SEPA Contractor Transfer - K. Weber", "Backend Consulting Invoice #204"],
        amountCents: -165000,
      },
      {
        date: "11/10/2026",
        lines: ["Wise FX Conversion Fee USD->EUR", "Automated Treasury Rebalance"],
        amountCents: -1845,
      },
      {
        date: "14/10/2026",
        lines: ["Polar Software Inc Settlement", "Developer Tooling Payouts"],
        amountCents: 192000,
      },
      {
        date: "18/10/2026",
        lines: ["Meta Platforms Ireland Ltd", "Instagram & Reels Acquisition"],
        amountCents: -54000,
      },
      {
        date: "22/10/2026",
        lines: ["Linear Orbit Inc Subscription", "Workspace Annual Plan"],
        amountCents: -9600,
      },
      {
        date: "26/10/2026",
        lines: ["Lufthansa Airlines Frankfurt", "Berlin Summit Rail & Air"],
        amountCents: -34260,
      },
      {
        date: "29/10/2026",
        lines: ["Stripe Technology Europe Payout", "Direct Invoice Collection"],
        amountCents: 147525,
      },
    ],
  },
  mercury: {
    bankTitle: "MERCURY TECHNOLOGIES INC - BUSINESS CHECKING ACCOUNT",
    accountLine: "Account Ending: ****7319   Routing: 091311229   Currency: USD",
    periodLine: "Statement Period: 2026-10-01 to 2026-10-31",
    currency: "USD",
    numberStyle: "us",
    layout: "single-amount",
    colHeaders: ["Date", "Description", "Amount", "Balance"],
    openingCents: 4620000, // $46,200.00
    txns: [
      {
        date: "2026-10-02",
        lines: ["Stripe Payout #ST-88412", "MRR Subscription Settlement"],
        amountCents: 894000,
      },
      {
        date: "2026-10-04",
        lines: ["Amazon Web Services", "Production RDS & EC2 Cluster"],
        amountCents: -74230,
      },
      {
        date: "2026-10-06",
        lines: ["Rippling Payroll ACH Debit", "US Contractor & Staff Run"],
        amountCents: -680000,
      },
      {
        date: "2026-10-09",
        lines: ["Anthropic API Usage Billing", "Claude Inference Credits"],
        amountCents: -31500,
      },
      {
        date: "2026-10-12",
        lines: ["Cloudflare Inc Pro & R2 Storage", "Zero Egress Object Hosting"],
        amountCents: -4500,
      },
      {
        date: "2026-10-15",
        lines: ["Google Workspace Business Plus", "Company Email & Drive Seats"],
        amountCents: -10800,
      },
      {
        date: "2026-10-20",
        lines: ["Lemon Squeezy Store Settlement", "Digital License Sales"],
        amountCents: 412550,
      },
      {
        date: "2026-10-24",
        lines: ["Blue Bottle Coffee SF", "Founder Coffee Meeting"],
        amountCents: -2450,
      },
      {
        date: "2026-10-28",
        lines: ["GitHub Actions & Copilot", "CI Runner Minutes + Org Seats"],
        amountCents: -11400,
      },
    ],
  },
  revolut: {
    bankTitle: "REVOLUT BUSINESS LTD - GBP OPERATING ACCOUNT",
    accountLine: "Sort Code: 04-00-75   Account: ****3508   Currency: GBP",
    periodLine: "Statement Period: 01 Oct 2026 - 31 Oct 2026",
    currency: "GBP",
    numberStyle: "us",
    layout: "split-debit-credit",
    colHeaders: ["Date", "Description", "Debit", "Credit", "Balance"],
    openingCents: 985040, // GBP 9,850.40
    txns: [
      {
        date: "02 Oct 2026",
        lines: ["Xero UK Client Retainer Payment", "BACS Direct Settlement Ref 8821"],
        amountCents: 285000,
      },
      {
        date: "05 Oct 2026",
        lines: ["Notion Labs Inc San Francisco", "Team Knowledge Base Plan"],
        amountCents: -7200,
      },
      {
        date: "09 Oct 2026",
        lines: ["Deel Contractor Settlement", "Engineering Contractor Payout"],
        amountCents: -145000,
      },
      {
        date: "13 Oct 2026",
        lines: ["Revolut Business Plan Fee", "Monthly Account Maintenance"],
        amountCents: -2500,
      },
      {
        date: "16 Oct 2026",
        lines: ["Stripe UK Ltd Merchant Payout", "Weekly SaaS Checkout Clear"],
        amountCents: 194025,
      },
      {
        date: "21 Oct 2026",
        lines: ["LinkedIn Ireland Unlimited", "Sponsored Post Campaign"],
        amountCents: -31000,
      },
      {
        date: "25 Oct 2026",
        lines: ["Slack Technologies EMEA", "Business+ Workspace Billing"],
        amountCents: -5840,
      },
      {
        date: "29 Oct 2026",
        lines: ["Trainline UK Business Ticket", "London Client Workshop Rail"],
        amountCents: -11850,
      },
    ],
  },
  garanti: {
    bankTitle: "TURKIYE GARANTI BANKASI A.S. - TICARI VADESIZ TL HESAP EKSTRESI",
    accountLine: "Hesap No: 000482-0006190   Para Birimi: TRY   Donem: Ekim 2026",
    periodLine: "Ekstre Tarih Araligi: 01.10.2026 - 31.10.2026",
    openingLabel: "Devreden Bakiye",
    closingLabel: "Donem Sonu Bakiyesi",
    currency: "TRY",
    numberStyle: "eu",
    layout: "single-amount",
    colHeaders: ["Tarih", "Aciklama", "Tutar", "Bakiye"],
    openingCents: 14500000, // 145.000,00 TRY
    txns: [
      {
        date: "02.10.2026",
        lines: ["IYZICO UYE ISYERI ODEMESI", "REF: 202610029941 POS HAKEDIS"],
        amountCents: 6845000,
      },
      {
        date: "04.10.2026",
        lines: ["TURK TELEKOM KURUMSAL FIBER", "OTOMATIK FATURA ODEME #4410"],
        amountCents: -189050,
      },
      {
        date: "07.10.2026",
        lines: ["AMAZON WEB SERVICES EMEA SARL", "BULUT SUNUCU KULLANIM FATURASI"],
        amountCents: -1425000,
      },
      {
        date: "11.10.2026",
        lines: ["TRENDYOL SATICI HAKEDIS AKTARIMI", "E-TICARET PAZARYERI SETTLEMENT"],
        amountCents: 9432000,
      },
      {
        date: "15.10.2026",
        lines: ["MAAS ODEMESI EKIM BORDRO", "TOPLU PERSONEL EFT TALIMATI"],
        amountCents: -8500000,
      },
      {
        date: "17.10.2026",
        lines: ["GARANTI FAST HAVALE UCRETI", "BSMV DAHIL ISLEM MASRAFI"],
        amountCents: -1240,
      },
      {
        date: "20.10.2026",
        lines: ["SHELL PETROL KURUMSAL TASITMATIK", "FILO AKARYAKIT DONEM FATURASI"],
        amountCents: -648075,
      },
      {
        date: "23.10.2026",
        lines: ["GOOGLE IRELAND REKLAM HARCAMASI", "GOOGLE ADS KAMPANYA ODEMESI"],
        amountCents: -2250000,
      },
      {
        date: "26.10.2026",
        lines: ["PARASUT YAZILIM ABONELIK", "YILLIK ON MUHASEBE PAKETI"],
        amountCents: -420000,
      },
      {
        date: "29.10.2026",
        lines: ["MUSTERI FATURA TAHSILATI EFT", "ACIKLAMA: NO 2026-884 PROJE BEDELI"],
        amountCents: 5200000,
      },
    ],
  },
};

function escapePdfString(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function buildTextOp(x: number, y: number, text: string, bold = false, size = 9.5): string {
  const font = bold ? "/F2" : "/F1";
  return `BT ${font} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${escapePdfString(text)}) Tj ET`;
}

export function generateSampleStatementPdf(presetId: SamplePresetId): Uint8Array {
  const bp = BLUEPRINTS[presetId];
  let runningCents = bp.openingCents;
  for (const t of bp.txns) {
    runningCents += t.amountCents;
  }
  const closingCents = runningCents;

  const ops: string[] = [];
  // Header metadata lines
  ops.push(buildTextOp(42, 756, bp.bankTitle, true, 12));
  ops.push(buildTextOp(42, 738, bp.accountLine, false, 9.5));
  ops.push(buildTextOp(42, 723, bp.periodLine, false, 9.5));
  ops.push(
    buildTextOp(
      42,
      703,
      `${bp.openingLabel ?? "Opening Balance"}: ${formatCents(bp.openingCents, bp.numberStyle)} ${bp.currency}`,
      true,
      10
    )
  );
  ops.push(
    buildTextOp(
      320,
      703,
      `${bp.closingLabel ?? "Closing Balance"}: ${formatCents(closingCents, bp.numberStyle)} ${bp.currency}`,
      true,
      10
    )
  );

  // Column positions
  let y = 672;
  if (bp.layout === "single-amount") {
    ops.push(buildTextOp(42, y, bp.colHeaders[0], true, 9.5));
    ops.push(buildTextOp(118, y, bp.colHeaders[1], true, 9.5));
    ops.push(buildTextOp(405, y, bp.colHeaders[2], true, 9.5));
    ops.push(buildTextOp(495, y, bp.colHeaders[3], true, 9.5));
  } else {
    ops.push(buildTextOp(42, y, bp.colHeaders[0], true, 9.5));
    ops.push(buildTextOp(112, y, bp.colHeaders[1], true, 9.5));
    ops.push(buildTextOp(360, y, bp.colHeaders[2], true, 9.5));
    ops.push(buildTextOp(432, y, bp.colHeaders[3], true, 9.5));
    ops.push(buildTextOp(505, y, bp.colHeaders[4], true, 9.5));
  }

  y -= 20;
  let currentBalance = bp.openingCents;
  for (const txn of bp.txns) {
    currentBalance += txn.amountCents;
    ops.push(buildTextOp(42, y, txn.date, false, 9));
    ops.push(buildTextOp(bp.layout === "single-amount" ? 118 : 112, y, txn.lines[0], false, 9));

    if (bp.layout === "single-amount") {
      ops.push(buildTextOp(405, y, formatCents(txn.amountCents, bp.numberStyle), false, 9));
      ops.push(buildTextOp(495, y, formatCents(currentBalance, bp.numberStyle), false, 9));
    } else {
      if (txn.amountCents < 0) {
        ops.push(buildTextOp(360, y, formatCents(Math.abs(txn.amountCents), bp.numberStyle), false, 9));
      } else {
        ops.push(buildTextOp(432, y, formatCents(txn.amountCents, bp.numberStyle), false, 9));
      }
      ops.push(buildTextOp(505, y, formatCents(currentBalance, bp.numberStyle), false, 9));
    }

    for (let i = 1; i < txn.lines.length; i++) {
      y -= 12;
      ops.push(buildTextOp(bp.layout === "single-amount" ? 118 : 112, y, txn.lines[i], false, 8.5));
    }
    y -= 19;
  }

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
