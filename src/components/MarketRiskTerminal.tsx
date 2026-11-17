"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  RefreshCw,
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

interface BinanceTickerDto {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  quoteVolume: string;
}

export default function MarketRiskTerminal({ lang }: { lang: AppLang }) {
  const [assets, setAssets] = useState<MarketAsset[]>(FALLBACK_TICKERS);
  const [feedSource, setFeedSource] = useState<"live" | "cached">("cached");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>("Baseline snapshot");

  // Deterministic Position Size & Expectancy Inputs
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
            span > 0 ? Math.max(0, Math.min(100, Math.round(((price - low24h) / span) * 100))) : 50;
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

  const metrics = useMemo(() => {
    const safeCapital = Math.max(0, capital);
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
    const twentyTradeProjectedCapital = safeCapital + expectedValuePerTrade * 20;

    return {
      maxRiskAmount,
      stopDistancePct,
      positionUnits,
      positionNotional,
      effectiveLeverage,
      rrRatio,
      projectedProfit,
      breakevenWinRatePct,
      expectedValuePerTrade,
      twentyTradeProjectedCapital,
    };
  }, [capital, riskPct, entryPrice, stopLossPrice, takeProfitPrice, winRatePct]);

  return (
    <div className="bg-white p-5 sm:p-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Activity className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              {lang === "tr"
                ? "Canlı Piyasa Anomali Tarayıcısı & Pozisyon Risk Terminali"
                : "Live Market Scanner & Position Risk Terminal"}
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {lang === "tr"
              ? "Anlık 24s fiyat/aralık taraması yap, varlık seç ve işlem başına kasa riskini kuruşu kuruşuna hesapla."
              : "Scan real-time 24h range momentum, click any pair, and deterministically size your risk & stop-loss."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              feedSource === "live"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                feedSource === "live" ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {feedSource === "live"
              ? `${lang === "tr" ? "Canlı Akış" : "Live Feed"} · ${lastUpdatedLabel}`
              : lang === "tr"
                ? "Referans Veri"
                : "Baseline Feed"}
          </span>

          <button
            type="button"
            onClick={() => void fetchLiveFeed()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {lang === "tr" ? "Veriyi Yenile" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout: Scanner Left (7 cols), Risk Engine Right (5 cols) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Live Anomaly & Momentum Table */}
        <div className="lg:col-span-7 overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {lang === "tr"
                ? "24s Aralık & Hacim Taraması (Satıra Tıkla)"
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
                  <th className="px-4 py-2.5 text-right">{lang === "tr" ? "Durum" : "Signal"}</th>
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
                                  ? "Hacim/Oynaklık"
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
                  ? `Kasa & Pozisyon Hesaplayıcı (${selectedSymbol})`
                  : `Position Risk Engine (${selectedSymbol})`}
              </h3>
            </div>
            <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
              {metrics.effectiveLeverage.toFixed(2)}x Lev
            </span>
          </div>

          {/* Numeric Inputs Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                {lang === "tr" ? "Toplam Kasa ($)" : "Account Capital ($)"}
              </label>
              <input
                type="number"
                min={1}
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value) || 0)}
                className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                {lang === "tr" ? "İşlem Başı Risk (%)" : "Risk Per Trade (%)"}
              </label>
              <input
                type="number"
                step="0.25"
                min={0.1}
                max={25}
                value={riskPct}
                onChange={(e) => setRiskPct(Number(e.target.value) || 0.1)}
                className="mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
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
                className="mt-3 w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Deterministic Results Summary */}
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
                {lang === "tr" ? "R:R & Max Stop Zararı" : "R:R & Max Stop Loss"}
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
                {lang === "tr" ? "20 İşlem Sonu Kasa" : "20-Trade Expectancy"}
              </span>
              <span
                className={`mono-nums mt-1 block text-sm font-extrabold ${
                  metrics.expectedValuePerTrade >= 0 ? "text-emerald-800" : "text-rose-800"
                }`}
              >
                {formatUsd(metrics.twentyTradeProjectedCapital)}
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
