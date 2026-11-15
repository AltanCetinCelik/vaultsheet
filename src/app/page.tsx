import Link from "next/link";
import {
  ArrowRight,
  Check,
  Chrome,
  Cpu,
  FileSpreadsheet,
  Lock,
  ShieldCheck,
  Sparkles,
  Terminal,
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
    <div className="min-h-screen flex flex-col">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070a0f]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-100">
              VaultSheet
            </span>
            <span className="hidden sm:inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
              Local RAM Engine
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a href="#workbench" className="hover:text-white transition-colors">
              Workbench
            </a>
            <Link href="/convert" className="hover:text-white transition-colors">
              {SEO_BANKS.length} Banks &amp; Formats
            </Link>
            <a href="#security" className="hover:text-white transition-colors">
              Zero-Upload Proof
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#extension" className="hover:text-white transition-colors">
              Chrome Extension
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/convert"
              className="hidden sm:inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
            >
              Browse {SEO_BANKS.length} Banks
            </Link>
            <a
              href="#workbench"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              Launch Converter
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-white/10 grid-backdrop">
          <div className="mx-auto max-w-7xl px-4 pt-12 pb-10 sm:px-6 lg:px-8 lg:pt-16">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300">
                <Lock className="h-3.5 w-3.5" />
                <span>0 KB uploaded to any server — runs 100% inside your browser RAM</span>
              </div>

              <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-5xl sm:leading-[1.1]">
                Convert PDF Bank Statements to{" "}
                <span className="text-emerald-400">Reconciled Excel, QBO &amp; Xero</span>
              </h1>

              <p className="mt-4 text-base text-slate-300 sm:text-lg leading-relaxed">
                Drop any multi-page Chase, Wise, Mercury, Revolut, or international bank PDF.
                VaultSheet extracts X/Y coordinate tables locally, stitches wrapped descriptions,
                and mathematically verifies every row to the exact cent.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0d121b] px-3 py-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Opening + Credits - Debits = Closing Verified
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0d121b] px-3 py-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  7 Formats: XLSX, CSV, QBO, Xero, OFX, JSON
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0d121b] px-3 py-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  No Account Required ({FREE_ROW_LIMIT} Free Rows)
                </span>
              </div>
            </div>

            {/* Live Interactive Workbench Right in Hero */}
            <div id="workbench" className="mt-10 scroll-mt-20">
              <ConverterWorkbench defaultPreset="chase" />
            </div>
          </div>
        </section>

        {/* Competitor Comparison Section */}
        <section className="border-b border-white/10 bg-[#090d14] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Built for Bookkeepers Who Refuse to Upload Client PDFs
              </h2>
              <p className="mt-3 text-sm text-slate-400 sm:text-base">
                Legacy cloud converters queue your sensitive financial statements on third-party
                servers and charge $50+/month subscriptions even for a single tax-season audit.
              </p>
            </div>

            <div className="mt-10 overflow-x-auto rounded-2xl border border-white/10 bg-[#0d121b]">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-4 font-semibold">Capability</th>
                    <th className="px-5 py-4 font-semibold text-emerald-400">VaultSheet</th>
                    <th className="px-5 py-4 font-semibold">Cloud PDF Converters</th>
                    <th className="px-5 py-4 font-semibold">ChatGPT / Manual Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-slate-300">
                  <tr>
                    <td className="px-5 py-4 font-medium text-white">Server Upload Exposure</td>
                    <td className="px-5 py-4 text-emerald-300 font-medium">
                      Zero bytes (Browser RAM Web Worker)
                    </td>
                    <td className="px-5 py-4 text-rose-300">Uploads full PDF to remote cloud</td>
                    <td className="px-5 py-4 text-amber-300">Sent to external AI endpoints</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-medium text-white">
                      Cent-by-Cent Math Audit
                    </td>
                    <td className="px-5 py-4 text-emerald-300">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> Flags exact cent discrepancies inline
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">Rarely checks row continuity</td>
                    <td className="px-5 py-4 text-rose-300">
                      <span className="inline-flex items-center gap-1.5">
                        <X className="h-4 w-4" /> Silent arithmetic hallucinations
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-medium text-white">
                      Multi-Line Description Stitching
                    </td>
                    <td className="px-5 py-4 text-emerald-300">
                      Merges wrapped memos automatically
                    </td>
                    <td className="px-5 py-4 text-slate-400">Often splits into blank orphan rows</td>
                    <td className="px-5 py-4 text-slate-400">Requires prompt engineering</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-medium text-white">Accounting Formats</td>
                    <td className="px-5 py-4 text-emerald-300">
                      XLSX (3-sheet), CSV, QBO, Xero, OFX, JSON
                    </td>
                    <td className="px-5 py-4 text-slate-400">Usually CSV / XLSX only</td>
                    <td className="px-5 py-4 text-slate-400">Markdown / raw CSV copy-paste</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-medium text-white">One-Off Tax Season Pricing</td>
                    <td className="px-5 py-4 text-emerald-300 font-semibold">
                      $12 for 7-Day Pass (no renewal trap)
                    </td>
                    <td className="px-5 py-4 text-slate-400">$30–$99/mo recurring plans</td>
                    <td className="px-5 py-4 text-slate-400">$20/mo + manual cleanup hours</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Security & Architecture Proof */}
        <section id="security" className="border-b border-white/10 py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0d121b] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  X/Y Coordinate Geometry Engine
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Instead of brittle regex on flattened text, VaultSheet clusters every PDF glyph by
                  page, Y-baseline, and horizontal column bounds using a local PDF.js Web Worker.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0d121b] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <Terminal className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  Verifiable Zero-Network Audit
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Open Chrome DevTools &rarr; Network tab before dropping your statement. Watch
                  0 bytes leave your machine—even if you switch your Wi-Fi off after loading the
                  page.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0d121b] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  Audit-Ready 3-Sheet Workbooks
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Every Excel download includes a formatted Transactions ledger, a Reconciliation
                  Summary proving zero cent drift, and a Category Spend Rollup sheet.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="border-b border-white/10 bg-[#090d14] py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Simple, Transparent Pricing — Zero Account Friction
              </h2>
              <p className="mt-3 text-sm text-slate-400 sm:text-base">
                Test extraction and audit math completely free. Unlock unlimited rows only when
                your numbers tie out 100%.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {/* Free Tier */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d121b] p-7">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Free Preview</h3>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                      No Sign-Up
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white mono-nums">$0</span>
                    <span className="text-sm text-slate-400">forever</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Verify accuracy on your actual bank statement before paying a cent.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      Full PDF parsing &amp; reconciliation audit
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      Export up to {FREE_ROW_LIMIT} rows per file
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      All 4 downloadable binary PDF samples
                    </li>
                  </ul>
                </div>
                <a
                  href="#workbench"
                  className="mt-8 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  Start Free in Workbench
                </a>
              </div>

              {/* 7-Day Pass */}
              <div className="flex flex-col justify-between rounded-2xl border-2 border-emerald-500/60 bg-[#0d121b] p-7 shadow-lg shadow-emerald-950/30">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">7-Day Tax &amp; Audit Pass</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                      <Sparkles className="h-3 w-3" /> Most Popular
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white mono-nums">$12</span>
                    <span className="text-sm text-slate-400">one-time pass</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Built for quarterly close, mortgage underwriting, or tax filing sprints. No
                    auto-renewal.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      Unlimited rows &amp; multi-file statement merge
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      All 7 export formats (XLSX, QBO, Xero, OFX)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      Instant offline-verified license key (VS-PASS-...)
                    </li>
                  </ul>
                </div>
                <a
                  href={passCheckout}
                  target={passCheckout.startsWith("http") ? "_blank" : undefined}
                  rel={passCheckout.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
                >
                  Get 7-Day Pass ($12)
                </a>
              </div>

              {/* Pro Bookkeeper Monthly */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d121b] p-7">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Pro Bookkeeper</h3>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                      Firms &amp; CPAs
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white mono-nums">$19</span>
                    <span className="text-sm text-slate-400">/ month</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Continuous high-volume client statement processing &amp; extension access.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      Everything in 7-Day Pass, unlimited months
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      Commercial multi-client bookkeeping license
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      Priority custom bank layout request turnaround
                    </li>
                  </ul>
                </div>
                <a
                  href={proCheckout}
                  target={proCheckout.startsWith("http") ? "_blank" : undefined}
                  rel={proCheckout.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-8 inline-flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                >
                  Activate Pro Bookkeeper ($19/mo)
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Chrome Extension Section */}
        <section id="extension" className="border-b border-white/10 py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-8 rounded-2xl border border-white/10 bg-[#0d121b] p-8 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                  <Chrome className="h-3.5 w-3.5" /> Manifest V3 Chrome Extension Included
                </span>
                <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                  Convert Statements Directly Inside Your Browser Toolbar
                </h2>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Just downloaded a statement from your online banking portal or reviewing QuickBooks
                  in a tab? Click the VaultSheet extension icon to inspect transaction totals and
                  export CSV or QBO immediately—without switching apps or uploading files.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a
                    href="/vaultsheet-chrome-extension.zip"
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
                  >
                    Download Extension (.zip)
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                  <Link
                    href="/convert"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    Explore Supported Formats
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#070a0f] p-5 font-mono text-xs text-slate-300">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 text-slate-400">
                  <span>chrome-extension/manifest.json</span>
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                    MV3 Offline Safe
                  </span>
                </div>
                <pre className="mt-3 overflow-x-auto leading-relaxed text-slate-300">
{`{
  "manifest_version": 3,
  "name": "VaultSheet — Local Bank Statement Converter",
  "permissions": ["downloads"],
  "host_permissions": [],
  "action": { "default_popup": "popup.html" }
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Global Bank Directory Preview */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Dedicated Converters for {SEO_BANKS.length} Global Banks &amp; Formats
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Pre-tuned date conventions, decimal separators, and column detection profiles
                  across major US, UK, EU, Canadian, Australian, and global fintech institutions.
                </p>
              </div>
              <Link
                href="/convert"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors shrink-0"
              >
                View All {SEO_BANKS.length} Converters
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {REGION_COUNTS.map((item) => (
                <Link
                  key={item.region}
                  href="/convert"
                  className="rounded-lg border border-white/10 bg-[#0d121b] px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-white transition-colors"
                >
                  {item.region}: <span className="font-semibold text-emerald-400">{item.count}</span>
                </Link>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredBanks.map((bank) => (
                <Link
                  key={bank.slug}
                  href={`/convert/${bank.slug}`}
                  className="group rounded-xl border border-white/10 bg-[#0d121b] p-5 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{bank.region}</span>
                    <span className="mono-nums rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                      {bank.currency}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    {bank.bankName} to Excel &amp; QBO
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">
                    {bank.metaDescription}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#070a0f] py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">VaultSheet</span>
            <span>&middot; 100% Client-Side PDF Financial Extraction</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/convert" className="hover:text-white transition-colors">
              Supported Banks ({SEO_BANKS.length})
            </Link>
            <Link
              href="/convert/pdf-bank-statement-to-qbo"
              className="hover:text-white transition-colors"
            >
              PDF to QBO
            </Link>
            <Link
              href="/convert/pdf-bank-statement-to-xero-csv"
              className="hover:text-white transition-colors"
            >
              PDF to Xero
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms &amp; Refunds
            </Link>
            <a href="/llms.txt" className="hover:text-white transition-colors">
              llms.txt
            </a>
            <a href="/sitemap.xml" className="hover:text-white transition-colors">
              sitemap.xml
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
