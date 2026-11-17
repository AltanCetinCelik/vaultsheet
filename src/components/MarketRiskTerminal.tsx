"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Activity,
  Award,
  CheckCircle2,
  Download,
  Lock,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { AppLang } from "@/lib/financialForensics";
import {
  generateFallbackCandles,
  optimizeStrategyConfig,
  runStrategyBacktest,
  runStrategyTournament,
  type BacktestResult,
  type OHLCVCandle,
  type StrategyId,
  type TimeframeId,
} from "@/lib/quantBacktester";

export interface MarketRiskTerminalProps {
  lang: AppLang;
  isPaid?: boolean;
  onRequireUpgrade?: (reason: string) => void;
}

interface AssetSpec {
  symbol: string;
  label: string;
  proOnly?: boolean;
}

const ASSETS: AssetSpec[] = [
  { symbol: "BTCUSDT", label: "BTC" },
  { symbol: "ETHUSDT", label: "ETH" },
  { symbol: "SOLUSDT", label: "SOL" },
  { symbol: "BNBUSDT", label: "BNB" },
  { symbol: "PAXGUSDT", label: "PAXG Gold" },
  { symbol: "XRPUSDT", label: "XRP", proOnly: true },
  { symbol: "AVAXUSDT", label: "AVAX", proOnly: true },
  { symbol: "DOGEUSDT", label: "DOGE", proOnly: true },
  { symbol: "SUIUSDT", label: "SUI", proOnly: true },
  { symbol: "LINKUSDT", label: "LINK", proOnly: true },
];

const TIMEFRAMES: { id: TimeframeId; label: string; proOnly?: boolean }[] = [
  { id: "15m", label: "15m", proOnly: true },
  { id: "1h", label: "1H" },
  { id: "4h", label: "4H" },
  { id: "1d", label: "1D", proOnly: true },
];

const FREE_OPT_STORAGE_KEY = "vaultsheet_free_opt_used_v1";
const FREE_OPT_EVENT = "vaultsheet-free-opt-changed";

function subscribeOptStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(FREE_OPT_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(FREE_OPT_EVENT, handler);
  };
}

function loadRawOptFlag(): string {
  if (typeof window === "undefined") return "0";
  return window.localStorage.getItem(FREE_OPT_STORAGE_KEY) ?? "0";
}

function getServerOptSnapshot(): string {
  return "0";
}

function formatPrice(val: number): string {
  if (!Number.isFinite(val)) return "$0.00";
  const decimals = val >= 100 ? 2 : val >= 5 ? 2 : 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

function formatUsd(val: number): string {
  if (!Number.isFinite(val)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function formatShortDate(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

export default function MarketRiskTerminal({
  lang,
  isPaid = false,
  onRequireUpgrade,
}: MarketRiskTerminalProps) {
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [timeframe, setTimeframe] = useState<TimeframeId>("4h");
  const [candles, setCandles] = useState<OHLCVCandle[]>(() =>
    generateFallbackCandles("BTCUSDT", "4h", 300)
  );
  const [feedMode, setFeedMode] = useState<"live" | "simulated">("simulated");
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(false);

  // Backtest strategy parameters
  const [selectedStrategyId, setSelectedStrategyId] =
    useState<StrategyId>("donchian_breakout");
  const [hasPickedStrategyManually, setHasPickedStrategyManually] =
    useState<boolean>(false);
  const [capital, setCapital] = useState<number>(10000);
  const [stopLossPct, setStopLossPct] = useState<number>(2.5);
  const [takeProfitPct, setTakeProfitPct] = useState<number>(7.0);
  const [leverage, setLeverage] = useState<number>(2);
  const [fastPeriod, setFastPeriod] = useState<number>(9);
  const [slowPeriod, setSlowPeriod] = useState<number>(21);
  const [optMessage, setOptMessage] = useState<string | null>(null);

  const rawFreeOptFlag = useSyncExternalStore(
    subscribeOptStorage,
    loadRawOptFlag,
    getServerOptSnapshot
  );
  const freeOptUsed = rawFreeOptFlag === "1";

  const loadCandles = useCallback(async (sym: string, tf: TimeframeId) => {
    setIsLoadingFeed(true);
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(tf)}&limit=300`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as unknown[][];
      if (!Array.isArray(raw) || raw.length < 50) throw new Error("Insufficient bars");

      const parsed: OHLCVCandle[] = raw.map((row) => ({
        time: Number(row[0]),
        open: Number.parseFloat(String(row[1])),
        high: Number.parseFloat(String(row[2])),
        low: Number.parseFloat(String(row[3])),
        close: Number.parseFloat(String(row[4])),
        volume: Number.parseFloat(String(row[5])),
      }));

      setCandles(parsed);
      setFeedMode("live");
    } catch {
      setCandles(generateFallbackCandles(sym, tf, 300));
      setFeedMode("simulated");
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      await loadCandles(symbol, timeframe);
    };
    void run();
    return () => {
      active = false;
    };
  }, [symbol, timeframe, loadCandles]);

  // Run all 6 strategies simultaneously in real time
  const tournament = useMemo<BacktestResult[]>(() => {
    return runStrategyTournament(candles, {
      capital,
      leverage,
      stopLossPct,
      takeProfitPct,
      feePct: 0.08,
      fastPeriod,
      slowPeriod,
      rsiOversold: 32,
      rsiOverbought: 70,
    });
  }, [candles, capital, leverage, stopLossPct, takeProfitPct, fastPeriod, slowPeriod]);

  // Auto-select tournament #1 unless user clicked a specific strategy manually
  const activeStrategyId: StrategyId = hasPickedStrategyManually
    ? selectedStrategyId
    : (tournament[0]?.strategyId ?? selectedStrategyId);

  const activeResult = useMemo<BacktestResult>(() => {
    const found = tournament.find((r) => r.strategyId === activeStrategyId);
    if (found) return found;
    return runStrategyBacktest(candles, {
      strategyId: activeStrategyId,
      capital,
      leverage,
      stopLossPct,
      takeProfitPct,
      feePct: 0.08,
      fastPeriod,
      slowPeriod,
      rsiOversold: 32,
      rsiOverbought: 70,
    });
  }, [
    tournament,
    activeStrategyId,
    candles,
    capital,
    leverage,
    stopLossPct,
    takeProfitPct,
    fastPeriod,
    slowPeriod,
  ]);

  const handleSelectAsset = (asset: AssetSpec) => {
    if (asset.proOnly && !isPaid) {
      onRequireUpgrade?.(
        lang === "tr"
          ? `${asset.label} paritesi ve tüm 10 kripto/altın varlığında backtest için 7 Günlük Paket ($12) veya Pro Lisans gereklidir.`
          : `${asset.label} and all 10 market assets require a $12 7-Day Pass or Annual Pro license.`
      );
      return;
    }
    setSymbol(asset.symbol);
    setHasPickedStrategyManually(false);
    setOptMessage(null);
  };

  const handleSelectTimeframe = (tf: { id: TimeframeId; label: string; proOnly?: boolean }) => {
    if (tf.proOnly && !isPaid) {
      onRequireUpgrade?.(
        lang === "tr"
          ? `${tf.label} zaman dilimi ($12 7 Günlük Paket veya $29 Yıllık Pro) ile açılır.`
          : `${tf.label} timeframe requires a $12 7-Day Pass or Annual Pro license.`
      );
      return;
    }
    setTimeframe(tf.id);
    setHasPickedStrategyManually(false);
    setOptMessage(null);
  };

  const handleAutoOptimize = () => {
    if (!isPaid && freeOptUsed) {
      onRequireUpgrade?.(
        lang === "tr"
          ? "Ücretsiz 36 kombinasyon tarama hakkını kullandın. Sınırsız Auto-Optimize ve tüm pariteler için Pro kilidini aç."
          : "You've used your 1st free 36-combination sweep. Unlock unlimited Auto-Optimize with a $12 Pass or Pro license."
      );
      return;
    }

    const { best, testedCount } = optimizeStrategyConfig(candles, capital, leverage);
    setSelectedStrategyId(best.strategyId);
    setHasPickedStrategyManually(true);
    setStopLossPct(best.config.stopLossPct);
    setTakeProfitPct(best.config.takeProfitPct);
    setFastPeriod(best.config.fastPeriod);
    setSlowPeriod(best.config.slowPeriod);

    if (!isPaid && typeof window !== "undefined") {
      window.localStorage.setItem(FREE_OPT_STORAGE_KEY, "1");
      window.dispatchEvent(new Event(FREE_OPT_EVENT));
    }

    setOptMessage(
      lang === "tr"
        ? `${testedCount} kombinasyon tarandı → Kazanan: ${best.nameTr} (SL %${best.config.stopLossPct} / TP %${best.config.takeProfitPct} → %${best.netProfitPct >= 0 ? "+" : ""}${best.netProfitPct})`
        : `Swept ${testedCount} setups → Winner: ${best.nameEn} (SL ${best.config.stopLossPct}% / TP ${best.config.takeProfitPct}% → ${best.netProfitPct >= 0 ? "+" : ""}${best.netProfitPct}%)`
    );
  };

  const handleExportTradesCsv = () => {
    if (!isPaid) {
      onRequireUpgrade?.(
        lang === "tr"
          ? "Backtest işlem dökümünü (.CSV) indirmek için $12 7 Günlük Paket veya Pro lisans gerekir."
          : "Exporting the backtest trade execution CSV requires a $12 7-Day Pass or Annual Pro license."
      );
      return;
    }
    const headers = [
      "Trade#",
      "EntryTime",
      "ExitTime",
      "EntryPrice",
      "ExitPrice",
      "ExitReason",
      "NetReturnPct",
      "PnL_USD",
      "EquityAfter",
    ];
    const lines = activeResult.trades.map((t) =>
      [
        t.id,
        new Date(t.entryTime).toISOString(),
        new Date(t.exitTime).toISOString(),
        t.entryPrice,
        t.exitPrice,
        t.exitReason,
        t.netReturnPct,
        t.pnlUsd,
        t.equityAfter,
      ].join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${symbol.toLowerCase()}-${timeframe}-${activeResult.strategyId}-backtest.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Build Dual SVG Charts (Price + Trade Markers, Strategy Equity vs Hold Equity)
  const priceChart = useMemo(() => {
    const curve = activeResult.equityCurve;
    if (curve.length === 0) {
      return { pricePath: "", stopY: null, targetY: null, markers: [] as { x: number; y: number; kind: "buy" | "sellWin" | "sellLoss" }[], minP: 0, maxP: 0 };
    }

    const W = 640;
    const H = 200;
    const padX = 10;
    const padY = 16;
    const plotW = W - padX * 2;
    const plotH = H - padY * 2;

    const prices = curve.map((c) => c.price);
    let minP = Math.min(...prices);
    let maxP = Math.max(...prices);
    if (activeResult.suggestedStopPrice > 0) {
      minP = Math.min(minP, activeResult.suggestedStopPrice * 0.99);
    }
    if (activeResult.suggestedTargetPrice > 0) {
      maxP = Math.max(maxP, activeResult.suggestedTargetPrice * 1.01);
    }
    const spanP = Math.max(0.0001, maxP - minP);

    const toX = (idx: number) =>
      Number((padX + (idx / Math.max(1, curve.length - 1)) * plotW).toFixed(1));
    const toY = (p: number) =>
      Number((padY + plotH - ((p - minP) / spanP) * plotH).toFixed(1));

    const pricePath = curve
      .map((c, idx) => `${idx === 0 ? "M" : "L"} ${toX(idx)} ${toY(c.price)}`)
      .join(" ");

    const markers: { x: number; y: number; kind: "buy" | "sellWin" | "sellLoss" }[] = [];
    for (const t of activeResult.trades) {
      markers.push({
        x: toX(t.entryIndex),
        y: toY(t.entryPrice),
        kind: "buy",
      });
      if (t.exitReason !== "OPEN") {
        markers.push({
          x: toX(t.exitIndex),
          y: toY(t.exitPrice),
          kind: t.pnlUsd >= 0 ? "sellWin" : "sellLoss",
        });
      }
    }

    return {
      pricePath,
      stopY: activeResult.suggestedStopPrice > 0 ? toY(activeResult.suggestedStopPrice) : null,
      targetY: activeResult.suggestedTargetPrice > 0 ? toY(activeResult.suggestedTargetPrice) : null,
      markers,
      minP,
      maxP,
    };
  }, [activeResult]);

  const equityChart = useMemo(() => {
    const curve = activeResult.equityCurve;
    if (curve.length === 0) {
      return { stratPath: "", stratArea: "", holdPath: "", endStrat: { x: 0, y: 0 }, endHold: { x: 0, y: 0 } };
    }

    const W = 640;
    const H = 150;
    const padX = 10;
    const padY = 14;
    const plotW = W - padX * 2;
    const plotH = H - padY * 2;

    const allE = curve.flatMap((c) => [c.strategyEquity, c.holdEquity]);
    const minE = Math.min(...allE) * 0.97;
    const maxE = Math.max(...allE) * 1.03;
    const spanE = Math.max(100, maxE - minE);

    const toX = (idx: number) =>
      Number((padX + (idx / Math.max(1, curve.length - 1)) * plotW).toFixed(1));
    const toY = (e: number) =>
      Number((padY + plotH - ((e - minE) / spanE) * plotH).toFixed(1));

    const stratPts = curve.map((c, idx) => ({ x: toX(idx), y: toY(c.strategyEquity) }));
    const holdPts = curve.map((c, idx) => ({ x: toX(idx), y: toY(c.holdEquity) }));

    const stratPath = stratPts
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
    const holdPath = holdPts
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
    const stratArea = `${stratPath} L ${stratPts[stratPts.length - 1].x} ${H - padY} L ${stratPts[0].x} ${H - padY} Z`;

    return {
      stratPath,
      stratArea,
      holdPath,
      endStrat: stratPts[stratPts.length - 1],
      endHold: holdPts[holdPts.length - 1],
    };
  }, [activeResult]);

  const lastClose = candles[candles.length - 1]?.close ?? 0;

  return (
    <div className="bg-[#070B14] text-slate-100 p-4 sm:p-6 space-y-5">
      {/* Top Asset + Timeframe + Auto-Optimize Control Strip */}
      <div className="flex flex-col gap-3 border-b border-slate-800/90 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {ASSETS.map((a) => {
            const selected = symbol === a.symbol;
            return (
              <button
                key={a.symbol}
                type="button"
                onClick={() => handleSelectAsset(a)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  selected
                    ? "bg-white text-slate-950 shadow-xs"
                    : "border border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                <span>{a.label}</span>
                {a.proOnly && !isPaid && <Lock className="h-3 w-3 opacity-60" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Timeframe Selector */}
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs font-bold">
            {TIMEFRAMES.map((tf) => {
              const selected = timeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => handleSelectTimeframe(tf)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition cursor-pointer ${
                    selected
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{tf.label}</span>
                  {tf.proOnly && !isPaid && <Lock className="h-2.5 w-2.5 opacity-70" />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void loadCandles(symbol, timeframe)}
            disabled={isLoadingFeed}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingFeed ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">
              {feedMode === "live"
                ? lang === "tr"
                  ? "Canlı 300 Mum"
                  : "Live 300 Bars"
                : lang === "tr"
                  ? "Model Veri"
                  : "Sample Bars"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleAutoOptimize}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-300 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-sm transition hover:brightness-105 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5 fill-slate-950" />
            <span>
              {lang === "tr" ? "En Karlı Ayarı Bul (36 Test)" : "Auto-Optimize (36 Setups)"}
            </span>
            {!isPaid && !freeOptUsed ? (
              <span className="rounded bg-slate-950/15 px-1.5 py-0.5 text-[10px] font-black">
                {lang === "tr" ? "İlk Ücretsiz" : "1st Free"}
              </span>
            ) : (
              !isPaid && <Lock className="h-3 w-3 opacity-75" />
            )}
          </button>
        </div>
      </div>

      {/* Auto-Optimizer Result Toast Banner */}
      {optMessage && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            {optMessage}
          </span>
          <button
            type="button"
            onClick={() => setOptMessage(null)}
            className="text-emerald-300/80 hover:text-white cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* 4 High-Contrast Quant KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {lang === "tr" ? "Net Strateji Getirisi" : "Net Strategy Return"}
          </span>
          <span
            className={`mono-nums mt-1 block text-xl font-extrabold sm:text-2xl ${
              activeResult.netProfitPct >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {activeResult.netProfitPct >= 0 ? "+" : ""}
            {activeResult.netProfitPct}%{" "}
            <span className="text-xs font-semibold text-slate-300">
              ({activeResult.netProfitUsd >= 0 ? "+" : ""}
              {formatUsd(activeResult.netProfitUsd)})
            </span>
          </span>
          <span className="mt-1 block text-[11px] text-slate-400">
            {lang === "tr" ? "Al-Tut'a Farkı (Alpha):" : "Alpha vs Hold:"}{" "}
            <strong
              className={
                activeResult.alphaPct >= 0 ? "text-emerald-300" : "text-rose-300"
              }
            >
              {activeResult.alphaPct >= 0 ? "+" : ""}
              {activeResult.alphaPct}%
            </strong>
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {lang === "tr" ? "Kazanma % & Profit Factor" : "Win Rate & Profit Factor"}
          </span>
          <span className="mono-nums mt-1 block text-xl font-extrabold text-white sm:text-2xl">
            {activeResult.winRatePct}%{" "}
            <span className="text-sm font-bold text-blue-400">
              PF {activeResult.profitFactor}
            </span>
          </span>
          <span className="mt-1 block text-[11px] text-slate-400">
            {activeResult.totalTrades}{" "}
            {lang === "tr"
              ? `gerçekleşen işlem · ${leverage}x Kaldıraç`
              : `completed trades · ${leverage}x Lev`}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {lang === "tr" ? "Max Erime & Sharpe Oranı" : "Max Drawdown & Sharpe"}
          </span>
          <span className="mono-nums mt-1 block text-xl font-extrabold text-rose-400 sm:text-2xl">
            -{activeResult.maxDrawdownPct}%{" "}
            <span className="text-sm font-bold text-slate-300">
              S: {activeResult.sharpeRatio}
            </span>
          </span>
          <span className="mt-1 block text-[11px] text-slate-400">
            {lang === "tr" ? "Final Kasa:" : "Final Equity:"}{" "}
            <strong className="text-white">{formatUsd(activeResult.finalEquity)}</strong>
          </span>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            activeResult.currentSignal === "FLAT"
              ? "border-slate-800 bg-slate-900/70"
              : "border-emerald-500/50 bg-emerald-500/10"
          }`}
        >
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {lang === "tr" ? `Son Mum Sinyali (${symbol})` : `Latest Bar Signal (${symbol})`}
          </span>
          <span
            className={`mt-1 block text-lg font-extrabold sm:text-xl ${
              activeResult.currentSignal === "FLAT" ? "text-slate-300" : "text-emerald-400"
            }`}
          >
            {activeResult.currentSignal === "ENTRY_NOW"
              ? lang === "tr"
                ? "YENİ AL SİNYALİ"
                : "FRESH BUY SIGNAL"
              : activeResult.currentSignal === "LONG"
                ? lang === "tr"
                  ? "AÇIK LONG"
                  : "ACTIVE LONG"
                : lang === "tr"
                  ? "SİNYAL BEKLENİYOR"
                  : "WAIT / FLAT"}
          </span>
          <span className="mono-nums mt-1 block text-[11px] text-slate-300">
            SL {formatPrice(activeResult.suggestedStopPrice)} &middot; TP{" "}
            {formatPrice(activeResult.suggestedTargetPrice)}
          </span>
        </div>
      </div>

      {/* Main 12-Column Interactive Stage: Charts Left (8), Leaderboard & Sliders Right (4) */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left 8 Cols: Dual Interactive SVG Charts */}
        <div className="lg:col-span-8 space-y-4">
          {/* Chart 1: Price Action + Buy/Sell Execution Markers */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="font-bold text-white">
                  {symbol} ({timeframe.toUpperCase()}) &middot;{" "}
                  <span className="mono-nums text-emerald-400">{formatPrice(lastClose)}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {lang === "tr" ? "AL Girişi" : "Buy Entry"}
                </span>
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {lang === "tr" ? "Kârlı Çıkış (TP)" : "Win Exit (TP)"}
                </span>
                <span className="inline-flex items-center gap-1 text-rose-400">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  {lang === "tr" ? "Stop Çıkışı (SL)" : "Stop Exit (SL)"}
                </span>
              </div>
            </div>

            <div className="mt-3 w-full">
              <svg
                viewBox="0 0 640 200"
                className="h-48 w-full sm:h-52"
                role="img"
                aria-label="Backtest price action and trade execution chart"
              >
                {[45, 95, 145].map((y) => (
                  <line
                    key={y}
                    x1="10"
                    y1={y}
                    x2="630"
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3 4"
                    strokeWidth="1"
                  />
                ))}

                {priceChart.targetY !== null && (
                  <line
                    x1="10"
                    y1={priceChart.targetY}
                    x2="630"
                    y2={priceChart.targetY}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                    opacity="0.45"
                  />
                )}
                {priceChart.stopY !== null && (
                  <line
                    x1="10"
                    y1={priceChart.stopY}
                    x2="630"
                    y2={priceChart.stopY}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                    opacity="0.45"
                  />
                )}

                {priceChart.pricePath && (
                  <path
                    d={priceChart.pricePath}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                  />
                )}

                {priceChart.markers.map((m, idx) => (
                  <circle
                    key={`${m.kind}-${idx}`}
                    cx={m.x}
                    cy={m.y}
                    r={m.kind === "buy" ? 4.2 : 3.8}
                    fill={
                      m.kind === "buy"
                        ? "#10b981"
                        : m.kind === "sellWin"
                          ? "#fbbf24"
                          : "#f43f5e"
                    }
                    stroke="#020617"
                    strokeWidth="1.2"
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* Chart 2: Strategy Equity Curve vs Buy & Hold */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-white">
                  {lang === "tr"
                    ? `Kasa Eğrisi: ${activeResult.nameTr}`
                    : `Equity Curve: ${activeResult.nameEn}`}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-emerald-400 font-semibold">
                  {lang === "tr" ? "Algoritma:" : "Strategy:"}{" "}
                  {formatUsd(activeResult.finalEquity)}
                </span>
                <span className="text-slate-400">
                  {lang === "tr" ? "Al & Tut:" : "Buy & Hold:"}{" "}
                  {activeResult.buyAndHoldReturnPct >= 0 ? "+" : ""}
                  {activeResult.buyAndHoldReturnPct}%
                </span>
              </div>
            </div>

            <div className="mt-2 w-full">
              <svg
                viewBox="0 0 640 150"
                className="h-36 w-full sm:h-40"
                role="img"
                aria-label="Strategy equity versus buy and hold curve"
              >
                <defs>
                  <linearGradient id="quantEqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {equityChart.stratArea && (
                  <path d={equityChart.stratArea} fill="url(#quantEqGrad)" />
                )}
                {equityChart.holdPath && (
                  <path
                    d={equityChart.holdPath}
                    fill="none"
                    stroke="#475569"
                    strokeDasharray="4 4"
                    strokeWidth="1.75"
                  />
                )}
                {equityChart.stratPath && (
                  <path
                    d={equityChart.stratPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}
                <circle
                  cx={equityChart.endHold.x}
                  cy={equityChart.endHold.y}
                  r="3.5"
                  fill="#64748b"
                />
                <circle
                  cx={equityChart.endStrat.x}
                  cy={equityChart.endStrat.y}
                  r="4.5"
                  fill="#34d399"
                  stroke="#020617"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: 6-Strategy Tournament + Interactive Sliders */}
        <div className="lg:col-span-4 space-y-4">
          {/* 6-Strategy Leaderboard */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {lang === "tr" ? "6-Strateji Performans Ligi" : "6-Strategy Tournament"}
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">300 Bars</span>
            </div>

            <div className="mt-2.5 space-y-1.5">
              {tournament.map((strat, index) => {
                const isSelected = strat.strategyId === activeStrategyId;
                const isPos = strat.netProfitPct >= 0;
                return (
                  <button
                    key={strat.strategyId}
                    type="button"
                    onClick={() => {
                      setSelectedStrategyId(strat.strategyId);
                      setHasPickedStrategyManually(true);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition cursor-pointer ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/15"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-white truncate">
                        {index === 0 && (
                          <span className="mr-1.5 rounded bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">
                            #1
                          </span>
                        )}
                        {lang === "tr" ? strat.nameTr : strat.nameEn}
                      </span>
                      <span
                        className={`mono-nums font-extrabold shrink-0 ${
                          isPos ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPos ? "+" : ""}
                        {strat.netProfitPct}%
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        Win {strat.winRatePct}% &middot; PF {strat.profitFactor}
                      </span>
                      <span>
                        {strat.totalTrades} {lang === "tr" ? "işlem" : "trades"} &middot; DD -
                        {strat.maxDrawdownPct}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Risk & Parameter Sliders */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {lang === "tr" ? "Risk & İndikatör Ayarları" : "Risk & Parameter Controls"}
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>{lang === "tr" ? "Başlangıç Kasası" : "Initial Capital"}</span>
                  <span className="mono-nums font-bold text-white">{formatUsd(capital)}</span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  aria-label="Initial capital"
                  className="mt-1 w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Stop-Loss</span>
                    <span className="mono-nums font-bold text-rose-400">{stopLossPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(Number(e.target.value))}
                    aria-label="Stop loss percent"
                    className="mt-1 w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Take-Profit</span>
                    <span className="mono-nums font-bold text-emerald-400">
                      {takeProfitPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={20}
                    step={0.5}
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                    aria-label="Take profit percent"
                    className="mt-1 w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{lang === "tr" ? "Kaldıraç" : "Leverage"}</span>
                    <span className="mono-nums font-bold text-white">{leverage}x</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    aria-label="Leverage multiplier"
                    className="mt-1 w-full accent-blue-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Fast</span>
                    <span className="mono-nums font-bold text-white">{fastPeriod}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={1}
                    value={fastPeriod}
                    onChange={(e) => setFastPeriod(Number(e.target.value))}
                    aria-label="Fast indicator period"
                    className="mt-1 w-full accent-slate-300 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Slow</span>
                    <span className="mono-nums font-bold text-white">{slowPeriod}</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={50}
                    step={1}
                    value={slowPeriod}
                    onChange={(e) => setSlowPeriod(Number(e.target.value))}
                    aria-label="Slow indicator period"
                    className="mt-1 w-full accent-slate-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Execution Ledger */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/90">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {lang === "tr"
                ? `İşlem Geçmişi Dökümü (${activeResult.trades.length} İşlem)`
                : `Executed Trade Ledger (${activeResult.trades.length} Trades)`}
            </h3>
            <p className="text-[11px] text-slate-400">
              {lang === "tr" ? activeResult.descTr : activeResult.descEn}
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportTradesCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>{lang === "tr" ? "İşlemleri İndir (.csv)" : "Export Trades (.csv)"}</span>
            {!isPaid && <Lock className="h-3 w-3 opacity-60" />}
          </button>
        </div>

        <div className="max-h-72 overflow-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 border-b border-slate-800 bg-slate-900 text-[10px] font-bold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">{lang === "tr" ? "Giriş Zamanı" : "Entry Time"}</th>
                <th className="px-4 py-2.5 text-right">{lang === "tr" ? "Giriş" : "Entry"}</th>
                <th className="px-4 py-2.5 text-right">{lang === "tr" ? "Çıkış" : "Exit"}</th>
                <th className="px-4 py-2.5 text-center">{lang === "tr" ? "Neden" : "Reason"}</th>
                <th className="px-4 py-2.5 text-right">Net %</th>
                <th className="px-4 py-2.5 text-right">PnL ($)</th>
                <th className="px-4 py-2.5 text-right">{lang === "tr" ? "Kasa" : "Equity"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {[...activeResult.trades].reverse().slice(0, 25).map((t) => (
                <tr key={t.id} className="hover:bg-slate-900/70">
                  <td className="mono-nums px-4 py-2 text-slate-500">#{t.id}</td>
                  <td className="mono-nums px-4 py-2 text-slate-300">
                    {formatShortDate(t.entryTime)}
                  </td>
                  <td className="mono-nums px-4 py-2 text-right font-medium text-white">
                    {formatPrice(t.entryPrice)}
                  </td>
                  <td className="mono-nums px-4 py-2 text-right font-medium text-slate-200">
                    {formatPrice(t.exitPrice)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        t.exitReason === "TP"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : t.exitReason === "SL"
                            ? "bg-rose-500/20 text-rose-300"
                            : t.exitReason === "OPEN"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {t.exitReason}
                    </span>
                  </td>
                  <td
                    className={`mono-nums px-4 py-2 text-right font-bold ${
                      t.netReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {t.netReturnPct >= 0 ? "+" : ""}
                    {t.netReturnPct}%
                  </td>
                  <td
                    className={`mono-nums px-4 py-2 text-right font-bold ${
                      t.pnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {t.pnlUsd >= 0 ? "+" : ""}
                    {formatUsd(t.pnlUsd)}
                  </td>
                  <td className="mono-nums px-4 py-2 text-right font-semibold text-white">
                    {formatUsd(t.equityAfter)}
                  </td>
                </tr>
              ))}
              {activeResult.trades.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {lang === "tr"
                      ? "Seçili parametrelerde işlem oluşmadı — Stop/TP veya periyodu gevşet."
                      : "No trades triggered with current parameters — adjust Fast/Slow or SL/TP sliders."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
