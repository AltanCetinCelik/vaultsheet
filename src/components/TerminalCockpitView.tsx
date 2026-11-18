"use client";

import React, { useMemo, useState } from "react";
import {
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
  SlidersHorizontal,
  Sparkles,
  X,
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

export default function TerminalCockpitView({
  lang,
  isPaid,
  consumedFreeOpt,
  symbol,
  timeframe,
  directionMode,
  setDirectionMode,
  candles,
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
  const [rightTab, setRightTab] = useState<"order" | "tune">("order");
  const [bottomTab, setBottomTab] = useState<
    "trades" | "markets" | "strategies" | "sentinel" | "audit"
  >("trades");
  const [pairSearch, setPairSearch] = useState<string>("");
  const [assetMenuOpen, setAssetMenuOpen] = useState<boolean>(false);
  const [showAllTrades, setShowAllTrades] = useState<boolean>(false);
  const [dismissedOptMsg, setDismissedOptMsg] = useState<string | null>(null);

  const isBootingChart = candles.length === 0;
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

  const activeMtf = mtfEntries.find((m) => m.timeframe === timeframe);

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
    <section id="workbench" className="px-4 py-4 sm:px-6 sm:py-5 space-y-4">
      {/* 1. CLEAN WORKSPACE BAR: Asset Switcher + Concise Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Primary Asset Identity & Price */}
        <div className="relative flex items-center gap-4">
          <button
            type="button"
            onClick={() => setAssetMenuOpen((o) => !o)}
            className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#10151F] px-3.5 py-2 text-left transition hover:border-white/[0.16] cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-white">
                  {activeAssetMeta?.label ?? symbol.replace("USDT", "")}/USDT
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    assetMenuOpen ? "rotate-180 text-emerald-400" : ""
                  }`}
                />
              </div>
              <span className="block text-[11px] text-slate-400">
                {lang === "tr" ? activeResult.nameTr : activeResult.nameEn}
              </span>
            </div>

            <div className="border-l border-white/[0.08] pl-3">
              {isBootingChart ? (
                <div className="h-5 w-20 animate-pulse rounded bg-white/[0.06]" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="tabular-nums text-lg font-bold text-white">
                    {formatPrice(lastPrice)}
                  </span>
                  <span
                    className={`tabular-nums text-xs font-semibold ${
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

          {/* Popover Asset Switcher */}
          {assetMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setAssetMenuOpen(false)}
              />
              <div className="absolute left-0 top-full z-40 mt-2 w-[310px] sm:w-[340px] rounded-xl border border-white/[0.12] bg-[#10151F]/95 p-3 shadow-2xl backdrop-blur-md">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={pairSearch}
                    onChange={(e) => setPairSearch(e.target.value)}
                    placeholder={lang === "tr" ? "Parite ara (BTC, SOL...)" : "Search pairs..."}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#090C12] px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={onRefreshRadar}
                    className="rounded-lg border border-white/[0.1] bg-[#090C12] p-1.5 text-slate-300 hover:text-white cursor-pointer"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isScanningRadar ? "animate-spin text-emerald-400" : ""}`}
                    />
                  </button>
                </div>

                <div className="max-h-72 space-y-1 overflow-y-auto terminal-scroll pr-1">
                  {radarRows.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      {lang === "tr" ? "Piyasalar yükleniyor..." : "Syncing markets..."}
                    </div>
                  ) : (
                    displayedRadar.map((row) => {
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
                              ? "bg-emerald-500/15 text-white"
                              : "hover:bg-white/[0.04] text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{row.base}/USDT</span>
                            {locked && <Lock className="h-3 w-3 text-slate-500" />}
                          </div>
                          <div className="tabular-nums flex items-center gap-3">
                            <span className="text-slate-300">{formatPrice(row.price)}</span>
                            <span
                              className={`text-[11px] font-medium ${
                                pos ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {pos ? "+" : ""}
                              {row.outOfSampleReturnPct}%
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Clean Compact Controls (Direction Select + TF + Optimize) */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={directionMode}
            onChange={(e) => setDirectionMode(e.target.value as TradeDirectionMode)}
            aria-label={lang === "tr" ? "İşlem Yönü" : "Trade Direction"}
            className="rounded-lg border border-white/[0.08] bg-[#10151F] px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:border-emerald-400 focus:outline-none"
          >
            <option value="both">{lang === "tr" ? "Long + Short" : "Long & Short"}</option>
            <option value="long">{lang === "tr" ? "Sadece Long" : "Long Only"}</option>
            <option value="short">{lang === "tr" ? "Sadece Short" : "Short Only"}</option>
          </select>

          <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#10151F] p-0.5 text-xs font-medium tabular-nums">
            {TIMEFRAMES.map((tf) => {
              const active = timeframe === tf.id;
              const locked = Boolean(tf.proOnly && !isPaid);
              return (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => onSelectTimeframe(tf)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition cursor-pointer ${
                    active
                      ? "bg-white/[0.12] text-white"
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-45 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>{lang === "tr" ? "OOS Optimize" : "Optimize OOS"}</span>
            {!isPaid && (
              <span className="ml-0.5 rounded bg-slate-950/15 px-1.5 py-0.5 text-[10px] font-bold">
                {consumedFreeOpt ? "PRO" : lang === "tr" ? "1 Hak" : "1 Free"}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dismissible Optimize Result Strip */}
      {showOptToast && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
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

      {/* 2. BORDERLESS TYPOGRAPHIC SUMMARY STRIP (4 Calm Chunks - Miller's Law) */}
      <div className="grid grid-cols-2 gap-4 border-y border-white/[0.06] py-3 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-white/[0.06]">
        <div className="sm:pr-5">
          <span className="text-[11px] font-medium text-slate-400">
            {lang === "tr" ? "Kör OOS (%30 Test)" : "Blind OOS (30%)"}
          </span>
          {isBootingChart ? (
            <div className="mt-1 h-6 w-20 animate-pulse rounded bg-white/[0.06]" />
          ) : (
            <div className="mt-0.5 flex items-baseline gap-2">
              <span
                className={`tabular-nums text-xl font-semibold ${
                  activeResult.outOfSampleReturnPct >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {activeResult.outOfSampleReturnPct >= 0 ? "+" : ""}
                {activeResult.outOfSampleReturnPct}%
              </span>
              <span className="text-[11px] text-slate-500">
                {activeResult.isRobustOos
                  ? lang === "tr"
                    ? "Doğrulandı"
                    : "Verified"
                  : `IS ${activeResult.inSampleReturnPct}%`}
              </span>
            </div>
          )}
        </div>

        <div className="sm:px-5">
          <span className="text-[11px] font-medium text-slate-400">
            {lang === "tr" ? "Toplam Net Getiri" : "Total Net Return"}
          </span>
          {isBootingChart ? (
            <div className="mt-1 h-6 w-20 animate-pulse rounded bg-white/[0.06]" />
          ) : (
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="tabular-nums text-xl font-semibold text-white">
                {activeResult.netProfitPct >= 0 ? "+" : ""}
                {activeResult.netProfitPct}%
              </span>
              <span className="tabular-nums text-[11px] text-slate-500">
                {lang === "tr" ? "Alfa" : "Alpha"}{" "}
                {activeResult.alphaPct >= 0 ? "+" : ""}
                {activeResult.alphaPct}%
              </span>
            </div>
          )}
        </div>

        <div className="sm:px-5">
          <span className="text-[11px] font-medium text-slate-400">
            {lang === "tr" ? "Kazanma Oranı" : "Win Rate"}
          </span>
          {isBootingChart ? (
            <div className="mt-1 h-6 w-20 animate-pulse rounded bg-white/[0.06]" />
          ) : (
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="tabular-nums text-xl font-semibold text-white">
                {activeResult.winRatePct}%
              </span>
              <span className="tabular-nums text-[11px] text-slate-500">
                {activeResult.totalTrades} {lang === "tr" ? "işlem" : "trades"} ·{" "}
                {activeResult.expectancyUsd >= 0 ? "+" : ""}
                {formatUsd(activeResult.expectancyUsd)}
              </span>
            </div>
          )}
        </div>

        <div className="sm:pl-5">
          <span className="text-[11px] font-medium text-slate-400">
            {lang === "tr" ? "Profit Factor · Max Düşüş" : "Profit Factor · Drawdown"}
          </span>
          {isBootingChart ? (
            <div className="mt-1 h-6 w-20 animate-pulse rounded bg-white/[0.06]" />
          ) : (
            <div className="mt-0.5 flex items-baseline gap-2 tabular-nums">
              <span className="text-xl font-semibold text-white">
                {activeResult.profitFactor}
              </span>
              <span className="text-[11px] text-slate-500">
                DD -{activeResult.maxDrawdownPct}% · SR {activeResult.sharpeRatio}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. CALM TWO-COLUMN FOCUS WORKSPACE (Chart Left ~69% | Unified Order/Tune Panel Right ~31%) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_312px] lg:grid-cols-[minmax(0,1fr)_336px] items-start">
        {/* LEFT FOCAL STAGE: Chart Card + Tabbed Deep-Dive Card */}
        <div className="space-y-4 min-w-0">
          <div className="calm-surface overflow-hidden">
            <QuantCandlestickChart
              symbol={symbol}
              timeframe={timeframe}
              candles={candles}
              result={activeResult}
              lang={lang}
              isLoading={isLoadingFeed && candles.length === 0}
            />
          </div>

          {/* Progressive Disclosure Level 3 Tabs */}
          <div className="calm-surface overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4">
              <div className="flex items-center gap-1 overflow-x-auto text-xs font-medium">
                {(
                  [
                    {
                      id: "trades",
                      tr: `İşlemler (${activeResult.trades.length})`,
                      en: `Trades (${activeResult.trades.length})`,
                    },
                    {
                      id: "markets",
                      tr: "Piyasalar (12)",
                      en: "Markets (12)",
                    },
                    {
                      id: "strategies",
                      tr: "Stratejiler (6)",
                      en: "Strategies (6)",
                    },
                    {
                      id: "sentinel",
                      tr: "7/24 Bot",
                      en: "Cloud Bot",
                    },
                    {
                      id: "audit",
                      tr: "Kurallar",
                      en: "Audit",
                    },
                  ] as const
                ).map((tab) => {
                  const active = bottomTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBottomTab(tab.id)}
                      className={`border-b-2 px-3 py-3 whitespace-nowrap transition cursor-pointer ${
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
                <div className="flex items-center gap-3 py-2">
                  {activeResult.trades.length > 0 && (
                    <span className="hidden sm:inline text-xs tabular-nums text-slate-400">
                      <span className="text-emerald-400 font-medium">
                        {winLossCounts.wins}W
                      </span>{" "}
                      /{" "}
                      <span className="text-rose-400 font-medium">
                        {winLossCounts.losses}L
                      </span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={onExportTradesCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#090C12] px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-white/[0.18] hover:text-white cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-400" />
                    <span>CSV</span>
                    {!isPaid && <Lock className="h-3 w-3 opacity-60" />}
                  </button>
                </div>
              )}
            </div>

            {/* Tab 1: Calm Executed Trades Ledger */}
            {bottomTab === "trades" && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-white/[0.06] text-[11px] font-medium text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5 whitespace-nowrap">#</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">
                        {lang === "tr" ? "Yön" : "Side"}
                      </th>
                      <th className="px-3 py-2.5 whitespace-nowrap">
                        {lang === "tr" ? "Tarih (UTC)" : "Time (UTC)"}
                      </th>
                      <th className="hidden lg:table-cell px-3 py-2.5 text-right whitespace-nowrap">
                        {lang === "tr" ? "Giriş" : "Entry"}
                      </th>
                      <th className="px-3 py-2.5 text-center whitespace-nowrap">
                        {lang === "tr" ? "Çıkış" : "Exit"}
                      </th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Net %</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">PnL</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">
                        {lang === "tr" ? "Kasa" : "Equity"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {visibleTrades.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02]">
                        <td className="tabular-nums px-4 py-3 text-slate-500">#{t.id}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`text-[11px] font-semibold ${
                              t.side === "SHORT" ? "text-purple-300" : "text-emerald-400"
                            }`}
                          >
                            {t.side}
                          </span>
                        </td>
                        <td className="tabular-nums px-3 py-3 text-slate-300 whitespace-nowrap">
                          {formatShortDate(t.entryTime)}
                        </td>
                        <td className="hidden lg:table-cell tabular-nums px-3 py-3 text-right text-slate-300 whitespace-nowrap">
                          {formatPrice(t.entryPrice)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`rounded px-2 py-0.5 text-[10.5px] font-medium ${
                              t.exitReason === "TP"
                                ? "bg-emerald-500/10 text-emerald-300"
                                : t.exitReason === "SL"
                                  ? "bg-rose-500/10 text-rose-300"
                                  : t.exitReason === "OPEN"
                                    ? "bg-cyan-500/10 text-cyan-300"
                                    : "bg-white/[0.05] text-slate-400"
                            }`}
                          >
                            {t.exitReason}
                          </span>
                        </td>
                        <td
                          className={`tabular-nums px-3 py-3 text-right font-medium whitespace-nowrap ${
                            t.netReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {t.netReturnPct >= 0 ? "+" : ""}
                          {t.netReturnPct}%
                        </td>
                        <td
                          className={`tabular-nums px-3 py-3 text-right font-medium whitespace-nowrap ${
                            t.pnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {t.pnlUsd >= 0 ? "+" : ""}
                          {formatUsd(t.pnlUsd)}
                        </td>
                        <td className="tabular-nums px-4 py-3 text-right font-semibold text-white whitespace-nowrap">
                          {formatUsd(t.equityAfter)}
                        </td>
                      </tr>
                    ))}
                    {activeResult.trades.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                          {isBootingChart
                            ? lang === "tr"
                              ? "Piyasa verisi yükleniyor..."
                              : "Syncing live bars..."
                            : lang === "tr"
                              ? "Bu ayarlarla işlem tetiklenmedi."
                              : "No trades triggered with current setup."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {reversedTrades.length > 10 && (
                  <div className="border-t border-white/[0.06] px-4 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllTrades((s) => !s)}
                      className="text-xs font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      {showAllTrades
                        ? lang === "tr"
                          ? "Daha Az Göster"
                          : "Show Latest 10"
                        : lang === "tr"
                          ? `Tümünü Göster (${reversedTrades.length} İşlem)`
                          : `Show All ${reversedTrades.length} Trades`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: 12-Pair Market Screener Table */}
            {bottomTab === "markets" && (
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <input
                    type="text"
                    value={pairSearch}
                    onChange={(e) => setPairSearch(e.target.value)}
                    placeholder={lang === "tr" ? "Parite filtrele..." : "Filter markets..."}
                    className="w-56 rounded-lg border border-white/[0.08] bg-[#090C12] px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-lg bg-[#090C12] p-0.5 text-[11px] font-medium">
                      {(
                        [
                          { id: "all", tr: "Tümü", en: "All" },
                          { id: "active", tr: "Aktif Sinyal", en: "Active" },
                          { id: "high_wr", tr: "WR ≥55%", en: "WR ≥55%" },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setRadarFilter(f.id)}
                          className={`rounded-md px-2.5 py-1 transition cursor-pointer ${
                            radarFilter === f.id
                              ? "bg-white/[0.12] text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {lang === "tr" ? f.tr : f.en}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={onRefreshRadar}
                      disabled={isScanningRadar}
                      className="rounded-lg border border-white/[0.08] bg-[#090C12] p-1.5 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${isScanningRadar ? "animate-spin text-emerald-400" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="border-b border-white/[0.06] text-[11px] font-medium text-slate-400">
                      <tr>
                        <th className="py-2.5 pr-3">
                          {lang === "tr" ? "Parite" : "Asset"}
                        </th>
                        <th className="px-3 py-2.5 text-right">
                          {lang === "tr" ? "Fiyat" : "Price"}
                        </th>
                        <th className="px-3 py-2.5">
                          {lang === "tr" ? "En İyi Strateji" : "Top Alpha"}
                        </th>
                        <th className="px-3 py-2.5 text-right">OOS (300B)</th>
                        <th className="px-3 py-2.5 text-right">
                          {lang === "tr" ? "Fonlama" : "Funding"}
                        </th>
                        <th className="py-2.5 pl-3 text-center">
                          {lang === "tr" ? "Sinyal" : "Signal"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {displayedRadar.map((row) => {
                        const isSelected = row.symbol === symbol;
                        const locked = Boolean(row.proOnly && !isPaid);
                        const oosPos = row.outOfSampleReturnPct >= 0;
                        return (
                          <tr
                            key={row.symbol}
                            onClick={() => {
                              onSelectAsset(row.symbol, row.base, row.proOnly);
                              setBottomTab("trades");
                            }}
                            className={`cursor-pointer transition ${
                              isSelected ? "bg-emerald-500/10" : "hover:bg-white/[0.025]"
                            }`}
                          >
                            <td className="py-3 pr-3 font-semibold text-white">
                              <span className="inline-flex items-center gap-1.5">
                                {row.base}/USDT
                                {locked && <Lock className="h-3 w-3 text-slate-500" />}
                              </span>
                            </td>
                            <td className="tabular-nums px-3 py-3 text-right text-slate-200">
                              {formatPrice(row.price)}
                            </td>
                            <td className="px-3 py-3 text-slate-400">
                              {lang === "tr" ? row.bestStrategyNameTr : row.bestStrategyNameEn}
                            </td>
                            <td
                              className={`tabular-nums px-3 py-3 text-right font-medium ${
                                oosPos ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {oosPos ? "+" : ""}
                              {row.outOfSampleReturnPct}%
                            </td>
                            <td className="tabular-nums px-3 py-3 text-right text-slate-400">
                              {row.fundingRatePct >= 0 ? "+" : ""}
                              {row.fundingRatePct.toFixed(3)}%
                            </td>
                            <td className="py-3 pl-3 text-center">
                              <span
                                className={`text-[11px] font-semibold ${
                                  row.currentSignal === "LONG"
                                    ? "text-emerald-400"
                                    : row.currentSignal === "SHORT"
                                      ? "text-purple-300"
                                      : "text-slate-500"
                                }`}
                              >
                                {row.currentSignal}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: 6-Strategy League Comparison */}
            {bottomTab === "strategies" && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-white/[0.06] text-[11px] font-medium text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-3 py-2.5">
                        {lang === "tr" ? "Algoritma" : "Strategy"}
                      </th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">
                        {lang === "tr" ? "Kör OOS %30" : "Blind OOS"}
                      </th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">
                        {lang === "tr" ? "Net Getiri" : "Net Return"}
                      </th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Win %</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">PF</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">Max DD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {tournament.map((strat, index) => {
                      const isSelected = strat.strategyId === activeStrategyId;
                      return (
                        <tr
                          key={strat.strategyId}
                          onClick={() => onSelectStrategy(strat.strategyId)}
                          className={`cursor-pointer transition ${
                            isSelected ? "bg-emerald-500/10" : "hover:bg-white/[0.025]"
                          }`}
                        >
                          <td className="tabular-nums px-4 py-3 text-slate-400">
                            {index === 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                                <Award className="h-3.5 w-3.5" />1
                              </span>
                            ) : (
                              index + 1
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-medium text-white">
                              {lang === "tr" ? strat.nameTr : strat.nameEn}
                            </span>
                            <span className="block text-[11px] text-slate-500">
                              {lang === "tr" ? strat.descTr : strat.descEn}
                            </span>
                          </td>
                          <td
                            className={`tabular-nums px-3 py-3 text-right font-semibold ${
                              strat.outOfSampleReturnPct >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {strat.outOfSampleReturnPct >= 0 ? "+" : ""}
                            {strat.outOfSampleReturnPct}%
                          </td>
                          <td
                            className={`tabular-nums px-3 py-3 text-right font-medium ${
                              strat.netProfitPct >= 0 ? "text-slate-200" : "text-rose-400"
                            }`}
                          >
                            {strat.netProfitPct >= 0 ? "+" : ""}
                            {strat.netProfitPct}%
                          </td>
                          <td className="tabular-nums px-3 py-3 text-right text-slate-300">
                            {strat.winRatePct}% ({strat.totalTrades})
                          </td>
                          <td className="tabular-nums px-3 py-3 text-right text-slate-300">
                            {strat.profitFactor}
                          </td>
                          <td className="tabular-nums px-4 py-3 text-right text-slate-400">
                            -{strat.maxDrawdownPct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 4: 24/7 Cloud Sentinel */}
            {bottomTab === "sentinel" && (
              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-200">
                        {lang === "tr" ? "Bildirim Kanalı" : "Alert Delivery Channel"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                            sentinelCloudActive
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-white/[0.05] text-slate-400"
                          }`}
                        >
                          {sentinelCloudActive
                            ? lang === "tr"
                              ? "Bulut: Açık"
                              : "Cloud: On"
                            : lang === "tr"
                              ? "Bulut: Hazır"
                              : "Cloud: Ready"}
                        </span>
                        <button
                          type="button"
                          onClick={onToggleLocalSentinel}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-medium cursor-pointer ${
                            sentinelEnabled
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                              : "border-white/[0.08] bg-[#090C12] text-slate-400 hover:text-white"
                          }`}
                        >
                          <BellRing className="h-3 w-3" />
                          {sentinelEnabled
                            ? lang === "tr"
                              ? "15dk Nöbet: Açık"
                              : "15m Timer: On"
                            : lang === "tr"
                              ? "15dk Nöbet"
                              : "15m Timer"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 rounded-lg bg-[#090C12] p-0.5 text-xs font-medium">
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
                          className={`rounded-md py-1.5 transition cursor-pointer ${
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
                          placeholder="Telegram Bot Token"
                          className="rounded-lg border border-white/[0.1] bg-[#090C12] px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={telegramChatId}
                          onChange={(e) => onChangeTelegramChatId(e.target.value)}
                          placeholder="Chat / Channel ID"
                          className="rounded-lg border border-white/[0.1] bg-[#090C12] px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
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
                        className="w-full rounded-lg border border-white/[0.1] bg-[#090C12] px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                      />
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">
                        {lang === "tr"
                          ? `Bulut İzleme Listesi (${sentinelSymbols.length} Parite)`
                          : `Cloud Watchlist (${sentinelSymbols.length} Pairs)`}
                      </span>
                      {lastSentinelScan && (
                        <span className="text-[11px] text-slate-500">
                          {lastSentinelScan}
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
                            className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition cursor-pointer ${
                              activeWatch
                                ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-200"
                                : "border-white/[0.08] bg-[#090C12] text-slate-400 hover:text-white"
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
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50 cursor-pointer"
                    >
                      <Cloud className="h-3.5 w-3.5" />
                      <span>
                        {isSyncingCloud
                          ? lang === "tr"
                            ? "Kaydediliyor..."
                            : "Saving..."
                          : lang === "tr"
                            ? "7/24 Buluta Kaydet"
                            : "Save Cloud Watchlist"}
                      </span>
                    </button>

                    {sentinelTriggerUrl && (
                      <>
                        <button
                          type="button"
                          disabled={isRunningCloudScan}
                          onClick={onTriggerCloudScan}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#090C12] px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${isRunningCloudScan ? "animate-spin" : ""}`}
                          />
                          <span>{lang === "tr" ? "Şimdi Tara" : "Scan Now"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onCopyCronUrl(sentinelTriggerUrl)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.1] bg-[#090C12] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                        >
                          {copiedCronUrl ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>Cron URL</span>
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isSendingAlert}
                    onClick={onDispatchAlert}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-3 w-3" />
                    <span>
                      {isSendingAlert
                        ? lang === "tr"
                          ? "Gönderiliyor..."
                          : "Sending..."
                        : lang === "tr"
                          ? "Sinyal Gönder"
                          : "Send Signal"}
                    </span>
                  </button>
                </div>

                {alertStatus && (
                  <p
                    className={`rounded-lg border px-3 py-2 text-xs ${
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

            {/* Tab 5: Audit & Methodology */}
            {bottomTab === "audit" && (
              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div className="rounded-lg bg-[#090C12] p-3">
                    <span className="font-semibold text-emerald-400">70/30 Walk-Forward</span>
                    <p className="mt-1 text-slate-400">
                      {lang === "tr"
                        ? "İlk %70 eğitimde seçim, son %30 görünmemiş mumlarda kör test."
                        : "70% In-Sample selection verified blindly on final 30% OOS bars."}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#090C12] p-3">
                    <span className="font-semibold text-slate-200">Gerçekçi Maliyet</span>
                    <p className="mt-1 text-slate-400">
                      {lang === "tr"
                        ? "%0.06 komisyon, %0.04 kayma ve 8 saatlik fonlama kesintisi."
                        : "0.06% taker fee, 0.04% slippage, and 8h funding drag deducted."}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#090C12] p-3">
                    <span className="font-semibold text-slate-200">Long & Short Motor</span>
                    <p className="mt-1 text-slate-400">
                      {lang === "tr"
                        ? "Çift yönlü mum içi SL/TP & kaldıraçlı likidasyon hesabı."
                        : "Bi-directional intrabar SL/TP with leverage liquidation pricing."}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#090C12] p-3">
                    <span className="font-semibold text-slate-200">AES-256 Bulut</span>
                    <p className="mt-1 text-slate-400">
                      {lang === "tr"
                        ? "Şifreli Telegram tokenları ve kişisel imzalı 7/24 cron tetikleme."
                        : "Encrypted Telegram secrets & HMAC-signed 24/7 Sentinel cron."}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.06] bg-[#090C12]">
                  {faqs.map((item) => (
                    <details key={item.q} className="group">
                      <summary className="flex items-center justify-between px-4 py-2.5 text-xs font-medium text-slate-200 hover:text-white">
                        <span>{item.q}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500 transition group-open:rotate-180" />
                      </summary>
                      <p className="px-4 pb-3 text-xs leading-relaxed text-slate-400">
                        {item.a}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT CALM PANEL (ONE Focused Card — Progressive Disclosure via [Order | Tune]) */}
        <aside className="calm-surface p-4 space-y-4">
          {/* Clean Segmented Mode Switch */}
          <div className="grid grid-cols-2 rounded-lg bg-[#090C12] p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setRightTab("order")}
              className={`rounded-md py-1.5 transition cursor-pointer ${
                rightTab === "order"
                  ? "bg-white/[0.1] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {lang === "tr" ? "Emir Planı" : "Order Plan"}
            </button>
            <button
              type="button"
              onClick={() => setRightTab("tune")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 transition cursor-pointer ${
                rightTab === "tune"
                  ? "bg-white/[0.1] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>{lang === "tr" ? "Ayarlar" : "Tune Risk"}</span>
            </button>
          </div>

          {rightTab === "order" ? (
            <div className="space-y-4">
              {/* Strategy Selector Dropdown (Eliminates 6 noisy colored tiles!) */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                  {lang === "tr" ? "Aktif Strateji" : "Active Strategy"}
                </label>
                <select
                  value={activeStrategyId}
                  onChange={(e) => onSelectStrategy(e.target.value as StrategyId)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#090C12] px-3 py-2 text-xs font-medium text-white focus:border-emerald-400 focus:outline-none"
                >
                  {tournament.map((strat) => {
                    const oosSign = strat.outOfSampleReturnPct >= 0 ? "+" : "";
                    return (
                      <option key={strat.strategyId} value={strat.strategyId}>
                        {lang === "tr" ? strat.nameTr : strat.nameEn} (OOS{" "}
                        {oosSign}
                        {strat.outOfSampleReturnPct}%)
                      </option>
                    );
                  })}
                </select>
              </div>

              {isBootingChart ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-7 animate-pulse rounded bg-white/[0.05]" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Clean Visual R:R Bar */}
                  <div className="rounded-xl bg-[#090C12] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          ticketSide === "SHORT"
                            ? "bg-purple-500/15 text-purple-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {ticketSide} &middot; {leverage}x
                      </span>
                      <span className="tabular-nums text-xs font-semibold text-slate-200">
                        1 : {rrRatio.toFixed(2)} R:R
                      </span>
                    </div>

                    <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full bg-rose-500/65"
                        style={{ width: `${Math.max(12, Math.min(75, slSharePct))}%` }}
                      />
                      <div className="h-full flex-1 bg-emerald-500/70" />
                    </div>

                    <div className="flex items-center justify-between tabular-nums text-[11px]">
                      <div>
                        <span className="block text-slate-500">SL (-{stopLossPct}%)</span>
                        <span className="font-semibold text-rose-400">
                          {formatPrice(activeResult.suggestedStopPrice)}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="block text-slate-500">
                          {lang === "tr" ? "Giriş" : "Entry"}
                        </span>
                        <span className="font-semibold text-white">
                          {formatPrice(ticketEntry)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-slate-500">TP (+{takeProfitPct}%)</span>
                        <span className="font-semibold text-emerald-400">
                          {formatPrice(activeResult.suggestedTargetPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Strictly 4 Key Metrics (Miller's Law — Calm Contrast) */}
                  <div className="divide-y divide-white/[0.05] text-xs">
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Pozisyon Büyüklüğü" : "Position Size"}
                      </span>
                      <span className="tabular-nums font-medium text-white">
                        {ticketUnits.toFixed(4)} &middot; {formatUsd(ticketNotional)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Risk / Beklenen Kâr" : "Risk / Reward"}
                      </span>
                      <span className="tabular-nums font-medium">
                        <span className="text-rose-400">-{formatUsd(ticketRiskUsd)}</span>
                        <span className="mx-1.5 text-slate-600">/</span>
                        <span className="text-emerald-400">+{formatUsd(ticketRewardUsd)}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Tahmini Likidasyon" : "Est. Liquidation"}
                      </span>
                      <span className="tabular-nums font-medium text-slate-200">
                        {activeResult.estimatedLiquidationPrice > 0
                          ? formatPrice(activeResult.estimatedLiquidationPrice)
                          : lang === "tr"
                            ? "Yok (Spot)"
                            : "None (Spot)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Half-Kelly · Maliyet" : "Half-Kelly · Costs"}
                      </span>
                      <span className="tabular-nums text-slate-300">
                        {activeResult.kellyFractionPct}% &middot; -
                        {formatUsd(activeResult.totalCostsUsd)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Primary & Secondary CTAs */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={isBootingChart}
                  onClick={() => onCopyTicket(buildCopyText())}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
                >
                  {copiedTicket ? (
                    <>
                      <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{lang === "tr" ? "Emir Planı Kopyalandı" : "Setup Copied"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>{lang === "tr" ? "Emir Planını Kopyala" : "Copy Order Setup"}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isBootingChart || isSendingAlert}
                  onClick={onDispatchAlert}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-[#090C12] py-2 text-xs font-medium text-slate-200 transition hover:border-white/[0.2] hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    {lang === "tr" ? "Telegram / Discord'a Gönder" : "Send to Webhook"}
                  </span>
                </button>
              </div>

              {/* Quiet Telemetry Footer */}
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px] text-slate-500">
                <span className="tabular-nums">
                  F: {derivativesPulse.fundingRatePct >= 0 ? "+" : ""}
                  {derivativesPulse.fundingRatePct.toFixed(4)}% &middot; OI{" "}
                  {formatCompactUsd(derivativesPulse.openInterestUsd)}
                  {activeMtf ? ` · ${timeframe.toUpperCase()} ${activeMtf.currentSignal}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setBottomTab("sentinel")}
                  className="font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  {lang === "tr" ? "7/24 Bot" : "24/7 Bot"} &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* Tab 2: Tune Risk & Indicator Parameters (Cleanly Isolated) */
            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1.5">
                  <span>{lang === "tr" ? "Kasa Büyüklüğü" : "Account Capital"}</span>
                  <span className="tabular-nums font-semibold text-white">
                    {formatUsd(capital)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  aria-label="Account capital"
                  className="quant-range w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1.5">
                  <span>{lang === "tr" ? "Kaldıraç" : "Leverage"}</span>
                  <span className="tabular-nums font-semibold text-white">{leverage}x</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  aria-label="Leverage multiplier"
                  className="quant-range w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1.5">
                    <span>Stop-Loss</span>
                    <span className="tabular-nums font-semibold text-rose-400">
                      {stopLossPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(Number(e.target.value))}
                    aria-label="Stop loss percent"
                    className="quant-range w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1.5">
                    <span>Take-Profit</span>
                    <span className="tabular-nums font-semibold text-emerald-400">
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
                    className="quant-range w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-3">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1.5">
                    <span>Fast Period</span>
                    <span className="tabular-nums font-semibold text-white">{fastPeriod}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={1}
                    value={fastPeriod}
                    onChange={(e) => setFastPeriod(Number(e.target.value))}
                    aria-label="Fast indicator period"
                    className="quant-range w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-1.5">
                    <span>Slow Period</span>
                    <span className="tabular-nums font-semibold text-white">{slowPeriod}</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={50}
                    step={1}
                    value={slowPeriod}
                    onChange={(e) => setSlowPeriod(Number(e.target.value))}
                    aria-label="Slow indicator period"
                    className="quant-range w-full"
                  />
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {lang === "tr"
                    ? `Vadeli Skor: ${derivativesPulse.squeezeScore}/100`
                    : `Squeeze Score: ${derivativesPulse.squeezeScore}/100`}
                </span>
                {!isPaid && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenUpgrade(
                        lang === "tr"
                          ? "Tüm 12 parite, 15m/1D dilimler, limitsiz OOS ve bulut cronu aç."
                          : "Unlock all 12 pairs, 15m/1D timeframes & unlimited OOS sweeps."
                      )
                    }
                    className="font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    Pro ($12 / $29) &rarr;
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
