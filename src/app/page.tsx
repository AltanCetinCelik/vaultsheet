import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ConverterWorkbench from "@/components/ConverterWorkbench";
import NavbarAuthButtons from "@/components/NavbarAuthButtons";
import { CHECKOUT_URLS } from "@/lib/licensing";
import { SEO_BANKS } from "@/lib/seoCatalog";

const HOME_FAQS = [
  {
    question: "Are my PDF bank statements ever uploaded to a server?",
    answer:
      "Never. VaultSheet runs pdfjs-dist extraction, coordinate alignment, and balance reconciliation strictly inside your local browser memory (RAM). You can disconnect Wi-Fi or inspect Chrome DevTools -> Network tab to confirm zero bytes leave your computer.",
  },
  {
    question: "What is included Free vs. Paid 7-Day Pass & Annual Pro?",
    answer:
      "All AI CFO financial forensics—Money Leak Radar, 5-Year Wealth Simulator, Tax & VAT Shield, and 1-click legal notices—work free on your statements, plus 1st full uploaded statement Excel (.xlsx) export free (up to 100 rows). Guests can export 10 CSV rows and Free Accounts unlock 25 rows + saved history. Upgrading to the $12 7-Day Pass or $29/year Pro Pass unlocks unlimited rows, multi-PDF merging, unlimited Excel (.xlsx), QuickBooks (.qbo), and CPA Audit Certificate PDFs.",
  },
  {
    question: "How does VaultSheet prevent missing transactions or OCR math errors?",
    answer:
      "Every parsed statement runs through deterministic cent-level reconciliation: Opening Balance + Deposits - Withdrawals = Closing Balance. Multi-line wrapped descriptions are stitched automatically and any cent discrepancy is highlighted inline.",
  },
  {
    question: "Which accounting software formats are supported?",
    answer:
      "VaultSheet exports 3-sheet Excel workbooks (.xlsx), QuickBooks Desktop Web Connect (.qbo) for Checking, Savings, and Credit Card accounts (without OL-222 errors), QuickBooks Online 3-Column & 4-Column CSVs, Xero Bank Feed CSVs, OFX, JSON, and downloadable CPA Audit Certificate PDFs.",
  },
  {
    question: "Does VaultSheet work with European, UK, Canadian, and US banks?",
    answer:
      "Yes. VaultSheet supports 64+ bank and format profiles including Chase, Bank of America, Wells Fargo, Mercury, Wise (EUR/GBP/USD), Revolut, Monzo, N26, HSBC, RBC, and CommBank—automatically normalizing MM/DD/YYYY, DD/MM/YYYY, DD MMM YYYY dates, comma decimals, and CR/DR columns.",
  },
  {
    question: "What if a credit card or scanned PDF statement shows reversed signs or weird text?",
    answer:
      "Inside Edit & Advanced Tools you can flip all +/- debit/credit signs in one click, edit any cell inline with live balance recalculation, or paste raw OCR / banking portal tables directly using Paste Scanned / OCR Text.",
  },
];

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

  const homeSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: HOME_FAQS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to Convert a PDF Bank Statement to Excel or QuickBooks Locally",
      description:
        "Convert PDF bank statements to clean Excel (.xlsx), QuickBooks (.qbo), and Xero CSV files inside your browser with zero server uploads.",
      step: [
        {
          "@type": "HowToStep",
          name: "Select or drop your PDF statement",
          text: "Click Select PDF Statement (or test an instant Chase, Wise, Mercury, or Revolut sample). Single or multiple monthly PDFs run strictly inside local browser RAM.",
        },
        {
          "@type": "HowToStep",
          name: "Verify cent-level reconciliation",
          text: "VaultSheet stitches wrapped transaction memos and confirms Opening Balance + Deposits - Withdrawals = Closing Balance with $0.00 diff.",
        },
        {
          "@type": "HowToStep",
          name: "Download Excel (.xlsx), QuickBooks (.qbo), or CSV",
          text: "Export clean spreadsheets, QuickBooks Web Connect (.qbo), Xero CSV, or CPA Audit Certificate PDFs in one click.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchemas) }}
      />
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

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#workbench" className="hover:text-slate-900 transition-colors">
              Converter
            </a>
            <Link href="/convert" className="hover:text-slate-900 transition-colors">
              {SEO_BANKS.length} Banks
            </Link>
            <a href="#security" className="hover:text-slate-900 transition-colors">
              Privacy Proof
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <NavbarAuthButtons />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Daylight Editorial Hero + Embedded 2-Stage Workbench */}
        <section className="relative overflow-hidden border-b border-slate-200 grid-backdrop">
          <div className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 lg:px-8 lg:pt-14">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                VAULTSHEET SUITE &middot; 3 FINANCIAL TOOLS UNDER ONE ROOF &middot; 100% LOCAL PRIVACY
              </p>

              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.1]">
                One Financial Workspace for Statement Conversion, Market Risk &amp; Spend Audits
              </h1>

              <p className="mt-4 text-base text-slate-600 sm:text-lg leading-relaxed">
                Convert bank PDFs to reconciled Excel/QBO with zero server uploads, size market
                positions from live 24h anomaly scanning, and uncover subscription drains &amp;
                tax write-offs in one clean workspace.
              </p>

              <p className="mt-3 text-xs font-medium text-slate-500">
                PDF Statement Converter (OCR + Password) &nbsp;&middot;&nbsp; Live Market &amp; Risk Terminal &nbsp;&middot;&nbsp; Leak, Tax &amp; Audit Studio
              </p>
            </div>

            {/* Live 3-Module Financial Suite Right in Hero */}
            <div id="workbench" className="mt-8 scroll-mt-20">
              <ConverterWorkbench defaultPreset="garanti" />
            </div>
          </div>
        </section>

        {/* 3 Core Modules Overview */}
        <section id="how-it-works" className="border-b border-slate-200 bg-[#f8fafc] py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                  1
                </span>
                <h2 className="mt-3 text-base font-bold text-slate-900">
                  1. PDF Statement Converter
                </h2>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  Drop digital, scanned (local Tesseract OCR), or password-protected PDFs. Inspect
                  side-by-side pages, confirm 0.00 balance diff, and export Excel (1st file free) or QuickBooks .QBO.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                  2
                </span>
                <h2 className="mt-3 text-base font-bold text-slate-900">
                  2. Live Market &amp; Risk Terminal
                </h2>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  Track live 24h range breakouts, oversold dip zones, and volatility spikes across
                  major pairs&mdash;then compute exact position sizes, R:R ratios, and 20-trade expectancy.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                  3
                </span>
                <h2 className="mt-3 text-base font-bold text-slate-900">
                  3. Leak, Tax &amp; Audit Studio
                </h2>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  Spot hidden bank fees &amp; SaaS drains, calculate KDV (20%) &amp; GVK / Schedule C
                  tax shields, draft 1-click legal notices, and copy verifiable CPA audit summaries.
                </p>
              </div>
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
                    <h3 className="text-lg font-bold text-slate-900">Free Account</h3>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      $0 Forever
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 mono-nums">$0</span>
                    <span className="text-sm text-slate-500">forever</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Full AI CFO money-leak audit, Tax Shield &amp; 1st uploaded statement Excel (.xlsx) export free (up to 100 rows).
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span><strong>Money Leak Radar &amp; 5-Yr Wealth Simulator</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      Tax &amp; VAT Shield + 1-click legal cancel/refund notices
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span><strong>1st full Excel (.xlsx) export free</strong> + Side-by-side PDF</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      Local Tesseract OCR (scanned PDFs) &amp; password PDF unlock
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
                      Unlimited rows, batch multi-month PDF merge &amp; Tax Shield export
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      All 8 export formats + CPA Audit Certificate (.pdf)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      Unlimited legal notices, wealth recovery &amp; instant VS-... key
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

        {/* Homepage SEO FAQ Section */}
        <section id="faq" className="border-t border-slate-200 bg-[#f8fafc] py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">FAQ</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {HOME_FAQS.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
                >
                  <h3 className="text-sm font-bold text-slate-900">{faq.question}</h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
                </div>
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
