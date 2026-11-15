import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import ConverterWorkbench from "@/components/ConverterWorkbench";
import { getSeoBankBySlug, SEO_BANKS } from "@/lib/seoCatalog";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SEO_BANKS.map((entry) => ({
    slug: entry.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getSeoBankBySlug(slug);
  if (!entry) {
    return {
      title: "Converter Not Found",
    };
  }

  return {
    title: entry.title,
    description: entry.metaDescription,
    keywords: entry.keywords,
    alternates: {
      canonical: `/convert/${entry.slug}`,
    },
    openGraph: {
      title: entry.title,
      description: entry.metaDescription,
      type: "article",
    },
  };
}

export default async function BankConverterPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getSeoBankBySlug(slug);
  if (!entry) {
    notFound();
  }

  const related = SEO_BANKS.filter(
    (other) => other.slug !== entry.slug && other.region === entry.region,
  ).slice(0, 6);

  const fallbackRelated =
    related.length >= 6
      ? related
      : [
          ...related,
          ...SEO_BANKS.filter(
            (other) => other.slug !== entry.slug && other.region !== entry.region,
          ).slice(0, 6 - related.length),
        ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entry.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <header className="border-b border-white/10 bg-[#070a0f]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold text-white">VaultSheet</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/convert"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All {SEO_BANKS.length} Banks
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/convert" className="hover:text-white transition-colors">
            Converters
          </Link>
          <span>/</span>
          <span className="text-emerald-400">{entry.shortName}</span>
        </nav>

        {/* Page Intro */}
        <div className="mt-5 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Lock className="h-3.5 w-3.5" />
            <span>
              {entry.region} &middot; {entry.currency} &middot; 100% Browser RAM Execution
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {entry.title}
          </h1>
          <p className="mt-3 text-base text-slate-300 leading-relaxed">
            {entry.metaDescription}
          </p>
        </div>

        {/* Interactive Pre-configured Workbench */}
        <section className="mt-8">
          <ConverterWorkbench
            defaultPreset={entry.samplePreset}
            contextBankName={entry.bankName}
          />
        </section>

        {/* Statement Profile Specs & Pain Points */}
        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#0d121b] p-6">
            <h2 className="text-lg font-semibold text-white">
              {entry.shortName} Statement Format Profile
            </h2>
            <dl className="mt-4 divide-y divide-white/10 text-sm">
              <div className="flex items-center justify-between py-3">
                <dt className="text-slate-400">Region / Institution Scope</dt>
                <dd className="font-medium text-white">{entry.region}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-slate-400">Primary Currency</dt>
                <dd className="mono-nums font-medium text-emerald-400">{entry.currency}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-slate-400">Date Normalization Rule</dt>
                <dd className="mono-nums font-medium text-white">{entry.dateFormat}</dd>
              </div>
              <div className="py-3">
                <dt className="text-slate-400">Column Geometry Profile</dt>
                <dd className="mt-1 font-medium text-slate-200">{entry.columnLayout}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d121b] p-6">
            <h2 className="text-lg font-semibold text-white">
              What VaultSheet Fixes Automatically for {entry.shortName}
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {entry.painPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQs */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-[#0d121b] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white">
            Frequently Asked Questions — {entry.bankName}
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {entry.faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border border-white/10 bg-[#070a0f] p-5">
                <h3 className="text-sm font-semibold text-white">{faq.question}</h3>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Banks */}
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Related Statement Converters</h2>
            <Link
              href="/convert"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              Browse All {SEO_BANKS.length} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fallbackRelated.map((rel) => (
              <Link
                key={rel.slug}
                href={`/convert/${rel.slug}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0d121b] px-4 py-3 text-sm text-slate-200 hover:border-emerald-500/40 hover:text-white transition-colors"
              >
                <span>{rel.bankName}</span>
                <span className="mono-nums text-xs text-emerald-400">{rel.currency}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
