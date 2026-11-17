"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  FileSpreadsheet,
  RefreshCw,
  Shield,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import type { AppLang } from "@/lib/financialForensics";

interface MarketAsset {
  symbol: string;
  base: string;
  price: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  quoteVolumeM: number;
  rangePositionPct: number;
  signal: "breakout" | "dip" | "volatility" | "consolidation";
}

export interface MarketRiskTerminalProps {
  lang: AppLang;
  monthlyLeakSaved?: number;
  statementCurrency?: string;
  onJumpToConverter?: () => void;
  onJumpToAudit?: () => void;
}

const SYMBOLS_QUERY = encodeURIComponent(
  JSON.stringify([
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "BNBUSDT",
    "XRPUSDT",
    "AVAXUSDT",
    "PAXGUSDT",
    "LINKUSDT",
  ])
);

const APPROX_USD_RATE: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  TRY: 0.029,
  CAD: 0.72,
  AUD: 0.65,
  CHF: 1.13,
};

const FALLBACK_TICKERS: MarketAsset[] = [
  {
    symbol: "BTCUSDT",
    base: "BTC",
    price: 91450.0,
    change24hPct: 2.34,
    high24h: 92200.0,
    low24h: 88900.0,
    quoteVolumeM: 2840,
    rangePositionPct: 77,
    signal: "consolidation",
  },
  {
    symbol: "ETHUSDT",
    base: "ETH",
    price: 3180.5,
    change24hPct: 3.12,
    high24h: 3210.0,
    low24h: 3040.0,
    quoteVolumeM: 1420,
    rangePositionPct: 83,
    signal: "breakout",
  },
  {
    symbol: "SOLUSDT",
    base: "SOL",
    price: 214.2,
    change24hPct: 5.4,
    high24h: 217.5,
    low24h: 199.8,
    quoteVolumeM: 980,
    rangePositionPct: 81,
    signal: "volatility",
  },
  {
    symbol: "BNBUSDT",
    base: "BNB",
    price: 624.8,
    change24hPct: 1.05,
    high24h: 632.0,
    low24h: 615.0,
    quoteVolumeM: 310,
    rangePositionPct: 58,
    signal: "consolidation",
  },
  {
    symbol: "XRPUSDT",
    base: "XRP",
    price: 1.12,
    change24hPct: -4.85,
    high24h: 1.21,
    low24h: 1.1,
    quoteVolumeM: 640,
    rangePositionPct: 18,
    signal: "dip",
  },
  {
    symbol: "AVAXUSDT",
    base: "AVAX",
    price: 35.6,
    change24hPct: 4.9,
    high24h: 36.2,
    low24h: 33.4,
    quoteVolumeM: 215,
    rangePositionPct: 79,
    signal: "volatility",
  },
  {
    symbol: "PAXGUSDT",
    base: "PAXG (Gold)",
    price: 2642.0,
    change24hPct: 0.68,
    high24h: 2655.0,
    low24h: 2620.0,
    quoteVolumeM: 92,
    rangePositionPct: 63,
    signal: "consolidation",
  },
  {
    symbol: "LINKUSDT",
    base: "LINK",
    price: 15.15,
    change24hPct: 2.8,
    high24h: 15.35,
    low24h: 14.3,
    quoteVolumeM: 185,
    rangePositionPct: 81,
    signal: "consolidation",
  },
];

function classifySignal(
  rangePositionPct: number,
  change24hPct: number
): MarketAsset["signal"] {
  if (rangePositionPct >= 82 && change24hPct > 0) return "breakout";
  if (rangePositionPct <= 22) return "dip";
  if (Math.abs(change24hPct) >= 4.5) return "volatility";
  return "consolidation";
}

function roundPrice(val: number): number {
  if (val >= 1000) return Math.round(val * 10) / 10;
  if (val >= 10) return Math.round(val * 100) / 100;
  return Math.round(val * 10000) / 10000;
}

function formatPrice(val: number): string {
  if (!Number.isFinite(val)) return "$0.00";
  const decimals = val >= 100 ? 2 : val >= 1 ? 3 : 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

function formatUsd(val: number): string {
  if (!Number.isFinite(val)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function formatStatementMoney(val: number, currency: string): string {
  const sym =
    currency === "EUR"
      ? "€"
      : currency === "GBP"
        ? "£"
        : currency === "TRY"
          ? "₺"
          : "$";
  return `${sym}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(val))}`;
}

interface BinanceTickerDto {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  quoteVolume: string;
}

export default function MarketRiskTerminal({
  lang,
  monthlyLeakSaved = 0,
  statementCurrency = "USD",
  onJumpToConverter,
  onJumpToAudit,
}: MarketRiskTerminalProps) {
  const [assets, setAssets] = useState<MarketAsset[]>(FALLBACK_TICKERS);
  const [feedSource, setFeedSource] = useState<"live" | "cached">("cached");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>("Snapshot");

  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");
  const [capital, setCapital] = useState<number>(10000);
  const [riskPct, setRiskPct] = useState<number>(1.5);
  const [entryPrice, setEntryPrice] = useState<number>(91450);
  const [stopLossPrice, setStopLossPrice] = useState<number>(88706.5);
  const [takeProfitPrice, setTakeProfitPrice] = useState<number>(96937);
  const [winRatePct, setWinRatePct] = useState<number>(55);

  const fetchLiveFeed = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=${SYMBOLS_QUERY}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as BinanceTickerDto[];
      if (!Array.isArray(raw) || raw.length === 0) throw new Error("Empty feed");

      const parsed: MarketAsset[] = raw
        .map((row) => {
          const price = Number.parseFloat(row.lastPrice);
          const change24hPct = Number.parseFloat(row.priceChangePercent);
          const high24h = Number.parseFloat(row.highPrice);
          const low24h = Number.parseFloat(row.lowPrice);
          const quoteVolumeM = Math.round(Number.parseFloat(row.quoteVolume) / 1_000_000);
          const span = high24h - low24h;
          const rangePositionPct =
            span > 0
              ? Math.max(0, Math.min(100, Math.round(((price - low24h) / span) * 100)))
              : 50;
          const baseClean = row.symbol.replace(/USDT$/, "");
          return {
            symbol: row.symbol,
            base: baseClean === "PAXG" ? "PAXG (Gold)" : baseClean,
            price,
            change24hPct,
            high24h,
            low24h,
            quoteVolumeM,
            rangePositionPct,
            signal: classifySignal(rangePositionPct, change24hPct),
          };
        })
        .sort((a, b) => b.quoteVolumeM - a.quoteVolumeM);

      setAssets(parsed);
      setFeedSource("live");
      const now = new Date();
      setLastUpdatedLabel(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
      );
    } catch {
      setFeedSource("cached");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!active) return;
      await fetchLiveFeed();
    };
    void init();
    return () => {
      active = false;
    };
  }, [fetchLiveFeed]);

  const handleSelectAsset = (asset: MarketAsset) => {
    setSelectedSymbol(asset.symbol);
    setEntryPrice(roundPrice(asset.price));
    setStopLossPrice(roundPrice(asset.price * 0.97));
    setTakeProfitPrice(roundPrice(asset.price * 1.06));
  };

  const monthlyLeakUsd = useMemo(() => {
    const fx = APPROX_USD_RATE[statementCurrency] ?? 1;
    return Math.max(0, monthlyLeakSaved * fx);
  }, [monthlyLeakSaved, statementCurrency]);

  const metrics = useMemo(() => {
    const safeCapital = Math.max(100, capital);
    const safeRiskPct = Math.max(0.1, Math.min(25, riskPct));
    const maxRiskAmount = safeCapital * (safeRiskPct / 100);
    const stopDistancePerUnit = Math.abs(entryPrice - stopLossPrice);
    const stopDistancePct = entryPrice > 0 ? (stopDistancePerUnit / entryPrice) * 100 : 0;

    const positionUnits = stopDistancePerUnit > 0 ? maxRiskAmount / stopDistancePerUnit : 0;
    const positionNotional = positionUnits * entryPrice;
    const effectiveLeverage = safeCapital > 0 ? positionNotional / safeCapital : 0;

    const rewardPerUnit = Math.abs(takeProfitPrice - entryPrice);
    const rrRatio = stopDistancePerUnit > 0 ? rewardPerUnit / stopDistancePerUnit : 0;
    const projectedProfit = positionUnits * rewardPerUnit;
    const breakevenWinRatePct = rrRatio > 0 ? (1 / (1 + rrRatio)) * 100 : 100;

    const winP = Math.max(0, Math.min(100, winRatePct)) / 100;
    const lossP = 1 - winP;
    const expectedValuePerTrade = winP * projectedProfit - lossP * maxRiskAmount;
    const twentyTradeBase = safeCapital + expectedValuePerTrade * 20;
    const leakBoost12Mo = monthlyLeakUsd * 12;
    const combinedCapital = twentyTradeBase + leakBoost12Mo;

    return {
      safeCapital,
      maxRiskAmount,
      stopDistancePct,
      positionUnits,
      positionNotional,
      effectiveLeverage,
      rrRatio,
      projectedProfit,
      breakevenWinRatePct,
      expectedValuePerTrade,
      twentyTradeBase,
      combinedCapital,
      leakBoost12Mo,
    };
  }, [capital, riskPct, entryPrice, stopLossPrice, takeProfitPrice, winRatePct, monthlyLeakUsd]);

  // Build interactive SVG multi-curve coordinates (20 steps on 640x210 canvas)
  const chartData = useMemo(() => {
    const steps = 20;
    const baseSeries: number[] = [];
    const boostedSeries: number[] = [];
    const stressSeries: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const baseVal = metrics.safeCapital + metrics.expectedValuePerTrade * i;
      const leakStep = (metrics.leakBoost12Mo / steps) * i;
      const boostedVal = baseVal + leakStep;

      // Early 4-loss drawdown trough around step 4 then recovery slope
      const lossShock =
        i <= 4
          ? -metrics.maxRiskAmount * i
          : -metrics.maxRiskAmount * 4 + metrics.expectedValuePerTrade * (i - 4) * 1.15;
      const stressVal = Math.max(0, metrics.safeCapital + lossShock);

      baseSeries.push(baseVal);
      boostedSeries.push(boostedVal);
      stressSeries.push(stressVal);
    }

    const allVals = [...baseSeries, ...boostedSeries, ...stressSeries];
    const minY = Math.min(...allVals) * 0.96;
    const maxY = Math.max(...allVals) * 1.03;
    const spanY = Math.max(100, maxY - minY);

    const W = 640;
    const H = 200;
    const padX = 14;
    const padY = 18;
    const plotW = W - padX * 2;
    const plotH = H - padY * 2;

    const toCoords = (series: number[]) =>
      series.map((v, idx) => {
        const x = padX + (idx / steps) * plotW;
        const y = padY + plotH - ((v - minY) / spanY) * plotH;
        return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
      });

    const boostedPts = toCoords(boostedSeries);
    const basePts = toCoords(baseSeries);
    const stressPts = toCoords(stressSeries);

    const toLine = (pts: { x: number; y: number }[]) =>
      pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    const boostedPath = toLine(boostedPts);
    const boostedArea = `${boostedPath} L ${boostedPts[boostedPts.length - 1].x} ${H - padY} L ${boostedPts[0].x} ${H - padY} Z`;

    return {
      boostedPath,
      boostedArea,
      basePath: toLine(basePts),
      stressPath: toLine(stressPts),
      endBoosted: boostedPts[boostedPts.length - 1],
      endBase: basePts[basePts.length - 1],
      endStress: stressPts[stressPts.length - 1],
    };
  }, [metrics]);

  return (
    <div className="bg-white p-5 sm:p-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-emerald-400 shadow-xs">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {lang === "tr"
                  ? "Canlı Piyasa Radarı & Kasa Büyüme Simülatörü"
                  : "Live Market Scanner & Wealth Curve Simulator"}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === "tr"
                  ? "Canlı 24s fiyat kırılımlarını yakala, işlem riskini hesapla ve ekstre tasarruflarının 20 işlem sonu kasa eğrine etkisini izle."
                  : "Scan real-time 24h range breakouts, size risk deterministically, and project how recovered statement leaks accelerate your equity curve."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
              feedSource === "live"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                feedSource === "live" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            {feedSource === "live"
              ? `${lang === "tr" ? "Canlı Akış" : "Live Feed"} · ${lastUpdatedLabel}`
              : lang === "tr"
                ? "Referans Akış"
                : "Baseline Feed"}
          </span>

          <button
            type="button"
            onClick={() => void fetchLiveFeed()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {lang === "tr" ? "Yenile" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Interactive Obsidian SVG Equity & Leak-Compounding Chart Stage */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              {lang === "tr"
                ? "İnteraktif Kasa & Bileşik Büyüme Projeksiyonu"
                : "Interactive 20-Trade + Statement Leak Recovery Curve"}
            </span>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="mono-nums text-2xl font-extrabold text-white sm:text-3xl">
                {formatUsd(metrics.combinedCapital)}
              </span>
              <span className="mono-nums text-xs font-semibold text-emerald-400">
                +{formatUsd(metrics.combinedCapital - metrics.safeCapital)} (
                {(((metrics.combinedCapital - metrics.safeCapital) / metrics.safeCapital) * 100).toFixed(1)}
                %)
              </span>
            </div>
          </div>

          {/* Curve Legend Pills */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              {lang === "tr" ? "Strateji + Ekstre Tasarrufu" : "Strategy + Leak Recovery"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-blue-300">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
              {lang === "tr" ? "Baz Beklenti Eğrisi" : "Base Expectancy"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-300">
              <span className="h-2.5 w-2.5 rounded-full border border-rose-400" />
              {lang === "tr" ? "4 Stop Stres Tabanı" : "4-Loss Stress Floor"}
            </span>
          </div>
        </div>

        {/* SVG Area & Line Visualization */}
        <div className="mt-4 w-full">
          <svg
            viewBox="0 0 640 200"
            className="h-44 w-full sm:h-52"
            role="img"
            aria-label="Portfolio and statement leak recovery curve"
          >
            <defs>
              <linearGradient id="vaultBoostGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {[40, 90, 140, 182].map((yPos) => (
              <line
                key={yPos}
                x1="14"
                y1={yPos}
                x2="626"
                y2={yPos}
                stroke="#1e293b"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            ))}

            {/* Area & Curves */}
            <path d={chartData.boostedArea} fill="url(#vaultBoostGrad)" />
            <path
              d={chartData.stressPath}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeDasharray="5 4"
              opacity="0.85"
            />
            <path
              d={chartData.basePath}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d={chartData.boostedPath}
              fill="none"
              stroke="#34d399"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* End Points */}
            <circle cx={chartData.endStress.x} cy={chartData.endStress.y} r="4" fill="#f43f5e" />
            <circle cx={chartData.endBase.x} cy={chartData.endBase.y} r="4.5" fill="#60a5fa" />
            <circle
              cx={chartData.endBoosted.x}
              cy={chartData.endBoosted.y}
              r="5.5"
              fill="#34d399"
              stroke="#022c22"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Interactive Statement-to-Portfolio Bridge Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs">
          <div className="text-slate-300">
            {monthlyLeakSaved > 0 ? (
              lang === "tr" ? (
                <span>
                  Aktif ekstreden tespit edilen aylık{" "}
                  <strong className="text-emerald-400">
                    {formatStatementMoney(monthlyLeakSaved, statementCurrency)}
                  </strong>{" "}
                  abonelik &amp; komisyon tasarrufunun 12 aylık katkısı (
                  <strong className="text-white">+{formatUsd(metrics.leakBoost12Mo)}</strong>)
                  eğriye eklendi.
                </span>
              ) : (
                <span>
                  Annualized{" "}
                  <strong className="text-emerald-400">
                    +{formatUsd(metrics.leakBoost12Mo)}
                  </strong>{" "}
                  from your active statement ({formatStatementMoney(monthlyLeakSaved, statementCurrency)}/mo
                  leaks) is compounded into the green curve.
                </span>
              )
            ) : lang === "tr" ? (
              <span>
                Banka PDF ekstreni yükle; kesilen abonelikler otomatik olarak bu kasa eğrisini
                yukarı taşısın.
              </span>
            ) : (
              <span>
                Upload your bank PDF to inject recovered subscription &amp; bank fees directly into
                this portfolio curve.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onJumpToConverter && (
              <button
                type="button"
                onClick={onJumpToConverter}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                <FileSpreadsheet className="h-3 w-3 text-blue-400" />
                {lang === "tr" ? "Ekstre Yükle" : "Upload PDF"}
              </button>
            )}
            {onJumpToAudit && (
              <button
                type="button"
                onClick={onJumpToAudit}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
              >
                <Shield className="h-3 w-3" />
                {lang === "tr" ? "Kaçakları Kes" : "Cut Leaks"}
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout: Scanner Left (7 cols), Risk Engine Right (5 cols) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Live Anomaly & Momentum Table */}
        <div className="lg:col-span-7 overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {lang === "tr"
                ? "24s Aralık & Hacim Radarı (Satıra Tıkla)"
                : "24h Range & Momentum Feed (Click Row to Size)"}
            </span>
            <span className="text-[11px] text-slate-500">Spot / USDT</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-slate-200 bg-white text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">{lang === "tr" ? "Varlık" : "Asset"}</th>
                  <th className="px-4 py-2.5 text-right">{lang === "tr" ? "Fiyat" : "Price"}</th>
                  <th className="px-4 py-2.5 text-right">{lang === "tr" ? "24s %" : "24h %"}</th>
                  <th className="px-4 py-2.5">{lang === "tr" ? "24s Aralık Konumu" : "24h Range"}</th>
                  <th className="px-4 py-2.5 text-right">{lang === "tr" ? "Sinyal" : "Signal"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((asset) => {
                  const isSelected = selectedSymbol === asset.symbol;
                  const isPositive = asset.change24hPct >= 0;
                  return (
                    <tr
                      key={asset.symbol}
                      onClick={() => handleSelectAsset(asset)}
                      className={`cursor-pointer transition ${
                        isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {asset.base}
                        <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                          ${asset.quoteVolumeM}M
                        </span>
                      </td>
                      <td className="mono-nums px-4 py-3 text-right font-semibold text-slate-900">
                        {formatPrice(asset.price)}
                      </td>
                      <td
                        className={`mono-nums px-4 py-3 text-right font-semibold ${
                          isPositive ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        <span className="inline-flex items-center justify-end gap-0.5">
                          {isPositive ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                          {isPositive ? "+" : ""}
                          {asset.change24hPct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-slate-800"
                              style={{ width: `${asset.rangePositionPct}%` }}
                            />
                          </div>
                          <span className="mono-nums w-8 text-right text-[10px] text-slate-500">
                            {asset.rangePositionPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            asset.signal === "breakout"
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : asset.signal === "dip"
                                ? "border border-blue-200 bg-blue-50 text-blue-700"
                                : asset.signal === "volatility"
                                  ? "border border-amber-200 bg-amber-50 text-amber-800"
                                  : "border border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {asset.signal === "breakout"
                            ? lang === "tr"
                              ? "Kırılım"
                              : "Breakout"
                            : asset.signal === "dip"
                              ? lang === "tr"
                                ? "Dip Bölge"
                                : "Dip Zone"
                              : asset.signal === "volatility"
                                ? lang === "tr"
                                  ? "Oynaklık"
                                  : "High Vol"
                                : lang === "tr"
                                  ? "Kanal"
                                  : "Channel"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deterministic Position Risk & Expectancy Calculator */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                {lang === "tr"
                  ? `Kasa & Risk Hesaplayıcı (${selectedSymbol})`
                  : `Position Risk Engine (${selectedSymbol})`}
              </h3>
            </div>
            <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
              {metrics.effectiveLeverage.toFixed(2)}x Lev
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                {lang === "tr" ? "Toplam Kasa ($)" : "Account Capital ($)"}
              </label>
              <input
                type="number"
                min={100}
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value) || 0)}
                className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                {lang === "tr" ? `İşlem Riski: %${riskPct}` : `Risk Per Trade: ${riskPct}%`}
              </label>
              <input
                type="range"
                step="0.25"
                min={0.25}
                max={10}
                value={riskPct}
                onChange={(e) => setRiskPct(Number(e.target.value))}
                className="mt-3 w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                {lang === "tr" ? "Giriş Fiyatı ($)" : "Entry Price ($)"}
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value) || 0)}
                className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                {lang === "tr" ? "Stop-Loss Fiyatı ($)" : "Stop-Loss Price ($)"}
              </label>
              <input
                type="number"
                step="any"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(Number(e.target.value) || 0)}
                className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-rose-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                {lang === "tr" ? "Hedef Fiyat / TP ($)" : "Take Profit ($)"}
              </label>
              <input
                type="number"
                step="any"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(Number(e.target.value) || 0)}
                className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-emerald-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                {lang === "tr" ? `Kazanma Oranı: %${winRatePct}` : `Est. Win Rate: ${winRatePct}%`}
              </label>
              <input
                type="range"
                min={20}
                max={85}
                value={winRatePct}
                onChange={(e) => setWinRatePct(Number(e.target.value))}
                className="mt-3 w-full accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <span className="block text-[10px] font-bold uppercase text-slate-500">
                {lang === "tr" ? "Alınacak Adet & Tutar" : "Exact Position Size"}
              </span>
              <span className="mono-nums mt-1 block text-sm font-extrabold text-slate-900">
                {metrics.positionUnits.toFixed(4)} {selectedSymbol.replace(/USDT$/, "")}
              </span>
              <span className="mono-nums text-[11px] text-slate-500">
                {formatUsd(metrics.positionNotional)} ({metrics.stopDistancePct.toFixed(2)}% SL)
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <span className="block text-[10px] font-bold uppercase text-slate-500">
                {lang === "tr" ? "R:R & Stop Limiti" : "R:R & Stop Cap"}
              </span>
              <span className="mono-nums mt-1 block text-sm font-extrabold text-blue-700">
                1 : {metrics.rrRatio.toFixed(2)}
              </span>
              <span className="mono-nums text-[11px] text-rose-700">
                -{formatUsd(metrics.maxRiskAmount)} / +{formatUsd(metrics.projectedProfit)}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
                <ShieldAlert className="h-3 w-3 text-slate-400" />
                {lang === "tr" ? "Başabaş Kazanma %" : "Breakeven Win Rate"}
              </span>
              <span className="mono-nums mt-1 block text-sm font-extrabold text-slate-900">
                {metrics.breakevenWinRatePct.toFixed(1)}%
              </span>
            </div>

            <div
              className={`rounded-xl border p-3 ${
                metrics.expectedValuePerTrade >= 0
                  ? "border-emerald-200 bg-emerald-50/70"
                  : "border-rose-200 bg-rose-50/70"
              }`}
            >
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-600">
                <TrendingUp className="h-3 w-3" />
                {lang === "tr" ? "20 İşlem Baz Kasa" : "20-Trade Expectancy"}
              </span>
              <span
                className={`mono-nums mt-1 block text-sm font-extrabold ${
                  metrics.expectedValuePerTrade >= 0 ? "text-emerald-800" : "text-rose-800"
                }`}
              >
                {formatUsd(metrics.twentyTradeBase)}
              </span>
              <span className="mono-nums text-[11px] text-slate-600">
                EV: {metrics.expectedValuePerTrade >= 0 ? "+" : ""}
                {formatUsd(metrics.expectedValuePerTrade)}/trade
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
