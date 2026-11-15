import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Chrome,
  FileSpreadsheet,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import ConverterWorkbench from "@/components/ConverterWorkbench";
import { CHECKOUT_URLS, FREE_ROW_LIMIT } from "@/lib/licensing";
import { SEO_BANKS } from "@/lib/seoCatalog";

const FEATURED_SLUGS = [
  "chase-pdf-to-excel",
  "wise-pdf-to-excel",
  "mercury-pdf-to-excel",
  "revolut-pdf-to-excel",
  "bank-of-america-pdf-to-excel",
  "hsbc-pdf-to-excel",
  "monzo-pdf-to-excel",
  "n26-pdf-to-excel",
  "rbc-royal-bank-pdf-to-excel",
  "commbank-pdf-to-excel",
  "payoneer-pdf-to-excel",
  "pdf-bank-statement-to-qbo",
];

const REGION_COUNTS = (["US", "UK", "EU", "Canada", "Australia", "Global", "Format"] as const).map(
  (region) => ({
    region,
    count: SEO_BANKS.filter((b) => b.region === region).length,
  }),
);

export default function HomePage() {
  const featuredBanks = FEATURED_SLUGS.map((slug) =>
    SEO_BANKS.find((entry) => entry.slug === slug),
  ).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const passCheckout =
    CHECKOUT_URLS.pass7Day === "#pricing" ? "#workbench" : CHECKOUT_URLS.pass7Day;
  const proCheckout =
    CHECKOUT_URLS.proMonthly === "#pricing" ? "#workbench" : CHECKOUT_URLS.proMonthly;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      {/* Clean White Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-2xs transition group-hover:bg-blue-600">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              VaultSheet
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#workbench" className="hover:text-slate-900 transition-colors">
              Converter
            </a>
            <Link href="/convert" className="hover:text-slate-900 transition-colors">
              {SEO_BANKS.length} Supported Banks
            </Link>
            <a href="#security" className="hover:text-slate-900 transition-colors">
              Security &amp; Proof
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">
              Pricing
            </a>
            <a href="#extension" className="hover:text-slate-900 transition-colors">
              Chrome Extension
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/convert"
              className="hidden sm:inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Browse {SEO_BANKS.length} Banks
            </Link>
            <a
              href="#workbench"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              Convert PDF Now
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Daylight Editorial Hero + Embedded Workbench */}
        <section className="relative overflow-hidden border-b border-slate-200 grid-backdrop">
          <div className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 lg:px-8 lg:pt-14">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Client-Side Bank Statement Converter &middot; Zero Server Uploads
              </p>

              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.12]">
                Convert PDF Bank Statements to Clean Excel, QuickBooks &amp; Xero
              </h1>

              <p className="mt-4 text-base text-slate-600 sm:text-lg leading-relaxed">
                Drop any bank or credit card PDF below. VaultSheet stitches wrapped memos,
                verifies every running balance to the exact cent, and exports accounting-ready files
                strictly inside your browser.
              </p>

              <p className="mt-3 text-xs font-medium text-slate-500">
                Opening + Deposits &minus; Withdrawals = Closing Reconciled &nbsp;&middot;&nbsp; 8 Accounting Formats &nbsp;&middot;&nbsp; No Sign-Up ({FREE_ROW_LIMIT} Free Rows)
              </p>
            </div>

            {/* Live Interactive Workbench Right in Hero */}
            <div id="workbench" className="mt-8 scroll-mt-20">
              <ConverterWorkbench defaultPreset="chase" />
            </div>
          </div>
        </section>

        {/* Competitor Comparison Section */}
        <section className="border-b border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Why Firms Switch
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Built for Bookkeepers Who Refuse to Upload Client PDFs
              </h2>
              <p className="mt-3 text-sm text-slate-600 sm:text-base">
                Legacy cloud converters queue sensitive financial statements on remote servers and
                lock you into $50+/month subscriptions even for a single quarterly audit.
              </p>
            </div>

            <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                    <th className="px-5 py-4 font-semibold">Capability</th>
                    <th className="bg-blue-50/60 px-5 py-4 font-bold text-blue-700">VaultSheet</th>
                    <th className="px-5 py-4 font-semibold">Cloud PDF Converters</th>
                    <th className="px-5 py-4 font-semibold">ChatGPT / Manual Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      Server Upload Exposure
                    </td>
                    <td className="bg-blue-50/30 px-5 py-4 font-semibold text-emerald-700">
                      Zero bytes uploaded (runs on your device)
                    </td>
                    <td className="px-5 py-4 text-rose-700">Uploads full PDF to remote cloud</td>
                    <td className="px-5 py-4 text-amber-700">Sent to external AI endpoints</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      Cent-by-Cent Math Audit
                    </td>
                    <td className="bg-blue-50/30 px-5 py-4 font-medium text-emerald-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> Flags exact cent discrepancies inline
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">Rarely checks row continuity</td>
                    <td className="px-5 py-4 text-rose-700">
                      <span className="inline-flex items-center gap-1.5">
                        <X className="h-4 w-4" /> Silent arithmetic hallucinations
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      Multi-Line Description Stitching
                    </td>
                    <td className="bg-blue-50/30 px-5 py-4 font-medium text-slate-900">
                      Merges wrapped memos automatically
                    </td>
                    <td className="px-5 py-4 text-slate-500">Often splits into blank orphan rows</td>
                    <td className="px-5 py-4 text-slate-500">Requires manual prompt cleanup</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-slate-900">Accounting Formats</td>
                    <td className="bg-blue-50/30 px-5 py-4 font-medium text-slate-900">
                      XLSX (3-sheet), CSV, QBO, Xero, OFX, JSON
                    </td>
                    <td className="px-5 py-4 text-slate-500">Usually CSV / XLSX only</td>
                    <td className="px-5 py-4 text-slate-500">Markdown / raw CSV copy-paste</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      One-Off Tax Season Pricing
                    </td>
                    <td className="bg-blue-50/30 px-5 py-4 font-bold text-blue-700">
                      $12 for 7-Day Pass (no renewal trap)
                    </td>
                    <td className="px-5 py-4 text-slate-500">$30&ndash;$99/mo recurring plans</td>
                    <td className="px-5 py-4 text-slate-500">$20/mo + manual cleanup hours</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Security & Architecture Proof */}
        <section id="security" className="border-b border-slate-200 bg-[#f8fafc] py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  100% On-Device Privacy
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Client bank statements never touch a cloud server. Everything parses and reconciles
                  strictly inside your browser memory&mdash;even with Wi-Fi turned off.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Automatic Balance Reconciliation
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  VaultSheet checks Opening Balance + Deposits &minus; Withdrawals = Closing Balance
                  on every file so you never import a broken ledger into your books.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Zero QuickBooks OL-222 Errors
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Exports compliant Web Connect .QBO files (Checking, Savings &amp; Credit Card)
                  plus 3-column and 4-column QuickBooks &amp; Xero CSVs.
                </p>
              </div>
            </div>

            {/* Verifiable Local-Processing Proof Card */}
            <div className="mt-8 grid items-center gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                  Verifiable In Chrome DevTools
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  Don&apos;t Take Privacy on Faith &mdash; Inspect the Network Tab Yourself
                </h3>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                  Open Chrome DevTools &rarr; Network tab, disconnect from Wi-Fi if you want, and drop
                  any multi-page statement PDF. Zero upload requests fire because coordinate
                  extraction (`pdfjs-dist` Web Worker), reconciliation, and `.xlsx`/`.qbo` assembly
                  execute entirely on your machine.
                </p>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 font-mono text-xs text-slate-200 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                  <span>DevTools &rarr; Network Filter: Fetch/XHR</span>
                  <span className="text-emerald-400 font-semibold">0 bytes uploaded</span>
                </div>
                <pre className="mt-3 overflow-x-auto leading-relaxed text-[11px] text-slate-300">
{`POST /api/upload-pdf        [NONE - Does Not Exist]
POST /api/ocr-extract       [NONE - Local pdfjs Worker]
RAM  Statement Buffer   ->  100% In-Browser Parsing
OUT  chase-oct-2026.qbo ->  Local Blob Download`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="border-b border-slate-200 bg-white py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Pricing</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Simple, One-Time Passes &mdash; Zero Subscription Traps
              </h2>
              <p className="mt-3 text-sm text-slate-600 sm:text-base">
                Test extraction accuracy and audit reconciliation math completely free. Unlock
                unlimited rows only when your statement ties out 100%.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {/* Free Tier */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Free Preview</h3>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      No Sign-Up
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 mono-nums">$0</span>
                    <span className="text-sm text-slate-500">forever</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Verify extraction accuracy on your own statement before paying a cent.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      Full PDF parsing &amp; reconciliation audit
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      Export up to {FREE_ROW_LIMIT} rows per file
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      All 4 interactive sample PDF statements
                    </li>
                  </ul>
                </div>
                <a
                  href="#workbench"
                  className="mt-8 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  Start Free in Workbench
                </a>
              </div>

              {/* 7-Day Pass */}
              <div className="flex flex-col justify-between rounded-2xl border-2 border-blue-600 bg-white p-7 shadow-lg shadow-blue-950/5">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">7-Day Tax &amp; Audit Pass</h3>
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                      <Sparkles className="h-3 w-3" /> Most Popular
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 mono-nums">$12</span>
                    <span className="text-sm text-slate-500">one-time pass</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Built for quarterly close, mortgage underwriting, or tax filing sprints. No
                    auto-renewal.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      Unlimited rows &amp; multi-file statement merge
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      All 8 export formats (XLSX, QBO, QB CSV, Xero, OFX)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      Instant license key delivery (VS-...)
                    </li>
                  </ul>
                </div>
                <a
                  href={passCheckout}
                  target={passCheckout.startsWith("http") ? "_blank" : undefined}
                  rel={passCheckout.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  Get 7-Day Pass ($12)
                </a>
              </div>

              {/* Annual Pro Bookkeeper */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Annual Pro Bookkeeper</h3>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      Firms &amp; CPAs
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 mono-nums">$29</span>
                    <span className="text-sm text-slate-500">/ year</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    One-time annual pass &mdash; no auto-renewal. Ideal for year-round client books.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      Everything in 7-Day Pass for a full 12 months
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      Commercial multi-client bookkeeping license
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      Priority custom bank layout request turnaround
                    </li>
                  </ul>
                </div>
                <a
                  href={proCheckout}
                  target={proCheckout.startsWith("http") ? "_blank" : undefined}
                  rel={proCheckout.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
                >
                  Get Annual Pro Pass ($29/yr)
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Chrome Extension Section */}
        <section id="extension" className="border-b border-slate-200 bg-[#f8fafc] py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-xs lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  <Chrome className="h-3.5 w-3.5 text-blue-600" /> Manifest V3 Chrome Extension Included
                </span>
                <h2 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
                  Convert Statements Directly Inside Your Browser Toolbar
                </h2>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Just downloaded a statement from your online banking portal or reviewing QuickBooks
                  in a tab? Click the VaultSheet extension icon to inspect transaction totals and
                  export CSV or QBO immediately&mdash;without switching apps or uploading files.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a
                    href="/vaultsheet-chrome-extension.zip"
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
                  >
                    Download Extension (.zip)
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                  <Link
                    href="/convert"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Explore Supported Formats
                  </Link>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">Quick Bookkeeper Workflow</span>
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    100% Offline Safe
                  </span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">
                        Download PDF from your bank portal
                      </p>
                      <p className="mt-0.5 text-slate-500">
                        Grab your monthly checking, savings, or credit card statement from Chase,
                        BofA, Wise, or any bank.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">
                        Open VaultSheet in Chrome toolbar
                      </p>
                      <p className="mt-0.5 text-slate-500">
                        Zero permissions to read your browsing tabs or banking logins&mdash;works
                        strictly on files you choose.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">
                        Export reconciled .QBO or CSV in one click
                      </p>
                      <p className="mt-0.5 text-slate-500">
                        Verify deposits, withdrawals, and net totals immediately before importing
                        into QuickBooks or Xero.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Bank Directory Preview */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Dedicated Converters for {SEO_BANKS.length} Global Banks &amp; Formats
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Pre-tuned date conventions, decimal separators, and column detection profiles
                  across major US, UK, EU, Canadian, Australian, and global fintech institutions.
                </p>
              </div>
              <Link
                href="/convert"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors shrink-0"
              >
                View All {SEO_BANKS.length} Converters
                <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {REGION_COUNTS.map((item) => (
                <Link
                  key={item.region}
                  href="/convert"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 hover:text-slate-900 transition-colors"
                >
                  {item.region}: <span className="font-bold text-blue-600">{item.count}</span>
                </Link>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredBanks.map((bank) => (
                <Link
                  key={bank.slug}
                  href={`/convert/${bank.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">{bank.region}</span>
                    <span className="mono-nums rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {bank.currency}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {bank.bankName} to Excel &amp; QBO
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                    {bank.metaDescription}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-slate-900" />
            <span className="font-bold text-slate-900">VaultSheet</span>
            <span>&middot; 100% Client-Side PDF Financial Extraction</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/convert" className="hover:text-slate-900 transition-colors">
              Supported Banks ({SEO_BANKS.length})
            </Link>
            <Link
              href="/convert/pdf-bank-statement-to-qbo"
              className="hover:text-slate-900 transition-colors"
            >
              PDF to QBO
            </Link>
            <Link
              href="/convert/pdf-bank-statement-to-xero-csv"
              className="hover:text-slate-900 transition-colors"
            >
              PDF to Xero
            </Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">
              Terms &amp; Refunds
            </Link>
            <a href="/llms.txt" className="hover:text-slate-900 transition-colors">
              llms.txt
            </a>
            <a href="/sitemap.xml" className="hover:text-slate-900 transition-colors">
              sitemap.xml
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
