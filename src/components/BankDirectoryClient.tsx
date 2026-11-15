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
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0d121b] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bank name, country, currency (e.g. Chase, GBP, Revolut, QBO)..."
            aria-label="Search supported banks and formats"
            className="w-full rounded-xl border border-white/15 bg-[#070a0f] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/60 focus:outline-none"
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
                    ? "bg-emerald-500 text-slate-950 font-semibold"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Showing <span className="font-semibold text-white">{filtered.length}</span> of{" "}
        {banks.length} converter templates
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((entry) => (
          <Link
            key={entry.slug}
            href={`/convert/${entry.slug}`}
            className="group flex flex-col justify-between rounded-xl border border-white/10 bg-[#0d121b] p-5 hover:border-emerald-500/50 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">
                  {entry.region}
                </span>
                <span className="mono-nums text-emerald-400 font-medium">{entry.currency}</span>
              </div>
              <h2 className="mt-3 text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
                {entry.bankName}
              </h2>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-2">
                {entry.metaDescription}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-slate-400">
              <span>Date: {entry.dateFormat}</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                Open Converter <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
