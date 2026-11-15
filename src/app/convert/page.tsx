import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import BankDirectoryClient from "@/components/BankDirectoryClient";
import { SEO_BANKS } from "@/lib/seoCatalog";

export const metadata: Metadata = {
  title: `Supported Banks & Accounting Formats (${SEO_BANKS.length} Converters)`,
  description: `Browse all ${SEO_BANKS.length} browser-local PDF bank statement converters for US, UK, EU, Canadian, Australian, and global fintech banks to Excel, CSV, QBO, and Xero.`,
  alternates: {
    canonical: "/convert",
  },
};

export default function ConvertDirectoryPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10 bg-[#070a0f]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Bank &amp; Format Directory
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {SEO_BANKS.length} Supported Bank Statement Converters
          </h1>
          <p className="mt-3 text-sm text-slate-300 sm:text-base leading-relaxed">
            Select your bank or accounting format below for a dedicated workspace pre-configured
            with date locale rules, column layout detection, and cent-level audit verification—100%
            inside browser memory.
          </p>
        </div>

        <div className="mt-8">
          <BankDirectoryClient banks={SEO_BANKS} />
        </div>
      </main>
    </div>
  );
}
