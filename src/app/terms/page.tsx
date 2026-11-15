import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service & 14-Day Refund Guarantee",
  description:
    "VaultSheet licensing terms for personal, small business, and commercial CPA bookkeeping workflows, including our 14-day no-questions-asked refund guarantee.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Terms of Service &amp; Refund Policy
        </h1>
        <p className="mt-2 text-xs text-slate-500">Last updated: November 2026</p>

        <div className="mt-8 space-y-5 text-sm text-slate-600 leading-relaxed">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">1. License Grant</h2>
            <p className="mt-2">
              <strong className="text-slate-900">Free Preview:</strong> Grants unlimited local statement parsing, balance
              audit inspection, built-in sample downloads, and free export of up to 25 transactions
              per uploaded statement so you can confirm QuickBooks, Xero, or Excel compatibility
              before purchasing.
            </p>
            <p className="mt-2">
              <strong className="text-slate-900">7-Day Audit Pass ($12 one-time) &amp; Annual Pro Bookkeeper ($29/year one-time):</strong>{" "}
              Grant full commercial rights to convert unlimited transactions across multiple client
              and business statements into Excel (`.xlsx`), CSV, `.qbo`, `.ofx`, and Xero CSV.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">2. 14-Day Refund Guarantee</h2>
            <p className="mt-2">
              If your PDF statement format fails to parse accurately, produces reconciliation errors
              we cannot resolve, or fails to import cleanly into QuickBooks or Xero, email{" "}
              <a
                href="mailto:support@vaultsheet.tech"
                className="font-medium text-blue-600 underline underline-offset-2"
              >
                support@vaultsheet.tech
              </a>{" "}
              with your order receipt within 14 days of purchase for a prompt, full refund&mdash;or send
              us the column layout header screenshot (without sensitive data) and we will add support.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">
              3. Accounting Verification Responsibility
            </h2>
            <p className="mt-2">
              VaultSheet provides deterministic mathematical balance auditing (`Opening + Credits -
              Debits = Closing`) to surface potential parsing discrepancies. Final review of ledger
              categorization and tax reporting remains the responsibility of the account holder or
              their CPA/bookkeeper.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">4. Merchant of Record</h2>
            <p className="mt-2">
              Billing, receipts, and international sales taxes are handled securely by our Merchant
              of Record checkout provider (Polar.sh). Neither pass auto-renews; manage receipts via
              the customer portal link on your confirmation email.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
