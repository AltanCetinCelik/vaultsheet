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
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10 bg-[#070a0f]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold text-white">VaultSheet</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Workbench
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Terms of Service &amp; Refund Policy
        </h1>
        <p className="mt-2 text-xs text-slate-400">Last updated: November 2026</p>

        <div className="mt-8 space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="rounded-2xl border border-white/10 bg-[#0d121b] p-6">
            <h2 className="text-base font-semibold text-white">1. License Grant</h2>
            <p className="mt-2">
              <strong>Free Preview:</strong> Grants unlimited local statement parsing, balance
              audit inspection, built-in sample downloads, and free export of up to 25 transactions
              per uploaded statement so you can confirm QuickBooks, Xero, or Excel compatibility
              before purchasing.
            </p>
            <p className="mt-2">
              <strong>7-Day Audit Pass ($12 one-time) &amp; Pro Bookkeeper ($19/month):</strong>{" "}
              Grant full commercial rights to convert unlimited transactions across multiple client
              and business statements into Excel (`.xlsx`), CSV, `.qbo`, `.ofx`, and Xero CSV.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d121b] p-6">
            <h2 className="text-base font-semibold text-white">2. 14-Day Refund Guarantee</h2>
            <p className="mt-2">
              If your PDF statement format fails to parse accurately, produces reconciliation errors
              we cannot resolve, or fails to import cleanly into QuickBooks or Xero, email{" "}
              <a
                href="mailto:support@vaultsheet.tech"
                className="text-emerald-400 underline underline-offset-2"
              >
                support@vaultsheet.tech
              </a>{" "}
              with your order receipt within 14 days of purchase for a prompt, full refund—or send
              us the column layout header screenshot (without sensitive data) and we will add support.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d121b] p-6">
            <h2 className="text-base font-semibold text-white">
              3. Accounting Verification Responsibility
            </h2>
            <p className="mt-2">
              VaultSheet provides deterministic mathematical balance auditing (`Opening + Credits -
              Debits = Closing`) to surface potential parsing discrepancies. Final review of ledger
              categorization and tax reporting remains the responsibility of the account holder or
              their CPA/bookkeeper.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d121b] p-6">
            <h2 className="text-base font-semibold text-white">4. Merchant of Record</h2>
            <p className="mt-2">
              Billing, receipts, and international sales taxes are handled securely by our Merchant
              of Record checkout provider. Monthly Pro Bookkeeper plans may be canceled at any
              time via the customer portal link on your purchase receipt.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
