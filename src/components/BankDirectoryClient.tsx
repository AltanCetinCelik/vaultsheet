"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import type { SeoBankEntry } from "@/lib/types";

const REGIONS: Array<"All" | SeoBankEntry["region"]> = [
  "All",
  "US",
  "UK",
  "EU",
  "Canada",
  "Australia",
  "Global",
  "Format",
];

export default function BankDirectoryClient({ banks }: { banks: SeoBankEntry[] }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<"All" | SeoBankEntry["region"]>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return banks.filter((entry) => {
      if (region !== "All" && entry.region !== region) return false;
      if (!q) return true;
      return (
        entry.bankName.toLowerCase().includes(q) ||
        entry.shortName.toLowerCase().includes(q) ||
        entry.currency.toLowerCase().includes(q) ||
        entry.region.toLowerCase().includes(q) ||
        entry.keywords.some((kw) => kw.toLowerCase().includes(q))
      );
    });
  }, [banks, query, region]);

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bank name, country, currency (e.g. Chase, GBP, Revolut, QBO)..."
            aria-label="Search supported banks and formats"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {REGIONS.map((item) => {
            const active = region === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setRegion(item)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-slate-900 font-semibold text-white shadow-2xs"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-900">{filtered.length}</span> of{" "}
        {banks.length} converter templates
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((entry) => (
          <Link
            key={entry.slug}
            href={`/convert/${entry.slug}`}
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-600">
                  {entry.region}
                </span>
                <span className="mono-nums font-semibold text-slate-700">{entry.currency}</span>
              </div>
              <h2 className="mt-3 text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {entry.bankName}
              </h2>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-2">
                {entry.metaDescription}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
              <span>Date: {entry.dateFormat}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                Open Converter <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
