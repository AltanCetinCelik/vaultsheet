"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  Award,
  BellRing,
  Check,
  ChevronDown,
  ClipboardCheck,
  Cloud,
  Copy,
  Download,
  Lock,
  RefreshCw,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";
import QuantCandlestickChart from "@/components/QuantCandlestickChart";
import type { AppLang } from "@/lib/financialForensics";
import {
  QUANT_ASSETS,
  type MarketDataSource,
  type MtfConfluenceEntry,
} from "@/lib/marketData";
import type {
  BacktestResult,
  CoinRadarRow,
  DerivativesPulse,
  OHLCVCandle,
  StrategyId,
  TimeframeId,
  TradeDirectionMode,
} from "@/lib/quantBacktester";

export interface AlertChannelOption {
  id: "discord" | "telegram" | "webhook";
  label: string;
}

export interface TerminalCockpitViewProps {
  lang: AppLang;
  isPaid: boolean;
  consumedFreeOpt: boolean;
  symbol: string;
  timeframe: TimeframeId;
  directionMode: TradeDirectionMode;
  setDirectionMode: (dir: TradeDirectionMode) => void;
  candles: OHLCVCandle[];
  feedSource: MarketDataSource;
  isLoadingFeed: boolean;
  derivativesPulse: DerivativesPulse;
  mtfEntries: MtfConfluenceEntry[];
  radarRows: CoinRadarRow[];
  filteredRadar: CoinRadarRow[];
  radarFilter: "all" | "active" | "high_wr";
  setRadarFilter: (f: "all" | "active" | "high_wr") => void;
  isScanningRadar: boolean;
  onRefreshRadar: () => void;
  onSelectAsset: (sym: string, label: string, proOnly?: boolean) => void;
  onSelectTimeframe: (tf: { id: TimeframeId; label: string; proOnly?: boolean }) => void;
  onAutoOptimize: () => void;
  optMessage: string | null;
  tournament: BacktestResult[];
  activeResult: BacktestResult;
  activeStrategyId: StrategyId;
  onSelectStrategy: (id: StrategyId) => void;
  capital: number;
  setCapital: (val: number) => void;
  stopLossPct: number;
  setStopLossPct: (val: number) => void;
  takeProfitPct: number;
  setTakeProfitPct: (val: number) => void;
  leverage: number;
  setLeverage: (val: number) => void;
  fastPeriod: number;
  setFastPeriod: (val: number) => void;
  slowPeriod: number;
  setSlowPeriod: (val: number) => void;
  ticketEntry: number;
  ticketSide: "LONG" | "SHORT";
  ticketNotional: number;
  ticketUnits: number;
  ticketRiskUsd: number;
  ticketRewardUsd: number;
  copiedTicket: boolean;
  onCopyTicket: (text: string) => void;
  onDispatchAlert: () => void;
  isSendingAlert: boolean;
  onExportTradesCsv: () => void;
  alertChannel: "discord" | "telegram" | "webhook";
  onChangeAlertChannel: (ch: "discord" | "telegram" | "webhook") => void;
  alertWebhookUrl: string;
  onChangeWebhookUrl: (val: string) => void;
  telegramBotToken: string;
  onChangeTelegramToken: (val: string) => void;
  telegramChatId: string;
  onChangeTelegramChatId: (val: string) => void;
  sentinelSymbols: string[];
  onToggleSentinelSymbol: (sym: string, label: string, proOnly?: boolean) => void;
  sentinelCloudActive: boolean;
  onSaveCloudSentinel: (activeOverride?: boolean) => void;
  isSyncingCloud: boolean;
  sentinelTriggerUrl?: string;
  onTriggerCloudScan: () => void;
  isRunningCloudScan: boolean;
  copiedCronUrl: boolean;
  onCopyCronUrl: (url: string) => void;
  sentinelEnabled: boolean;
  onToggleLocalSentinel: () => void;
  lastSentinelScan: string | null;
  alertStatus: { ok: boolean; msg: string } | null;
  onOpenUpgrade: (reason: string) => void;
  formatPrice: (v: number) => string;
  formatUsd: (v: number) => string;
  formatCompactUsd: (v: number) => string;
  formatShortDate: (ms: number) => string;
}

const TIMEFRAMES: { id: TimeframeId; label: string; proOnly?: boolean }[] = [
  { id: "15m", label: "15m", proOnly: true },
  { id: "1h", label: "1H" },
  { id: "4h", label: "4H" },
  { id: "1d", label: "1D", proOnly: true },
];

const DIRECTIONS: { id: TradeDirectionMode; labelTr: string; labelEn: string }[] = [
  { id: "both", labelTr: "2 Yön", labelEn: "Both" },
  { id: "long", labelTr: "Long", labelEn: "Long" },
  { id: "short", labelTr: "Short", labelEn: "Short" },
];

const SHORT_STRATEGY_LABELS: Record<StrategyId, { tr: string; en: string }> = {
  donchian_breakout: { tr: "Donchian", en: "Donchian" },
  ema_cross: { tr: "EMA Trend", en: "EMA Trend" },
  rsi_reversion: { tr: "RSI Dönüş", en: "RSI Reversion" },
  bollinger_bounce: { tr: "Bollinger", en: "Bollinger" },
  macd_momentum: { tr: "MACD İvme", en: "MACD" },
  volume_breakout: { tr: "Hacim Kırılım", en: "Vol Break" },
};

function formatSourceShort(src: MarketDataSource, bars: number): string {
  const tag =
    src === "binance_vision"
      ? "BINANCE"
      : src === "binance_spot"
        ? "SPOT"
        : src === "bybit_linear"
          ? "BYBIT"
          : "SYNC";
  return `${tag} · ${bars}B`;
}

export default function TerminalCockpitView({
  lang,
  isPaid,
  consumedFreeOpt,
  symbol,
  timeframe,
  directionMode,
  setDirectionMode,
  candles,
  feedSource,
  isLoadingFeed,
  derivativesPulse,
  mtfEntries,
  radarRows,
  filteredRadar,
  radarFilter,
  setRadarFilter,
  isScanningRadar,
  onRefreshRadar,
  onSelectAsset,
  onSelectTimeframe,
  onAutoOptimize,
  optMessage,
  tournament,
  activeResult,
  activeStrategyId,
  onSelectStrategy,
  capital,
  setCapital,
  stopLossPct,
  setStopLossPct,
  takeProfitPct,
  setTakeProfitPct,
  leverage,
  setLeverage,
  fastPeriod,
  setFastPeriod,
  slowPeriod,
  setSlowPeriod,
  ticketEntry,
  ticketSide,
  ticketNotional,
  ticketUnits,
  ticketRiskUsd,
  ticketRewardUsd,
  copiedTicket,
  onCopyTicket,
  onDispatchAlert,
  isSendingAlert,
  onExportTradesCsv,
  alertChannel,
  onChangeAlertChannel,
  alertWebhookUrl,
  onChangeWebhookUrl,
  telegramBotToken,
  onChangeTelegramToken,
  telegramChatId,
  onChangeTelegramChatId,
  sentinelSymbols,
  onToggleSentinelSymbol,
  sentinelCloudActive,
  onSaveCloudSentinel,
  isSyncingCloud,
  sentinelTriggerUrl,
  onTriggerCloudScan,
  isRunningCloudScan,
  copiedCronUrl,
  onCopyCronUrl,
  sentinelEnabled,
  onToggleLocalSentinel,
  lastSentinelScan,
  alertStatus,
  onOpenUpgrade,
  formatPrice,
  formatUsd,
  formatCompactUsd,
  formatShortDate,
}: TerminalCockpitViewProps) {
  const [bottomTab, setBottomTab] = useState<"trades" | "tournament" | "sentinel" | "audit">(
    "trades"
  );
  const [mobilePane, setMobilePane] = useState<"chart" | "markets" | "trade">("chart");
  const [pairSearch, setPairSearch] = useState<string>("");
  const [assetMenuOpen, setAssetMenuOpen] = useState<boolean>(false);
  const [showAllTrades, setShowAllTrades] = useState<boolean>(false);
  const [dismissedOptMsg, setDismissedOptMsg] = useState<string | null>(null);

  const isBootingChart = candles.length === 0;
  const isBootingRadar = radarRows.length === 0 && isScanningRadar;
  const lastPrice = candles[candles.length - 1]?.close ?? 0;

  const displayedRadar = pairSearch.trim()
    ? filteredRadar.filter(
        (r) =>
          r.base.toLowerCase().includes(pairSearch.trim().toLowerCase()) ||
          r.symbol.toLowerCase().includes(pairSearch.trim().toLowerCase())
      )
    : filteredRadar;

  const activeAssetMeta = QUANT_ASSETS.find((a) => a.symbol === symbol);
  const firstCandleClose = candles[0]?.close ?? 0;
  const periodChangePct =
    firstCandleClose > 0 && lastPrice > 0
      ? ((lastPrice - firstCandleClose) / firstCandleClose) * 100
      : 0;

  const winLossCounts = useMemo(() => {
    let wins = 0;
    let losses = 0;
    for (const tr of activeResult.trades) {
      if (tr.pnlUsd >= 0) wins++;
      else losses++;
    }
    return { wins, losses };
  }, [activeResult.trades]);

  const reversedTrades = useMemo(
    () => [...activeResult.trades].reverse(),
    [activeResult.trades]
  );
  const visibleTrades = showAllTrades ? reversedTrades : reversedTrades.slice(0, 10);

  const rrRatio = stopLossPct > 0 ? takeProfitPct / stopLossPct : 0;
  const slSharePct =
    stopLossPct + takeProfitPct > 0
      ? Math.round((stopLossPct / (stopLossPct + takeProfitPct)) * 100)
      : 30;

  const buildCopyText = () =>
    `${symbol} (${timeframe.toUpperCase()}) | Strategy: ${activeResult.nameEn}\n` +
    `Side: ${ticketSide} (${activeResult.currentSignal}) | Leverage: ${leverage}x\n` +
    `Entry: ${formatPrice(ticketEntry)} | Size: ${ticketUnits.toFixed(4)} (${formatUsd(ticketNotional)})\n` +
    `Stop-Loss (-${stopLossPct}%): ${formatPrice(activeResult.suggestedStopPrice)} (-${formatUsd(ticketRiskUsd)})\n` +
    `Take-Profit (+${takeProfitPct}%): ${formatPrice(activeResult.suggestedTargetPrice)} (+${formatUsd(ticketRewardUsd)})\n` +
    `Est. Liquidation: ${activeResult.estimatedLiquidationPrice > 0 ? formatPrice(activeResult.estimatedLiquidationPrice) : "1x Spot"}\n` +
    `Blind OOS 30%: ${activeResult.outOfSampleReturnPct >= 0 ? "+" : ""}${activeResult.outOfSampleReturnPct}%`;

  const faqs =
    lang === "tr"
      ? [
          {
            q: "12 Parite, 1.000 Mum ve Vadeli Veri nasıl çalışıyor?",
            a: "Sunucu proxy'miz (/api/market) Binance Vision, Binance Spot ve Bybit/Gate Perpetual borsalarından 1.000 adet canlı OHLCV mumu, fonlama oranı, açık pozisyon (OI) ve balina Long/Short dağılımını gerçek zamanlı çeker.",
          },
          {
            q: "Kör Walk-Forward OOS (%70 / %30) aşırı uyumu nasıl önler?",
            a: "Auto-Optimizer 36 strateji + SL/TP kombinasyonunu yalnızca serinin ilk %70'lik eğitim penceresinde seçer. Son %30'luk görünmemiş dilim yalnızca gerçek doğrulama puanı olarak ölçülür.",
          },
          {
            q: "Komisyon, kayma (slippage) ve fonlama maliyeti hesaba katılır mı?",
            a: "Evet. Her işlemde gidiş-dönüş taraf başı %0.06 taker komisyonu, %0.04 piyasa kayması ve pozisyonun açık kaldığı 8 saatlik fonlama kesintisi net getiriden düşülür.",
          },
          {
            q: "Tarayıcı kapalıyken 7/24 Telegram veya Discord uyarısı gelir mi?",
            a: "Evet. Hesap oluşturduğunuzda Telegram Bot Token'ınız AES-256-GCM ile şifrelenir. Bulut Watchlist'i kaydederek kişisel imzalı 7/24 Cron URL'nizi (/api/cron/sentinel) veya günlük taramayı çalıştırabilirsiniz.",
          },
          {
            q: "Ücretsiz paket ile $12 Pass / $29 Pro arasındaki fark nedir?",
            a: "Ücretsiz sürümde BTC, ETH, SOL, BNB ve PAXG üzerinde 1.000 mumluk backtest, 1H/4H dilimler, canlı Futures verisi ve 1 ücretsiz 36-senaryo OOS taraması açıktır. $12 (7 Gün) ve $29/yıl Pro ise tüm 12 pariteyi, 15m/1D dilimleri, limitsiz taramayı, 7/24 bulut cronu ve CSV dışa aktarımını açar.",
          },
          {
            q: "Otomatik yenileme veya gizli abonelik tuzağı var mı?",
            a: "Hayır. $12 7 Günlük Pass ve $29 Yıllık Pro tek seferlik lisanslardır. Süre dolduğunda kartınızdan bilginiz dışında yenileme ücreti çekilmez.",
          },
        ]
      : [
          {
            q: "How do 12 pairs, 1,000-bar OHLCV & derivatives telemetry work?",
            a: "Our multi-exchange server proxy (/api/market) fetches up to 1,000 live OHLCV bars plus real-time perpetual Funding Rate, Open Interest, and Whale Long/Short ratios across Binance Vision, Spot, and Gate/Bybit failover.",
          },
          {
            q: "How does Zero-Leakage 70/30 Walk-Forward OOS prevent overfitting?",
            a: "Auto-Optimizer tests 36 strategy & SL/TP sets strictly on the first 70% training slice and evaluates winners blindly on the unseen final 30% of candles.",
          },
          {
            q: "Are exchange fees, slippage, and perpetual funding deducted?",
            a: "Yes. Every simulated trade deducts 0.06% taker fee/side, 0.04% slippage/side, and 8-hour perpetual funding drag directly from equity, alongside estimated liquidation pricing.",
          },
          {
            q: "Can alerts fire 24/7 when my browser tab is closed?",
            a: "Yes. Logged-in users get AES-256-GCM server encryption for Telegram Bot tokens and a personal HMAC-signed Cloud Sentinel cron endpoint (/api/cron/sentinel) for Discord or Telegram.",
          },
          {
            q: "What is the exact difference between Free Starter and Pro?",
            a: "Free Starter unlocks 1,000-bar Long/Short backtesting on 5 core pairs (BTC, ETH, SOL, BNB, PAXG), 1H/4H timeframes, live Futures pulse, and 1 free 36-setup OOS sweep. $12 Pass (7-Day) and $29/yr Pro unlock all 12 pairs, 15m/1D timeframes, unlimited sweeps, cloud watchlist cron, and CSV export.",
          },
          {
            q: "Are there auto-renewal traps?",
            a: "No. Both the $12 7-Day Pass and $29 Annual Pro are clean one-time passes with zero automatic recurring rebilling.",
          },
        ];

  const showOptToast = Boolean(optMessage && optMessage !== dismissedOptMsg);

  return (
    <section
      id="workbench"
      className="flex flex-col gap-2.5 p-2.5 sm:p-3 text-slate-100"
    >
      {/* SINGLE UNIFIED COMMAND BAR (Replaces 4 stacked bars — Instant Pair Switcher + Controls) */}
      <div className="obsidian-card relative px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Interactive Asset Selector Pill + Telemetry */}
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setAssetMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-lg border border-white/[0.1] bg-[#080B10] px-3 py-1.5 text-left transition hover:border-emerald-500/45 cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tracking-tight text-white">
                      {activeAssetMeta?.label ?? symbol.replace("USDT", "")}/USDT
                    </span>
                    <span className="mono-nums rounded bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-300">
                      PERP
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                        assetMenuOpen ? "rotate-180 text-emerald-400" : ""
                      }`}
                    />
                  </div>
                  <span className="block text-[10px] text-slate-400">
                    {lang === "tr" ? activeResult.nameTr : activeResult.nameEn}
                  </span>
                </div>

                <div className="border-l border-white/[0.08] pl-2.5">
                  {isBootingChart ? (
                    <div className="h-5 w-20 animate-pulse rounded bg-white/[0.06]" />
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="mono-nums text-sm sm:text-base font-bold text-white">
                        {formatPrice(lastPrice)}
                      </span>
                      <span
                        className={`mono-nums text-[11px] font-semibold ${
                          periodChangePct >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {periodChangePct >= 0 ? "+" : ""}
                        {periodChangePct.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </button>

              {/* Floating Quick Pair Switcher Popover (Works on ALL widths: 390px, 900px, 1440px!) */}
              {assetMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setAssetMenuOpen(false)}
                  />
                  <div className="absolute left-0 top-full z-40 mt-2 w-[310px] sm:w-[340px] rounded-xl border border-white/[0.12] bg-[#0B0F17]/95 p-2.5 shadow-2xl backdrop-blur-md">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={pairSearch}
                        onChange={(e) => setPairSearch(e.target.value)}
                        placeholder={lang === "tr" ? "Parite ara..." : "Search pairs..."}
                        className="w-full rounded-lg border border-white/[0.1] bg-[#05070B] px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={onRefreshRadar}
                        className="rounded-lg border border-white/[0.1] bg-[#05070B] p-1.5 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${isScanningRadar ? "animate-spin text-emerald-400" : ""}`}
                        />
                      </button>
                    </div>

                    <div className="max-h-72 space-y-1 overflow-y-auto terminal-scroll pr-1">
                      {(radarRows.length > 0 ? displayedRadar : []).map((row) => {
                        const active = row.symbol === symbol;
                        const locked = Boolean(row.proOnly && !isPaid);
                        const pos = row.outOfSampleReturnPct >= 0;
                        return (
                          <button
                            key={`pop-${row.symbol}`}
                            type="button"
                            onClick={() => {
                              onSelectAsset(row.symbol, row.base, row.proOnly);
                              setAssetMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition cursor-pointer ${
                              active
                                ? "bg-emerald-500/15 border border-emerald-500/35"
                                : "border border-transparent hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{row.base}</span>
                              {locked && <Lock className="h-3 w-3 text-slate-500" />}
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                  row.currentSignal === "LONG"
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : row.currentSignal === "SHORT"
                                      ? "bg-purple-500/20 text-purple-300"
                                      : "bg-white/[0.06] text-slate-400"
                                }`}
                              >
                                {row.currentSignal}
                              </span>
                            </div>
                            <div className="mono-nums flex items-center gap-2.5">
                              <span className="text-slate-200">{formatPrice(row.price)}</span>
                              <span
                                className={`font-semibold ${
                                  pos ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {pos ? "+" : ""}
                                {row.outOfSampleReturnPct}%
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Clean Derivatives Snapshot (Desktop) */}
            <div className="hidden xl:flex items-center gap-4 border-l border-white/[0.07] pl-3 text-[11px]">
              <div>
                <span className="block text-[9.5px] uppercase tracking-wider text-slate-500">
                  {lang === "tr" ? "Fonlama (8s)" : "Funding (8h)"}
                </span>
                <span
                  className={`mono-nums font-semibold ${
                    derivativesPulse.fundingRatePct > 0.015
                      ? "text-rose-400"
                      : derivativesPulse.fundingRatePct < 0
                        ? "text-emerald-400"
                        : "text-slate-200"
                  }`}
                >
                  {derivativesPulse.fundingRatePct >= 0 ? "+" : ""}
                  {derivativesPulse.fundingRatePct.toFixed(4)}%
                </span>
              </div>

              <div>
                <span className="block text-[9.5px] uppercase tracking-wider text-slate-500">
                  {lang === "tr" ? "Açık Poz." : "Open Int."}
                </span>
                <span className="mono-nums font-semibold text-slate-200">
                  {formatCompactUsd(derivativesPulse.openInterestUsd)}
                </span>
              </div>

              <div>
                <span className="block text-[9.5px] uppercase tracking-wider text-slate-500">
                  {lang === "tr" ? "Balina L/S" : "Whale L/S"}
                </span>
                <span className="mono-nums font-semibold">
                  <span className="text-emerald-400">{derivativesPulse.whaleLongPct}%</span>
                  <span className="text-slate-600"> / </span>
                  <span className="text-rose-400">{derivativesPulse.whaleShortPct}%</span>
                </span>
              </div>

              <span className="mono-nums inline-flex items-center gap-1 rounded border border-white/[0.08] bg-[#080B10] px-2 py-0.5 text-[10px] text-slate-400">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isLoadingFeed ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                  }`}
                />
                {formatSourceShort(feedSource, candles.length)}
              </span>
            </div>
          </div>

          {/* Right: Direction + Timeframe + Primary Optimize CTA */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#080B10] p-0.5 text-[10.5px] font-semibold">
              {DIRECTIONS.map((d) => {
                const active = directionMode === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDirectionMode(d.id)}
                    className={`rounded-md px-2 py-1 whitespace-nowrap transition cursor-pointer ${
                      active
                        ? "bg-white/[0.12] text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {lang === "tr" ? d.labelTr : d.labelEn}
                  </button>
                );
              })}
            </div>

            <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#080B10] p-0.5 text-[10.5px] font-semibold mono-nums">
              {TIMEFRAMES.map((tf) => {
                const active = timeframe === tf.id;
                const locked = Boolean(tf.proOnly && !isPaid);
                return (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => onSelectTimeframe(tf)}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 whitespace-nowrap transition cursor-pointer ${
                      active
                        ? "bg-white/[0.14] text-white"
                        : locked
                          ? "text-slate-500 hover:text-slate-300"
                          : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{tf.label}</span>
                    {locked && <Lock className="h-2.5 w-2.5 opacity-60" />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onAutoOptimize}
              disabled={candles.length < 30}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-300 px-3 py-1.5 text-[11px] font-bold text-slate-950 whitespace-nowrap shadow-[0_0_20px_-6px_rgba(16,185,129,0.75)] transition hover:brightness-110 disabled:opacity-45 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>
                {lang === "tr" ? "OOS Optimize (36)" : "Optimize (36 Setups)"}
              </span>
              {!isPaid && (
                <span className="ml-0.5 rounded bg-slate-950/20 px-1.5 py-0.5 text-[9px] font-extrabold">
                  {consumedFreeOpt ? "PRO" : lang === "tr" ? "1 Hak" : "1 Free"}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Dismissible OOS Result Banner (only when user clicked Optimize) */}
        {showOptToast && (
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-200">
            <span>{optMessage}</span>
            <button
              type="button"
              onClick={() => setDismissedOptMsg(optMessage)}
              className="rounded p-0.5 text-emerald-300 hover:bg-emerald-500/20 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile-ONLY Tab Switcher (<768px; md/lg laptops now show Chart + Order Ticket side-by-side!) */}
      <div className="obsidian-card grid grid-cols-3 overflow-hidden text-[11px] font-semibold md:hidden">
        {(
          [
            { id: "chart", tr: "Grafik & İşlem", en: "Chart & Tabs" },
            { id: "markets", tr: "Piyasalar (12)", en: "Markets (12)" },
            { id: "trade", tr: "Emir & Ayar", en: "Order & Params" },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMobilePane(m.id)}
            className={`py-2.5 text-center border-b-2 transition cursor-pointer ${
              mobilePane === m.id
                ? "border-emerald-400 text-white bg-white/[0.04]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {lang === "tr" ? m.tr : m.en}
          </button>
        ))}
      </div>

      {/* MAIN WORKSPACE GRID:
          - 1280px+ (xl): 3 cards [248px Screener | 1fr Chart+KPI+Tabs | 328px Ticket+Controls]
          - 768px–1279px (md/lg laptop/split): 2 cards side-by-side [1fr Chart+Tabs | 304px Ticket+Controls]
          - <768px mobile: tabbed panes */}
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[minmax(0,1fr)_304px] xl:grid-cols-[248px_minmax(0,1fr)_328px]">
        {/* LEFT RAIL (Desktop xl+ OR Mobile Markets Tab) */}
        <aside
          className={`${
            mobilePane === "markets" ? "flex" : "hidden xl:flex"
          } obsidian-card flex-col overflow-hidden`}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                {lang === "tr" ? "Piyasalar (12)" : "Markets (12)"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onRefreshRadar}
              disabled={isScanningRadar}
              className="rounded-md border border-white/[0.08] bg-[#080B10] p-1 text-slate-300 hover:text-white cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3 w-3 ${isScanningRadar ? "animate-spin text-emerald-400" : ""}`}
              />
            </button>
          </div>

          <div className="space-y-1.5 border-b border-white/[0.06] px-2.5 py-2">
            <input
              type="text"
              value={pairSearch}
              onChange={(e) => setPairSearch(e.target.value)}
              placeholder={lang === "tr" ? "Ara (BTC, SOL, PAXG)..." : "Filter pairs..."}
              className="w-full rounded-md border border-white/[0.08] bg-[#06090F] px-2.5 py-1.5 text-[11px] text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
            />
            <div className="grid grid-cols-3 gap-1 rounded-md bg-[#06090F] p-0.5 text-[10px] font-semibold">
              {(
                [
                  { id: "all", tr: "Tümü", en: "All" },
                  { id: "active", tr: "Sinyal", en: "Signals" },
                  { id: "high_wr", tr: "WR ≥55%", en: "WR ≥55%" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRadarFilter(f.id)}
                  className={`rounded py-1 transition cursor-pointer ${
                    radarFilter === f.id
                      ? "bg-white/[0.12] text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {lang === "tr" ? f.tr : f.en}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">
            <span>{lang === "tr" ? "Parite" : "Pair"}</span>
            <span>{lang === "tr" ? "Fiyat · OOS (300B)" : "Price · OOS"}</span>
          </div>

          <div className="max-h-[780px] flex-1 divide-y divide-white/[0.045] overflow-y-auto terminal-scroll">
            {isBootingRadar
              ? QUANT_ASSETS.map((asset) => (
                  <div
                    key={asset.symbol}
                    className="flex items-center justify-between px-3 py-2.5"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-200">{asset.label}</span>
                      <div className="h-2.5 w-20 animate-pulse rounded bg-white/[0.06]" />
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <div className="h-3.5 w-14 animate-pulse rounded bg-white/[0.06]" />
                      <div className="h-2.5 w-10 animate-pulse rounded bg-white/[0.06]" />
                    </div>
                  </div>
                ))
              : displayedRadar.map((row) => {
                  const isSelected = row.symbol === symbol;
                  const locked = Boolean(row.proOnly && !isPaid);
                  const oosPos = row.outOfSampleReturnPct >= 0;
                  return (
                    <button
                      key={row.symbol}
                      type="button"
                      onClick={() => {
                        onSelectAsset(row.symbol, row.base, row.proOnly);
                        setMobilePane("chart");
                      }}
                      className={`w-full border-l-2 px-3 py-2 text-left transition cursor-pointer ${
                        isSelected
                          ? "border-l-emerald-400 bg-white/[0.05]"
                          : "border-l-transparent hover:bg-white/[0.025]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-bold text-white">{row.base}</span>
                          {locked && <Lock className="h-2.5 w-2.5 shrink-0 text-slate-500" />}
                          <span
                            className={`rounded px-1 py-0.5 text-[9px] font-bold ${
                              row.currentSignal === "LONG"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : row.currentSignal === "SHORT"
                                  ? "bg-purple-500/20 text-purple-300"
                                  : "bg-white/[0.05] text-slate-400"
                            }`}
                          >
                            {row.currentSignal}
                          </span>
                        </div>
                        <span className="mono-nums text-xs font-semibold text-slate-100">
                          {formatPrice(row.price)}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-1.5 text-[10px]">
                        <span className="truncate text-slate-500">
                          {lang === "tr" ? row.bestStrategyNameTr : row.bestStrategyNameEn}
                        </span>
                        <span
                          className={`mono-nums font-semibold shrink-0 ${
                            oosPos ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {oosPos ? "+" : ""}
                          {row.outOfSampleReturnPct}%
                        </span>
                      </div>
                    </button>
                  );
                })}
          </div>
        </aside>

        {/* CENTER WORKSPACE: Elevated 4-KPI Cards + Chart Card + Analytical Bottom Card */}
        <div
          className={`${
            mobilePane === "chart" ? "flex" : "hidden md:flex"
          } flex-col gap-2.5 min-w-0`}
        >
          {/* 4 Elevated KPI Pills (Uniform 2-Row Rhythm Across All Widths) */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="obsidian-card px-3 py-2.5">
              <div className="flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <span>{lang === "tr" ? "Kör OOS (%30)" : "Blind OOS"}</span>
                {!isBootingChart && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      activeResult.isRobustOos
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {activeResult.isRobustOos
                      ? lang === "tr"
                        ? "DOĞRULANDI"
                        : "VERIFIED"
                      : lang === "tr"
                        ? "ZAYIF"
                        : "WEAK"}
                  </span>
                )}
              </div>
              {isBootingChart ? (
                <div className="mt-1.5 h-5 w-20 animate-pulse rounded bg-white/[0.06]" />
              ) : (
                <div className="mt-1">
                  <span
                    className={`mono-nums block text-base font-bold ${
                      activeResult.outOfSampleReturnPct >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {activeResult.outOfSampleReturnPct >= 0 ? "+" : ""}
                    {activeResult.outOfSampleReturnPct}%
                  </span>
                  <span className="mono-nums block text-[10px] text-slate-500">
                    IS {activeResult.inSampleReturnPct >= 0 ? "+" : ""}
                    {activeResult.inSampleReturnPct}%
                  </span>
                </div>
              )}
            </div>

            <div className="obsidian-card px-3 py-2.5">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {lang === "tr" ? "Net Getiri & Alfa" : "Net Return"}
              </span>
              {isBootingChart ? (
                <div className="mt-1.5 h-5 w-20 animate-pulse rounded bg-white/[0.06]" />
              ) : (
                <div className="mt-1">
                  <span
                    className={`mono-nums block text-base font-bold ${
                      activeResult.netProfitPct >= 0 ? "text-white" : "text-rose-400"
                    }`}
                  >
                    {activeResult.netProfitPct >= 0 ? "+" : ""}
                    {activeResult.netProfitPct}%
                  </span>
                  <span className="mono-nums block text-[10px] text-slate-400">
                    {lang === "tr" ? "Alfa" : "Alpha"}{" "}
                    <strong
                      className={
                        activeResult.alphaPct >= 0 ? "text-emerald-400" : "text-rose-400"
                      }
                    >
                      {activeResult.alphaPct >= 0 ? "+" : ""}
                      {activeResult.alphaPct}%
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div className="obsidian-card px-3 py-2.5">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {lang === "tr" ? "Kazanma & Beklenti" : "Win Rate"}
              </span>
              {isBootingChart ? (
                <div className="mt-1.5 h-5 w-20 animate-pulse rounded bg-white/[0.06]" />
              ) : (
                <div className="mt-1">
                  <span className="mono-nums block text-base font-bold text-white">
                    {activeResult.winRatePct}%
                  </span>
                  <span className="mono-nums block text-[10px] text-slate-400">
                    {activeResult.totalTrades} {lang === "tr" ? "işlem" : "trd"} &middot;{" "}
                    <strong
                      className={
                        activeResult.expectancyUsd >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }
                    >
                      {activeResult.expectancyUsd >= 0 ? "+" : ""}
                      {formatUsd(activeResult.expectancyUsd)}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div className="obsidian-card px-3 py-2.5">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                PF &middot; Sharpe &middot; DD
              </span>
              {isBootingChart ? (
                <div className="mt-1.5 h-5 w-20 animate-pulse rounded bg-white/[0.06]" />
              ) : (
                <div className="mt-1 mono-nums">
                  <span className="block text-base font-bold text-white">
                    {activeResult.profitFactor}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    SR {activeResult.sharpeRatio} &middot;{" "}
                    <strong className="text-rose-400">-{activeResult.maxDrawdownPct}%</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Dual-Pane Chart Card */}
          <div className="obsidian-card overflow-hidden">
            <QuantCandlestickChart
              symbol={symbol}
              timeframe={timeframe}
              candles={candles}
              result={activeResult}
              lang={lang}
              isLoading={isLoadingFeed && candles.length === 0}
            />
          </div>

          {/* Analytical Workspace Tabs Card */}
          <div className="obsidian-card flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3">
              <div className="flex items-center gap-0.5 overflow-x-auto text-[11px] font-semibold">
                {(
                  [
                    {
                      id: "trades",
                      tr: `İşlemler (${activeResult.trades.length})`,
                      en: `Trades (${activeResult.trades.length})`,
                    },
                    {
                      id: "tournament",
                      tr: "Stratejiler (6)",
                      en: "Strategies (6)",
                    },
                    {
                      id: "sentinel",
                      tr: "7/24 Sentinel",
                      en: "Sentinel",
                    },
                    {
                      id: "audit",
                      tr: "Motor & SSS",
                      en: "Audit & FAQ",
                    },
                  ] as const
                ).map((tab) => {
                  const active = bottomTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBottomTab(tab.id)}
                      className={`border-b-2 px-2.5 py-2.5 whitespace-nowrap transition cursor-pointer ${
                        active
                          ? "border-emerald-400 text-white"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {lang === "tr" ? tab.tr : tab.en}
                    </button>
                  );
                })}
              </div>

              {bottomTab === "trades" && (
                <div className="flex items-center gap-2 py-1.5">
                  {activeResult.trades.length > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded bg-white/[0.04] px-2 py-0.5 text-[10.5px] mono-nums text-slate-300">
                      <span className="text-emerald-400 font-semibold">
                        {winLossCounts.wins} {lang === "tr" ? "Kâr" : "Win"}
                      </span>
                      <span className="text-slate-600">/</span>
                      <span className="text-rose-400 font-semibold">
                        {winLossCounts.losses} {lang === "tr" ? "Zarar" : "Loss"}
                      </span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={onExportTradesCsv}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#080B10] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-white/[0.2] hover:text-white cursor-pointer"
                  >
                    <Download className="h-3 w-3 text-emerald-400" />
                    <span>{lang === "tr" ? "CSV İndir" : "Export CSV"}</span>
                    {!isPaid && <Lock className="h-2.5 w-2.5 opacity-60" />}
                  </button>
                </div>
              )}

              {bottomTab === "sentinel" && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-semibold ${
                    sentinelCloudActive
                      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                      : "border-white/[0.08] bg-white/[0.03] text-slate-400"
                  }`}
                >
                  <Cloud className="h-3 w-3" />
                  {sentinelCloudActive
                    ? lang === "tr"
                      ? "Bulut Cron Aktif"
                      : "Cloud Cron On"
                    : lang === "tr"
                      ? "Bulut Hazır"
                      : "Cloud Ready"}
                </span>
              )}
            </div>

            {/* Tab 1: Executed Trades (All critical columns fit cleanly at 960px without horizontal clipping) */}
            {bottomTab === "trades" && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead className="border-b border-white/[0.06] bg-[#090D14] text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-2.5 py-2 whitespace-nowrap">#</th>
                      <th className="px-2 py-2 whitespace-nowrap">
                        {lang === "tr" ? "Yön" : "Side"}
                      </th>
                      <th className="px-2 py-2 whitespace-nowrap">
                        {lang === "tr" ? "Tarih (UTC)" : "Time (UTC)"}
                      </th>
                      <th className="hidden xl:table-cell px-2 py-2 text-right whitespace-nowrap">
                        {lang === "tr" ? "Giriş" : "Entry"}
                      </th>
                      <th className="hidden lg:table-cell px-2 py-2 text-right whitespace-nowrap">
                        {lang === "tr" ? "Çıkış" : "Exit"}
                      </th>
                      <th className="px-2 py-2 text-center whitespace-nowrap">
                        {lang === "tr" ? "Durum" : "Stat"}
                      </th>
                      <th className="px-2 py-2 text-right whitespace-nowrap">Net %</th>
                      <th className="px-2 py-2 text-right whitespace-nowrap">PnL ($)</th>
                      <th className="px-2.5 py-2 text-right whitespace-nowrap">
                        {lang === "tr" ? "Kasa" : "Equity"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.045]">
                    {visibleTrades.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.025]">
                        <td className="mono-nums px-2.5 py-2 text-slate-500">#{t.id}</td>
                        <td className="px-2 py-2">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[9.5px] font-bold ${
                              t.side === "SHORT"
                                ? "bg-purple-500/20 text-purple-300"
                                : "bg-emerald-500/15 text-emerald-300"
                            }`}
                          >
                            {t.side}
                          </span>
                        </td>
                        <td className="mono-nums px-2 py-2 text-slate-300 whitespace-nowrap">
                          {formatShortDate(t.entryTime)}
                        </td>
                        <td className="hidden xl:table-cell mono-nums px-2 py-2 text-right text-slate-100 whitespace-nowrap">
                          {formatPrice(t.entryPrice)}
                        </td>
                        <td className="hidden lg:table-cell mono-nums px-2 py-2 text-right text-slate-300 whitespace-nowrap">
                          {formatPrice(t.exitPrice)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[9.5px] font-bold ${
                              t.exitReason === "TP"
                                ? "bg-amber-500/20 text-amber-300"
                                : t.exitReason === "SL"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : t.exitReason === "OPEN"
                                    ? "bg-cyan-500/20 text-cyan-300"
                                    : "bg-white/[0.06] text-slate-300"
                            }`}
                          >
                            {t.exitReason}
                          </span>
                        </td>
                        <td
                          className={`mono-nums px-2 py-2 text-right font-semibold whitespace-nowrap ${
                            t.netReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {t.netReturnPct >= 0 ? "+" : ""}
                          {t.netReturnPct}%
                        </td>
                        <td
                          className={`mono-nums px-2 py-2 text-right font-semibold whitespace-nowrap ${
                            t.pnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {t.pnlUsd >= 0 ? "+" : ""}
                          {formatUsd(t.pnlUsd)}
                        </td>
                        <td className="mono-nums px-2.5 py-2 text-right font-semibold text-white whitespace-nowrap">
                          {formatUsd(t.equityAfter)}
                        </td>
                      </tr>
                    ))}
                    {activeResult.trades.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                          {isBootingChart
                            ? lang === "tr"
                              ? "Canlı 1.000 mum yükleniyor..."
                              : "Syncing live 1,000-bar dataset..."
                            : lang === "tr"
                              ? "Bu ayarlarla gerçekleşen işlem yok. SL/TP veya periyodu ayarlayın."
                              : "No trades triggered with current parameters."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {reversedTrades.length > 10 && (
                  <div className="border-t border-white/[0.06] bg-[#090D14] px-3.5 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllTrades((s) => !s)}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      {showAllTrades
                        ? lang === "tr"
                          ? "Daha Az Göster (İlk 10)"
                          : "Show Latest 10 Trades"
                        : lang === "tr"
                          ? `Tüm İşlemleri Göster (${reversedTrades.length})`
                          : `Show All ${reversedTrades.length} Trades`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: 6-Strategy League */}
            {bottomTab === "tournament" && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[11.5px]">
                  <thead className="border-b border-white/[0.06] bg-[#090D14] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-3.5 py-2.5 whitespace-nowrap">#</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">
                        {lang === "tr" ? "Algoritma (Yüklemek için Tıkla)" : "Algorithm (Click to Load)"}
                      </th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">
                        {lang === "tr" ? "Kör OOS %30" : "Blind OOS 30%"}
                      </th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">
                        {lang === "tr" ? "Net Getiri" : "Net Return"}
                      </th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Win %</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">PF</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Max DD</th>
                      <th className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        {lang === "tr" ? "Sinyal" : "Signal"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.045]">
                    {tournament.map((strat, index) => {
                      const isSelected = strat.strategyId === activeStrategyId;
                      return (
                        <tr
                          key={strat.strategyId}
                          onClick={() => onSelectStrategy(strat.strategyId)}
                          className={`cursor-pointer transition ${
                            isSelected ? "bg-emerald-500/10" : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <td className="mono-nums px-3.5 py-2.5 text-slate-400 whitespace-nowrap">
                            {index === 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                                <Award className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                #1
                              </span>
                            ) : (
                              `#${index + 1}`
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-white">
                              {lang === "tr" ? strat.nameTr : strat.nameEn}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {lang === "tr" ? strat.descTr : strat.descEn}
                            </span>
                          </td>
                          <td
                            className={`mono-nums px-3 py-2.5 text-right font-bold whitespace-nowrap ${
                              strat.outOfSampleReturnPct >= 0
                                ? "text-cyan-300"
                                : "text-rose-400"
                            }`}
                          >
                            {strat.outOfSampleReturnPct >= 0 ? "+" : ""}
                            {strat.outOfSampleReturnPct}%
                          </td>
                          <td
                            className={`mono-nums px-3 py-2.5 text-right font-bold whitespace-nowrap ${
                              strat.netProfitPct >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {strat.netProfitPct >= 0 ? "+" : ""}
                            {strat.netProfitPct}%
                          </td>
                          <td className="mono-nums px-3 py-2.5 text-right text-slate-200 whitespace-nowrap">
                            {strat.winRatePct}% ({strat.totalTrades})
                          </td>
                          <td className="mono-nums px-3 py-2.5 text-right text-slate-200 whitespace-nowrap">
                            {strat.profitFactor}
                          </td>
                          <td className="mono-nums px-3 py-2.5 text-right text-rose-400 whitespace-nowrap">
                            -{strat.maxDrawdownPct}%
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-[9.5px] font-bold ${
                                strat.currentSignal === "LONG"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : strat.currentSignal === "SHORT"
                                    ? "bg-purple-500/20 text-purple-300"
                                    : "bg-white/[0.06] text-slate-400"
                              }`}
                            >
                              {strat.currentSignal}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: 24/7 Cloud Sentinel */}
            {bottomTab === "sentinel" && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        {lang === "tr" ? "Bildirim Kanalı" : "Alert Delivery Channel"}
                      </span>
                      <button
                        type="button"
                        onClick={onToggleLocalSentinel}
                        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                          sentinelEnabled
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                            : "border-white/[0.1] bg-[#080B10] text-slate-400 hover:text-white"
                        }`}
                      >
                        <BellRing className="h-3 w-3" />
                        {sentinelEnabled
                          ? lang === "tr"
                            ? "Tarayıcı Nöbeti (15dk): AÇIK"
                            : "Tab Timer (15m): ON"
                          : lang === "tr"
                            ? "Tarayıcı Nöbeti: KAPALI"
                            : "Tab Timer: OFF"}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 rounded-lg border border-white/[0.08] bg-[#080B10] p-0.5 text-[11px] font-semibold">
                      {(
                        [
                          { id: "discord", label: "Discord" },
                          { id: "telegram", label: "Telegram" },
                          { id: "webhook", label: "Custom JSON" },
                        ] as AlertChannelOption[]
                      ).map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => onChangeAlertChannel(ch.id)}
                          className={`rounded-md py-1 transition cursor-pointer ${
                            alertChannel === ch.id
                              ? "bg-white/[0.12] text-white"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>

                    {alertChannel === "telegram" ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          type="password"
                          value={telegramBotToken}
                          onChange={(e) => onChangeTelegramToken(e.target.value)}
                          placeholder="Telegram Bot Token (AES-256-GCM)"
                          className="mono-nums rounded-lg border border-white/[0.1] bg-[#080B10] px-2.5 py-2 text-[11px] text-white focus:border-emerald-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={telegramChatId}
                          onChange={(e) => onChangeTelegramChatId(e.target.value)}
                          placeholder="Chat / Channel ID"
                          className="mono-nums rounded-lg border border-white/[0.1] bg-[#080B10] px-2.5 py-2 text-[11px] text-white focus:border-emerald-400 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <input
                        type="url"
                        value={alertWebhookUrl}
                        onChange={(e) => onChangeWebhookUrl(e.target.value)}
                        placeholder={
                          alertChannel === "discord"
                            ? "https://discord.com/api/webhooks/..."
                            : "https://your-bot.domain/hooks/vaultsheet"
                        }
                        className="mono-nums w-full rounded-lg border border-white/[0.1] bg-[#080B10] px-2.5 py-2 text-[11px] text-white focus:border-emerald-400 focus:outline-none"
                      />
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold uppercase tracking-wider text-slate-300">
                        {lang === "tr"
                          ? `7/24 Bulut İzleme Listesi (${sentinelSymbols.length} Parite)`
                          : `24/7 Cloud Watchlist (${sentinelSymbols.length} Pairs)`}
                      </span>
                      {lastSentinelScan && (
                        <span className="mono-nums text-[10px] text-slate-500">
                          {lang === "tr" ? "Son Tarama:" : "Last Scan:"} {lastSentinelScan}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                      {QUANT_ASSETS.map((a) => {
                        const activeWatch = sentinelSymbols.includes(a.symbol);
                        return (
                          <button
                            key={a.symbol}
                            type="button"
                            onClick={() => onToggleSentinelSymbol(a.symbol, a.label, a.proOnly)}
                            className={`rounded-md border px-1.5 py-1 text-[10px] font-semibold transition cursor-pointer ${
                              activeWatch
                                ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-200"
                                : "border-white/[0.08] bg-[#080B10] text-slate-400 hover:text-white"
                            }`}
                          >
                            {a.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isSyncingCloud}
                      onClick={() => onSaveCloudSentinel(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50 cursor-pointer"
                    >
                      <Cloud className="h-3.5 w-3.5" />
                      <span>
                        {isSyncingCloud
                          ? lang === "tr"
                            ? "Kaydediliyor..."
                            : "Saving..."
                          : lang === "tr"
                            ? "7/24 Buluta Kaydet (Şifreli)"
                            : "Save 24/7 Cloud Watchlist"}
                      </span>
                    </button>

                    {sentinelTriggerUrl && (
                      <>
                        <button
                          type="button"
                          disabled={isRunningCloudScan}
                          onClick={onTriggerCloudScan}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#080B10] px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:text-white disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${isRunningCloudScan ? "animate-spin" : ""}`}
                          />
                          <span>{lang === "tr" ? "Bulutu Şimdi Tara" : "Scan Cloud Now"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onCopyCronUrl(sentinelTriggerUrl)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.1] bg-[#080B10] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
                        >
                          {copiedCronUrl ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{lang === "tr" ? "Cron URL" : "Copy Cron URL"}</span>
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isSendingAlert}
                    onClick={onDispatchAlert}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-3 w-3" />
                    <span>
                      {isSendingAlert
                        ? lang === "tr"
                          ? "Gönderiliyor..."
                          : "Dispatching..."
                        : lang === "tr"
                          ? "Aktif Sinyali Şimdi Gönder"
                          : "Dispatch Live Signal"}
                    </span>
                  </button>
                </div>

                {alertStatus && (
                  <p
                    className={`rounded-lg border px-3 py-2 text-[11px] ${
                      alertStatus.ok
                        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                        : "border-rose-500/35 bg-rose-500/10 text-rose-200"
                    }`}
                  >
                    {alertStatus.msg}
                  </p>
                )}
              </div>
            )}

            {/* Tab 4: Institutional Audit & FAQ */}
            {bottomTab === "audit" && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[11px]">
                  <div className="rounded-lg border border-white/[0.07] bg-[#080B10] p-2.5">
                    <span className="mono-nums font-bold text-emerald-400">01 · WALK-FORWARD</span>
                    <p className="mt-1 text-slate-400">
                      {lang === "tr"
                        ? "İlk %70 eğitimde seçim, son %30 görünmemiş mumlarda sıfır-sızıntılı kör test."
                        : "70% In-Sample selection verified blindly on final 30% OOS candles."}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[0.07] bg-[#080B10] p-2.5">
                    <span className="mono-nums font-bold text-cyan-400">02 · REALISTIC COST</span>
                    <p className="mt-1 text-slate-400">
                      {lang === "tr"
                        ? "Her işlemde %0.06/taraf taker komisyon, %0.04/taraf kayma ve 8 saatlik fonlama kesilir."
                        : "0.06% taker fee/side, 0.04% slippage/side, and 8h perpetual funding drag deducted."}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[0.07] bg-[#080B10] p-2.5">
                    <span className="mono-nums font-bold text-purple-400">03 · BI-DIRECTIONAL</span>
                    <p className="mt-1 text-slate-400">
                      {lang === "tr"
                        ? "Hem Long hem Short mum içi SL/TP ve tahmini likidasyon fiyatlaması."
                        : "Long & Short intrabar high/low SL/TP execution with leverage liquidation price."}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[0.07] bg-[#080B10] p-2.5">
                    <span className="mono-nums font-bold text-amber-400">04 · CLOUD CRON</span>
                    <p className="mt-1 text-slate-400">
                      {lang === "tr"
                        ? "Telegram tokenları AES-256-GCM şifrelenir; imzalı cron bağlantısı 7/24 sinyal atar."
                        : "Telegram secrets use AES-256-GCM server encryption + signed HMAC 24/7 cron."}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.07] bg-[#080B10]">
                  {faqs.map((item) => (
                    <details key={item.q} className="group">
                      <summary className="flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:text-white">
                        <span>{item.q}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500 transition group-open:rotate-180" />
                      </summary>
                      <p className="px-3.5 pb-3 text-[11px] leading-relaxed text-slate-400">
                        {item.a}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT DOCK (Visible Side-by-Side >=768px md+ & Mobile Trade Tab): Execution Card + Visual R:R + Params + Squeeze */}
        <aside
          className={`${
            mobilePane === "trade" ? "flex" : "hidden md:flex"
          } flex-col gap-2.5`}
        >
          {/* Card 1: Actionable Execution Ticket + Visual Risk-to-Reward Gauge */}
          <div className="obsidian-card p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-200">
                <Target className="h-3.5 w-3.5 text-emerald-400" />
                {lang === "tr" ? "Emir & Risk Planı" : "Execution Ticket"}
              </span>
              <span
                className={`mono-nums rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  ticketSide === "SHORT"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/35"
                    : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35"
                }`}
              >
                {ticketSide} &middot; {leverage}x
              </span>
            </div>

            {isBootingChart ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 animate-pulse rounded bg-white/[0.05]" />
                ))}
              </div>
            ) : (
              <>
                {/* Visual Risk-to-Reward Gauge */}
                <div className="rounded-lg border border-white/[0.07] bg-[#080B10] p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="mono-nums font-bold text-rose-400">
                      SL {formatPrice(activeResult.suggestedStopPrice)}
                    </span>
                    <span className="mono-nums rounded bg-white/[0.06] px-1.5 py-0.5 font-bold text-slate-200">
                      1 : {rrRatio.toFixed(2)} R:R
                    </span>
                    <span className="mono-nums font-bold text-emerald-400">
                      TP {formatPrice(activeResult.suggestedTargetPrice)}
                    </span>
                  </div>

                  <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full bg-rose-500/75"
                      style={{ width: `${Math.max(12, Math.min(75, slSharePct))}%` }}
                    />
                    <div className="h-full flex-1 bg-emerald-500/80" />
                  </div>

                  <div className="flex items-center justify-between mono-nums text-[10px] text-slate-400">
                    <span className="text-rose-400">
                      -{stopLossPct}% (-{formatUsd(ticketRiskUsd)})
                    </span>
                    <span className="text-white font-semibold">
                      {formatPrice(ticketEntry)}
                    </span>
                    <span className="text-emerald-400">
                      +{takeProfitPct}% (+{formatUsd(ticketRewardUsd)})
                    </span>
                  </div>
                </div>

                {/* Crisp Execution Breakdown */}
                <div className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.07] bg-[#080B10] text-[11px]">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-slate-400">
                      {lang === "tr" ? "Pozisyon Büyüklüğü" : "Position Size"}
                    </span>
                    <span className="mono-nums font-semibold text-white">
                      {ticketUnits.toFixed(4)} ({formatUsd(ticketNotional)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <ShieldAlert className="h-3 w-3" />
                      {lang === "tr" ? "Tahmini Likidasyon" : "Est. Liquidation"}
                    </span>
                    <span className="mono-nums font-bold text-amber-300">
                      {activeResult.estimatedLiquidationPrice > 0
                        ? `${formatPrice(activeResult.estimatedLiquidationPrice)}`
                        : lang === "tr"
                          ? "Yok (1x Spot)"
                          : "None (1x Spot)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-slate-400">
                      {lang === "tr" ? "Half-Kelly & Kesinti" : "Kelly & Costs"}
                    </span>
                    <span className="mono-nums text-slate-300">
                      {activeResult.kellyFractionPct}% &middot; -
                      {formatUsd(activeResult.totalCostsUsd)}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isBootingChart}
                onClick={() => onCopyTicket(buildCopyText())}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#121822] py-2 text-[11px] font-semibold text-white transition hover:border-white/[0.2] disabled:opacity-50 cursor-pointer"
              >
                {copiedTicket ? (
                  <>
                    <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{lang === "tr" ? "Kopyalandı" : "Copied"}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>{lang === "tr" ? "Emri Kopyala" : "Copy Setup"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isBootingChart || isSendingAlert}
                onClick={onDispatchAlert}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{lang === "tr" ? "Sinyal At" : "Send Alert"}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Calm Strategy Switcher + Risk Sliders */}
          <div className="obsidian-card p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-200">
                <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
                {lang === "tr" ? "Strateji & Parametre" : "Strategy & Risk"}
              </span>
              <Activity className="h-3.5 w-3.5 text-slate-500" />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {tournament.map((strat) => {
                const active = strat.strategyId === activeStrategyId;
                const metaLabel = SHORT_STRATEGY_LABELS[strat.strategyId];
                const pos = strat.outOfSampleReturnPct >= 0;
                return (
                  <button
                    key={strat.strategyId}
                    type="button"
                    onClick={() => onSelectStrategy(strat.strategyId)}
                    className={`flex items-center justify-between rounded-lg border px-2 py-1.5 text-[10.5px] transition cursor-pointer ${
                      active
                        ? "border-emerald-500/50 bg-emerald-500/12 text-white"
                        : "border-white/[0.07] bg-[#080B10] text-slate-300 hover:border-white/[0.16]"
                    }`}
                  >
                    <span className="truncate font-semibold">
                      {lang === "tr" ? metaLabel.tr : metaLabel.en}
                    </span>
                    <span
                      className={`mono-nums ml-1 text-[10px] font-bold ${
                        pos ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {pos ? "+" : ""}
                      {strat.outOfSampleReturnPct}%
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2.5 text-[11px]">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>{lang === "tr" ? "Kasa" : "Capital"}</span>
                    <span className="mono-nums font-bold text-white">{formatUsd(capital)}</span>
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={100000}
                    step={1000}
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    aria-label="Account capital"
                    className="quant-range mt-1.5 w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300">
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
                    className="quant-range mt-1.5 w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex justify-between text-slate-300">
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
                    className="quant-range mt-1.5 w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>Take-Profit</span>
                    <span className="mono-nums font-bold text-emerald-400">{takeProfitPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={20}
                    step={0.5}
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                    aria-label="Take profit percent"
                    className="quant-range mt-1.5 w-full"
                  />
                </div>
              </div>

              {/* Progressive Disclosure for Fast / Slow Indicator Tuning */}
              <details className="rounded-lg border border-white/[0.06] bg-[#080B10] px-2.5 py-1.5 group">
                <summary className="flex items-center justify-between text-[10.5px] font-semibold text-slate-400 hover:text-slate-200">
                  <span>
                    {lang === "tr"
                      ? `İndikatör Periyodu (${fastPeriod} / ${slowPeriod})`
                      : `Indicator Periods (${fastPeriod} / ${slowPeriod})`}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-2 gap-2.5 pt-2.5 pb-1">
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
                      className="quant-range mt-1 w-full"
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
                      className="quant-range mt-1 w-full"
                    />
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* Card 3: Derivatives Squeeze + 4-TF Matrix + Sentinel Dock */}
          <div className="obsidian-card p-3.5 space-y-2.5 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300 whitespace-nowrap">
                <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                {lang === "tr" ? "Vadeli & MTF" : "Squeeze & MTF"}
              </span>
              <span className="mono-nums text-[10px] text-slate-400 whitespace-nowrap">
                {derivativesPulse.squeezeScore}/100 &middot; {derivativesPulse.takerBuySellRatio}x
              </span>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-[#080B10] p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="font-semibold text-white">
                  {lang === "tr"
                    ? derivativesPulse.squeezeLabelTr
                    : derivativesPulse.squeezeLabelEn}
                </span>
                <span className="mono-nums text-emerald-400">
                  F: {derivativesPulse.fundingRatePct >= 0 ? "+" : ""}
                  {derivativesPulse.fundingRatePct.toFixed(4)}%
                </span>
              </div>

              <div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-rose-500/35">
                  <div
                    className="h-full bg-emerald-400"
                    style={{
                      width: `${Math.min(100, Math.max(5, derivativesPulse.whaleLongPct))}%`,
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between mono-nums text-[9.5px] text-slate-400">
                  <span>Long {derivativesPulse.whaleLongPct}%</span>
                  <span>OI {formatCompactUsd(derivativesPulse.openInterestUsd)}</span>
                  <span>Short {derivativesPulse.whaleShortPct}%</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 border-t border-white/[0.06] pt-2">
                {mtfEntries.map((m) => (
                  <button
                    key={`mtf-${m.timeframe}`}
                    type="button"
                    onClick={() => {
                      const tfObj = TIMEFRAMES.find((t) => t.id === m.timeframe);
                      if (tfObj) onSelectTimeframe(tfObj);
                    }}
                    className={`rounded-md border px-1 py-1 text-center text-[9.5px] font-semibold mono-nums transition cursor-pointer ${
                      m.currentSignal === "LONG"
                        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                        : m.currentSignal === "SHORT"
                          ? "border-rose-500/35 bg-rose-500/10 text-rose-300"
                          : "border-white/[0.08] bg-[#06090F] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {m.timeframe.toUpperCase()}{" "}
                    {m.currentSignal === "LONG" ? "▲" : m.currentSignal === "SHORT" ? "▼" : "•"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBottomTab("sentinel");
                  setMobilePane("chart");
                }}
                className="flex flex-1 items-center justify-between rounded-lg border border-white/[0.08] bg-[#080B10] px-3 py-2 text-[10.5px] font-semibold text-slate-300 hover:border-white/[0.16] hover:text-white transition cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Cloud className="h-3.5 w-3.5 text-cyan-400" />
                  {lang === "tr"
                    ? `7/24 Sentinel (${sentinelSymbols.length})`
                    : `Cloud Sentinel (${sentinelSymbols.length})`}
                </span>
                <span className="text-emerald-400">&rarr;</span>
              </button>

              {!isPaid && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenUpgrade(
                      lang === "tr"
                        ? "Tüm 12 parite, 15m/1D dilimler, limitsiz OOS optimize ve 7/24 bulut uyarılarını aç."
                        : "Unlock all 12 pairs, 15m/1D timeframes, unlimited OOS sweeps & 24/7 cloud alerts."
                    )
                  }
                  className="mono-nums rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-2 text-[10.5px] font-bold text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                >
                  Pro $12
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
