import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Zero-Upload Local Browser Processing",
  description:
    "VaultSheet processes financial PDF, CSV, and bank statements strictly inside your local browser RAM. Zero statement files or transactions ever touch external servers.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-2xs transition group-hover:bg-blue-600">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900">VaultSheet</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Workbench
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
          Zero-Knowledge Client-Side Architecture
        </p>

        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs text-slate-500">Last updated: November 2026</p>

        <div className="mt-8 space-y-5 text-sm text-slate-600 leading-relaxed">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">
              1. Zero Server Uploads for Financial Statements
            </h2>
            <p className="mt-2">
              VaultSheet is engineered so your PDF, CSV, and pasted OCR bank statements never leave
              your computer. Parsing (`pdfjs-dist` Web Worker), coordinate alignment, running balance
              reconciliation, and file generation (`.xlsx`, `.csv`, `.qbo`, `.ofx`, `.json`) run
              exclusively inside your local browser memory (RAM).
            </p>
            <p className="mt-2 text-slate-500">
              We do not store, log, inspect, transmit, or train any model on your bank files,
              balances, merchant names, or account numbers. You can verify this in Chrome DevTools
              &rarr; Network tab while converting any statement.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">
              2. Browser Storage &amp; License Activation
            </h2>
            <p className="mt-2">
              If you activate a VaultSheet 7-Day Pass or Annual Pro license key, your browser
              stores only the activated license key string inside `window.localStorage`
              (`vaultsheet_pro_license_v1`) so you remain unlocked across page reloads. Verification
              checksums are evaluated locally without server tracking beacons.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">
              3. Payments &amp; Merchant of Record (GDPR / CCPA)
            </h2>
            <p className="mt-2">
              Paid checkouts, VAT/sales-tax collection, invoicing, and payment card handling are
              processed by our external Merchant of Record (Polar.sh). VaultSheet does not directly
              handle or store credit card numbers on its servers.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">4. Chrome Extension Permissions</h2>
            <p className="mt-2">
              The VaultSheet Manifest V3 Chrome Extension requests only the `downloads` permission
              strictly to save your locally exported `.csv` and `.qbo` files to your computer. It
              declares zero `host_permissions` and does not read browsing history or page DOM data.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">5. Contact</h2>
            <p className="mt-2">
              Questions regarding privacy, enterprise CPA compliance, or billing receipts may be
              directed to{" "}
              <a
                href="mailto:support@vaultsheet.tech"
                className="font-medium text-blue-600 underline underline-offset-2"
              >
                support@vaultsheet.tech
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
