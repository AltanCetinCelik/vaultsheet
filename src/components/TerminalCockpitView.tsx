"use client";

import React, { useState } from "react";
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
  // Sentinel & Cloud Props
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
  { id: "both", labelTr: "ÇİFT YÖN", labelEn: "LONG+SHORT" },
  { id: "long", labelTr: "SADECE LONG", labelEn: "LONG ONLY" },
  { id: "short", labelTr: "SADECE SHORT", labelEn: "SHORT ONLY" },
];

const SHORT_STRATEGY_LABELS: Record<StrategyId, { tr: string; en: string }> = {
  donchian_breakout: { tr: "Donchian Kırılım", en: "Donchian" },
  ema_cross: { tr: "EMA Trend", en: "EMA Trend" },
  rsi_reversion: { tr: "RSI Dönüş", en: "RSI Reversion" },
  bollinger_bounce: { tr: "Bollinger Bant", en: "Bollinger" },
  macd_momentum: { tr: "MACD İvme", en: "MACD Momentum" },
  volume_breakout: { tr: "Hacim Kırılımı", en: "Vol Breakout" },
};

function formatSourceShort(src: MarketDataSource, bars: number): string {
  const tag =
    src === "binance_vision"
      ? "BINANCE VISION"
      : src === "binance_spot"
        ? "BINANCE SPOT"
        : src === "bybit_linear"
          ? "BYBIT PERP"
          : "SYNCING";
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

  return (
    <section
      id="workbench"
      className="flex flex-col border-b border-white/[0.07] bg-[#080B10] text-slate-100"
    >
      {/* Top Instrument & Command Strip */}
      <div className="border-b border-white/[0.07] bg-[#0B0F17] px-3 py-2 sm:px-4">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
          {/* Active Symbol + Price + Derivatives Inline Matrix */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* Ticker Identity */}
            <div className="flex items-center gap-2.5 pr-2 sm:border-r sm:border-white/[0.08]">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-white">
                    {activeAssetMeta?.label ?? symbol.replace("USDT", "")}/USDT
                  </span>
                  <span className="mono-nums rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                    PERP
                  </span>
                  {isLoadingFeed ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-300">
                      <RefreshCw className="h-2.5 w-2.5 animate-spin" /> SYNC
                    </span>
                  ) : (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 mono-nums">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {formatSourceShort(feedSource, candles.length)}
                    </span>
                  )}
                </div>
                <span className="text-[10.5px] text-slate-400">
                  {lang === "tr" ? activeResult.nameTr : activeResult.nameEn}
                </span>
              </div>

              <div className="pl-1">
                {isBootingChart ? (
                  <div className="h-6 w-24 animate-pulse rounded bg-white/[0.06]" />
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className="mono-nums text-base font-bold text-white">
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
            </div>

            {/* Derivatives Telemetry Strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
              <div className="flex flex-col">
                <span className="text-[9.5px] uppercase tracking-wider text-slate-500">
                  {lang === "tr" ? "Fonlama (8s)" : "Funding (8h)"}
                </span>
                {isBootingChart ? (
                  <span className="mt-0.5 h-3.5 w-12 animate-pulse rounded bg-white/[0.06]" />
                ) : (
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
                )}
              </div>

              <div className="flex flex-col">
                <span className="text-[9.5px] uppercase tracking-wider text-slate-500">
                  {lang === "tr" ? "Açık Poz. (OI)" : "Open Interest"}
                </span>
                {isBootingChart ? (
                  <span className="mt-0.5 h-3.5 w-14 animate-pulse rounded bg-white/[0.06]" />
                ) : (
                  <span className="mono-nums font-semibold text-slate-200">
                    {formatCompactUsd(derivativesPulse.openInterestUsd)}
                  </span>
                )}
              </div>

              <div className="hidden sm:flex flex-col">
                <span className="text-[9.5px] uppercase tracking-wider text-slate-500">
                  {lang === "tr" ? "Balina L / S" : "Whale L / S"}
                </span>
                {isBootingChart ? (
                  <span className="mt-0.5 h-3.5 w-16 animate-pulse rounded bg-white/[0.06]" />
                ) : (
                  <span className="mono-nums font-semibold text-slate-200">
                    <span className="text-emerald-400">{derivativesPulse.whaleLongPct}%</span>
                    <span className="text-slate-500"> / </span>
                    <span className="text-rose-400">{derivativesPulse.whaleShortPct}%</span>
                  </span>
                )}
              </div>

              {/* Squeeze Pill */}
              {!isBootingChart && (
                <div
                  className={`hidden md:inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                    derivativesPulse.squeezeState === "SHORT_SQUEEZE"
                      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                      : derivativesPulse.squeezeState === "LONG_SQUEEZE"
                        ? "border-rose-500/35 bg-rose-500/10 text-rose-300"
                        : derivativesPulse.squeezeState === "WHALE_ACCUMULATION"
                          ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-300"
                          : "border-white/[0.08] bg-white/[0.03] text-slate-300"
                  }`}
                >
                  <Zap className="h-3 w-3 shrink-0" />
                  <span>
                    {lang === "tr"
                      ? derivativesPulse.squeezeLabelTr
                      : derivativesPulse.squeezeLabelEn}
                  </span>
                </div>
              )}

              {/* MTF Confluence Strip */}
              <div className="hidden 2xl:flex items-center gap-1 border-l border-white/[0.08] pl-3">
                {mtfEntries.map((m) => (
                  <button
                    key={m.timeframe}
                    type="button"
                    onClick={() => {
                      const tfObj = TIMEFRAMES.find((t) => t.id === m.timeframe);
                      if (tfObj) onSelectTimeframe(tfObj);
                    }}
                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold mono-nums whitespace-nowrap transition cursor-pointer ${
                      m.currentSignal === "LONG"
                        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                        : m.currentSignal === "SHORT"
                          ? "border-rose-500/35 bg-rose-500/10 text-rose-300"
                          : "border-white/[0.08] bg-white/[0.03] text-slate-400"
                    }`}
                  >
                    <span>{m.timeframe.toUpperCase()}</span>
                    <span>
                      {m.currentSignal === "LONG" ? "▲" : m.currentSignal === "SHORT" ? "▼" : "•"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Execution Mode + TF + OOS Auto-Optimize */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex rounded border border-white/[0.08] bg-[#080B10] p-0.5 text-[10px] font-semibold">
              {DIRECTIONS.map((d) => {
                const active = directionMode === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDirectionMode(d.id)}
                    className={`rounded-xs px-2 py-1 whitespace-nowrap transition cursor-pointer ${
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

            <div className="inline-flex rounded border border-white/[0.08] bg-[#080B10] p-0.5 text-[10px] font-semibold mono-nums">
              {TIMEFRAMES.map((tf) => {
                const active = timeframe === tf.id;
                const locked = Boolean(tf.proOnly && !isPaid);
                return (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => onSelectTimeframe(tf)}
                    className={`inline-flex items-center gap-1 rounded-xs px-2 py-1 whitespace-nowrap transition cursor-pointer ${
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
              className="inline-flex items-center gap-1.5 rounded bg-emerald-400 px-3 py-1.5 text-[11px] font-bold text-slate-950 whitespace-nowrap transition hover:bg-emerald-300 disabled:opacity-45 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>
                {lang === "tr"
                  ? "OOS Optimize (36 Test)"
                  : "Auto-Optimize (36 Setups)"}
              </span>
              {!isPaid && (
                <span className="rounded bg-slate-950/15 px-1 py-0.5 text-[9px] font-extrabold">
                  {consumedFreeOpt ? "PRO" : lang === "tr" ? "1 Ücretsiz" : "1 Free"}
                </span>
              )}
            </button>
          </div>
        </div>

        {optMessage && (
          <div className="mt-2 flex items-center justify-between rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-200">
            <span>{optMessage}</span>
          </div>
        )}
      </div>

      {/* Mobile Pane Switcher (<1024px) */}
      <div className="grid grid-cols-3 border-b border-white/[0.07] bg-[#090C12] text-[11px] font-semibold lg:hidden">
        {(
          [
            { id: "chart", tr: "Grafik & Analiz", en: "Chart & Tabs" },
            { id: "markets", tr: "Piyasalar (12)", en: "Markets (12)" },
            { id: "trade", tr: "Emir & Ayarlar", en: "Ticket & Params" },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMobilePane(m.id)}
            className={`py-2 text-center border-b-2 transition cursor-pointer ${
              mobilePane === m.id
                ? "border-emerald-400 text-white bg-white/[0.03]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {lang === "tr" ? m.tr : m.en}
          </button>
        ))}
      </div>

      {/* Main 3-Pane Institutional Docking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)_316px] lg:divide-x divide-white/[0.07]">
        {/* LEFT RAIL: 12-Pair Live Screener */}
        <aside
          className={`${
            mobilePane === "markets" ? "flex" : "hidden lg:flex"
          } flex-col bg-[#090D14]`}
        >
          <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                {lang === "tr" ? "Piyasa Tarayıcısı (12)" : "Market Screener (12)"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onRefreshRadar}
              disabled={isScanningRadar}
              title={lang === "tr" ? "Radarı Yenile" : "Refresh Radar"}
              className="rounded border border-white/[0.08] bg-[#0D1118] p-1 text-slate-300 hover:text-white cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3 w-3 ${isScanningRadar ? "animate-spin text-emerald-400" : ""}`}
              />
            </button>
          </div>

          {/* Search + Filter Strip */}
          <div className="space-y-1.5 border-b border-white/[0.06] px-2.5 py-2">
            <input
              type="text"
              value={pairSearch}
              onChange={(e) => setPairSearch(e.target.value)}
              placeholder={lang === "tr" ? "Parite ara (BTC, SOL, PAXG)..." : "Filter pairs (BTC, SOL...)"}
              className="w-full rounded border border-white/[0.08] bg-[#080B10] px-2.5 py-1 text-[11px] text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
            />
            <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold">
              {(
                [
                  { id: "all", tr: "Tümü (12)", en: "All (12)" },
                  { id: "active", tr: "Sinyal", en: "Signals" },
                  { id: "high_wr", tr: "WR ≥55%", en: "WR ≥55%" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRadarFilter(f.id)}
                  className={`rounded-xs py-1 transition cursor-pointer ${
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

          {/* Column Labels */}
          <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-1 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">
            <span>{lang === "tr" ? "Parite / Strateji" : "Pair / Alpha"}</span>
            <span>{lang === "tr" ? "Fiyat · Kör OOS" : "Price · OOS %"}</span>
          </div>

          {/* Pair Rows */}
          <div className="max-h-[680px] flex-1 divide-y divide-white/[0.05] overflow-y-auto terminal-scroll">
            {isBootingRadar
              ? QUANT_ASSETS.map((asset) => (
                  <div
                    key={asset.symbol}
                    className="flex items-center justify-between px-3 py-2.5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200">{asset.label}</span>
                        {asset.proOnly && !isPaid && (
                          <Lock className="h-2.5 w-2.5 text-slate-500" />
                        )}
                      </div>
                      <div className="h-2.5 w-20 animate-pulse rounded bg-white/[0.06]" />
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <div className="h-3.5 w-16 animate-pulse rounded bg-white/[0.06]" />
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
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-bold text-white">{row.base}</span>
                          {locked && <Lock className="h-2.5 w-2.5 shrink-0 text-slate-500" />}
                          <span
                            className={`rounded-xs px-1 py-0.5 text-[9px] font-bold ${
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

                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                        <span className="truncate text-slate-400">
                          {lang === "tr" ? row.bestStrategyNameTr : row.bestStrategyNameEn}
                        </span>
                        <div className="mono-nums flex items-center gap-2 shrink-0">
                          <span
                            className={`font-semibold ${
                              oosPos ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {oosPos ? "+" : ""}
                            {row.outOfSampleReturnPct}%
                          </span>
                          <span
                            className={
                              row.fundingRatePct < 0
                                ? "text-cyan-400"
                                : row.fundingRatePct > 0.015
                                  ? "text-amber-400"
                                  : "text-slate-500"
                            }
                          >
                            {row.fundingRatePct >= 0 ? "+" : ""}
                            {row.fundingRatePct.toFixed(3)}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

            {!isBootingRadar && displayedRadar.length === 0 && (
              <div className="px-4 py-8 text-center text-[11px] text-slate-500">
                {lang === "tr"
                  ? "Bu filtreyle eşleşen parite bulunamadı."
                  : "No pairs matched the active filter."}
              </div>
            )}
          </div>
        </aside>

        {/* CENTER STAGE: KPI Hairline Bar + Chart Canvas + Bottom Analytical Tabs */}
        <div
          className={`${
            mobilePane === "chart" ? "flex" : "hidden lg:flex"
          } flex-col min-w-0 bg-[#080B10]`}
        >
          {/* Compact 4-Metric Hairline KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/[0.06] border-b border-white/[0.07] bg-[#0B0F17]">
            <div className="px-3 py-2">
              <div className="flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <span>{lang === "tr" ? "Kör OOS (%30)" : "Blind OOS (30%)"}</span>
                {!isBootingChart && (
                  <span
                    className={`rounded-xs px-1 py-0.2 text-[9px] font-bold ${
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
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span
                    className={`mono-nums text-base font-bold ${
                      activeResult.outOfSampleReturnPct >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {activeResult.outOfSampleReturnPct >= 0 ? "+" : ""}
                    {activeResult.outOfSampleReturnPct}%
                  </span>
                  <span className="mono-nums text-[10px] text-slate-500">
                    IS: {activeResult.inSampleReturnPct >= 0 ? "+" : ""}
                    {activeResult.inSampleReturnPct}%
                  </span>
                </div>
              )}
            </div>

            <div className="px-3 py-2">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {lang === "tr" ? "Net Getiri & Alfa" : "Net Return & Alpha"}
              </span>
              {isBootingChart ? (
                <div className="mt-1.5 h-5 w-24 animate-pulse rounded bg-white/[0.06]" />
              ) : (
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span
                    className={`mono-nums text-base font-bold ${
                      activeResult.netProfitPct >= 0 ? "text-white" : "text-rose-400"
                    }`}
                  >
                    {activeResult.netProfitPct >= 0 ? "+" : ""}
                    {activeResult.netProfitPct}%
                  </span>
                  <span className="mono-nums text-[10px] text-slate-400">
                    {lang === "tr" ? "Alfa" : "Alpha"}:{" "}
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

            <div className="px-3 py-2">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {lang === "tr" ? "Kazanma & Beklenti" : "Win Rate & Expectancy"}
              </span>
              {isBootingChart ? (
                <div className="mt-1.5 h-5 w-20 animate-pulse rounded bg-white/[0.06]" />
              ) : (
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="mono-nums text-base font-bold text-white">
                    {activeResult.winRatePct}%
                  </span>
                  <span className="mono-nums text-[10px] text-slate-400">
                    ({activeResult.totalTrades} ·{" "}
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
                    )
                  </span>
                </div>
              )}
            </div>

            <div className="px-3 py-2">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {lang === "tr" ? "PF · Sharpe · Max DD" : "PF · Sharpe · Max DD"}
              </span>
              {isBootingChart ? (
                <div className="mt-1.5 h-5 w-24 animate-pulse rounded bg-white/[0.06]" />
              ) : (
                <div className="mt-0.5 flex items-baseline gap-2 mono-nums">
                  <span className="text-base font-bold text-white">
                    {activeResult.profitFactor}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    SR {activeResult.sharpeRatio} ·{" "}
                    <strong className="text-rose-400">-{activeResult.maxDrawdownPct}%</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive TradingView Multi-Pane Canvas */}
          <QuantCandlestickChart
            symbol={symbol}
            timeframe={timeframe}
            candles={candles}
            result={activeResult}
            lang={lang}
            isLoading={isLoadingFeed && candles.length === 0}
          />

          {/* Bottom Tabbed Analytical Workspace */}
          <div className="flex flex-col border-t border-white/[0.07] bg-[#0B0E14]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3">
              <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-semibold">
                {(
                  [
                    {
                      id: "trades",
                      tr: `İşlem Geçmişi (${activeResult.trades.length})`,
                      en: `Executed Trades (${activeResult.trades.length})`,
                    },
                    {
                      id: "tournament",
                      tr: "6-Strateji Ligi",
                      en: "6-Strategy League",
                    },
                    {
                      id: "sentinel",
                      tr: "7/24 Bulut Sentinel & Webhook",
                      en: "24/7 Cloud Sentinel",
                    },
                    {
                      id: "audit",
                      tr: "Motor Denetimi & SSS",
                      en: "Engine Audit & FAQ",
                    },
                  ] as const
                ).map((tab) => {
                  const active = bottomTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBottomTab(tab.id)}
                      className={`border-b-2 px-3 py-2.5 whitespace-nowrap transition cursor-pointer ${
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
                <button
                  type="button"
                  onClick={onExportTradesCsv}
                  className="inline-flex items-center gap-1.5 rounded border border-white/[0.1] bg-[#121822] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-white/[0.2] hover:text-white cursor-pointer"
                >
                  <Download className="h-3 w-3 text-emerald-400" />
                  <span>{lang === "tr" ? "CSV İndir" : "Export CSV"}</span>
                  {!isPaid && <Lock className="h-2.5 w-2.5 opacity-60" />}
                </button>
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

            {/* Tab 1: Executed Trades Table */}
            {bottomTab === "trades" && (
              <div className="h-[300px] overflow-auto terminal-scroll">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0D1118] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">{lang === "tr" ? "Yön" : "Side"}</th>
                      <th className="px-3 py-2">{lang === "tr" ? "Giriş" : "Entry Time"}</th>
                      <th className="px-3 py-2 text-right">
                        {lang === "tr" ? "Giriş Fiyatı" : "Entry Price"}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {lang === "tr" ? "Çıkış Fiyatı" : "Exit Price"}
                      </th>
                      <th className="px-3 py-2 text-center">
                        {lang === "tr" ? "Çıkış" : "Exit"}
                      </th>
                      <th className="px-3 py-2 text-right">Net %</th>
                      <th className="px-3 py-2 text-right">PnL ($)</th>
                      <th className="px-3 py-2 text-right">
                        {lang === "tr" ? "Kasa" : "Equity"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {[...activeResult.trades].reverse().slice(0, 40).map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.025]">
                        <td className="mono-nums px-3 py-2 text-slate-500">#{t.id}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block rounded-xs px-1.5 py-0.5 text-[9.5px] font-bold ${
                              t.side === "SHORT"
                                ? "bg-purple-500/20 text-purple-300"
                                : "bg-emerald-500/15 text-emerald-300"
                            }`}
                          >
                            {t.side}
                          </span>
                        </td>
                        <td className="mono-nums px-3 py-2 text-slate-300 whitespace-nowrap">
                          {formatShortDate(t.entryTime)} UTC
                        </td>
                        <td className="mono-nums px-3 py-2 text-right text-slate-100">
                          {formatPrice(t.entryPrice)}
                        </td>
                        <td className="mono-nums px-3 py-2 text-right text-slate-300">
                          {formatPrice(t.exitPrice)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-block rounded-xs px-1.5 py-0.5 text-[9.5px] font-bold ${
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
                          className={`mono-nums px-3 py-2 text-right font-semibold ${
                            t.netReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {t.netReturnPct >= 0 ? "+" : ""}
                          {t.netReturnPct}%
                        </td>
                        <td
                          className={`mono-nums px-3 py-2 text-right font-semibold ${
                            t.pnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {t.pnlUsd >= 0 ? "+" : ""}
                          {formatUsd(t.pnlUsd)}
                        </td>
                        <td className="mono-nums px-3 py-2 text-right font-semibold text-white">
                          {formatUsd(t.equityAfter)}
                        </td>
                      </tr>
                    ))}
                    {activeResult.trades.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                          {isBootingChart
                            ? lang === "tr"
                              ? "Canlı 1.000 mum senkronize ediliyor..."
                              : "Syncing live 1,000-bar dataset..."
                            : lang === "tr"
                              ? "Bu ayarlarla gerçekleşen işlem yok. SL/TP veya periyodu ayarlayın."
                              : "No trades triggered with current parameters. Adjust SL/TP or periods."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 2: 6-Strategy League */}
            {bottomTab === "tournament" && (
              <div className="h-[300px] overflow-auto terminal-scroll">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0D1118] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">
                        {lang === "tr" ? "Algoritma (Seçmek için Tıkla)" : "Algorithm (Click to Load)"}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {lang === "tr" ? "Kör OOS %30" : "Blind OOS 30%"}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {lang === "tr" ? "Toplam Net %" : "Net Return %"}
                      </th>
                      <th className="px-3 py-2 text-right">Win %</th>
                      <th className="px-3 py-2 text-right">PF</th>
                      <th className="px-3 py-2 text-right">Max DD</th>
                      <th className="px-3 py-2 text-center">
                        {lang === "tr" ? "Sinyal" : "Signal"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
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
                          <td className="mono-nums px-3 py-2.5 text-slate-400">
                            {index === 0 ? (
                              <Award className="h-3.5 w-3.5 text-amber-400" />
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
                            className={`mono-nums px-3 py-2.5 text-right font-bold ${
                              strat.outOfSampleReturnPct >= 0
                                ? "text-cyan-300"
                                : "text-rose-400"
                            }`}
                          >
                            {strat.outOfSampleReturnPct >= 0 ? "+" : ""}
                            {strat.outOfSampleReturnPct}%
                          </td>
                          <td
                            className={`mono-nums px-3 py-2.5 text-right font-bold ${
                              strat.netProfitPct >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {strat.netProfitPct >= 0 ? "+" : ""}
                            {strat.netProfitPct}%
                          </td>
                          <td className="mono-nums px-3 py-2.5 text-right text-slate-200">
                            {strat.winRatePct}% ({strat.totalTrades})
                          </td>
                          <td className="mono-nums px-3 py-2.5 text-right text-slate-200">
                            {strat.profitFactor}
                          </td>
                          <td className="mono-nums px-3 py-2.5 text-right text-rose-400">
                            -{strat.maxDrawdownPct}%
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-block rounded-xs px-1.5 py-0.5 text-[9.5px] font-bold ${
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

            {/* Tab 3: 24/7 Cloud Sentinel & Webhooks */}
            {bottomTab === "sentinel" && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Left Col: Channel & Keys */}
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
                            : "border-white/[0.1] bg-[#121822] text-slate-400 hover:text-white"
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

                    <div className="grid grid-cols-3 rounded border border-white/[0.08] bg-[#080B10] p-0.5 text-[11px] font-semibold">
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
                          className={`rounded-xs py-1 transition cursor-pointer ${
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
                          className="mono-nums rounded border border-white/[0.1] bg-[#080B10] px-2.5 py-2 text-[11px] text-white focus:border-emerald-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={telegramChatId}
                          onChange={(e) => onChangeTelegramChatId(e.target.value)}
                          placeholder="Chat / Channel ID"
                          className="mono-nums rounded border border-white/[0.1] bg-[#080B10] px-2.5 py-2 text-[11px] text-white focus:border-emerald-400 focus:outline-none"
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
                        className="mono-nums w-full rounded border border-white/[0.1] bg-[#080B10] px-2.5 py-2 text-[11px] text-white focus:border-emerald-400 focus:outline-none"
                      />
                    )}
                  </div>

                  {/* Right Col: Cloud Watchlist Selector */}
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
                            className={`rounded border px-1.5 py-1 text-[10px] font-semibold transition cursor-pointer ${
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

                {/* Unified Action Bar (No awkward wide gap!) */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isSyncingCloud}
                      onClick={() => onSaveCloudSentinel(true)}
                      className="inline-flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50 cursor-pointer"
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
                          className="inline-flex items-center gap-1.5 rounded border border-white/[0.1] bg-[#121822] px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:text-white disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${isRunningCloudScan ? "animate-spin" : ""}`}
                          />
                          <span>{lang === "tr" ? "Bulutu Şimdi Tara" : "Scan Cloud Now"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onCopyCronUrl(sentinelTriggerUrl)}
                          className="inline-flex items-center gap-1 rounded border border-white/[0.1] bg-[#080B10] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
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
                    className="inline-flex items-center gap-1.5 rounded bg-white px-3.5 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
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
                    className={`rounded border px-3 py-2 text-[11px] ${
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

            {/* Tab 4: Institutional Audit & Collapsible FAQ */}
            {bottomTab === "audit" && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[11px]">
                  <div className="rounded border border-white/[0.07] bg-[#080B10] p-2.5">
                    <span className="mono-nums font-bold text-emerald-400">01 · WALK-FORWARD</span>
                    <p className="mt-1 text-slate-400">
                      {lang === "tr"
                        ? "İlk %70 eğitimde seçim, son %30 görünmemiş mumlarda sıfır-sızıntılı kör test."
                        : "70% In-Sample parameter selection verified blindly on final 30% OOS candles."}
                    </p>
                  </div>
                  <div className="rounded border border-white/[0.07] bg-[#080B10] p-2.5">
                    <span className="mono-nums font-bold text-cyan-400">02 · REALISTIC COST</span>
                    <p className="mt-1 text-slate-400">
                      {lang === "tr"
                        ? "Her işlemde %0.06/taraf taker komisyon, %0.04/taraf kayma ve 8 saatlik fonlama kesilir."
                        : "0.06% taker fee/side, 0.04% slippage/side, and 8h perpetual funding drag deducted."}
                    </p>
                  </div>
                  <div className="rounded border border-white/[0.07] bg-[#080B10] p-2.5">
                    <span className="mono-nums font-bold text-purple-400">03 · BI-DIRECTIONAL</span>
                    <p className="mt-1 text-slate-400">
                      {lang === "tr"
                        ? "Hem Long hem Short mum içi (intrabar) SL/TP & tahmini likidasyon fiyatlaması."
                        : "Long & Short intrabar high/low SL/TP execution with leverage liquidation price."}
                    </p>
                  </div>
                  <div className="rounded border border-white/[0.07] bg-[#080B10] p-2.5">
                    <span className="mono-nums font-bold text-amber-400">04 · CLOUD CRON</span>
                    <p className="mt-1 text-slate-400">
                      {lang === "tr"
                        ? "Telegram tokenları AES-256-GCM şifrelenir; imzalı cron bağlantısı 7/24 sinyal atar."
                        : "Telegram secrets use AES-256-GCM server encryption + signed HMAC 24/7 cron."}
                    </p>
                  </div>
                </div>

                {/* Compact Accordion FAQ */}
                <div className="divide-y divide-white/[0.06] rounded border border-white/[0.07] bg-[#080B10]">
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

        {/* RIGHT DOCK: Actionable Execution Ticket & Parameter Controls */}
        <aside
          className={`${
            mobilePane === "trade" ? "flex" : "hidden lg:flex"
          } flex-col divide-y divide-white/[0.07] bg-[#090D14]`}
        >
          {/* Execution Ticket */}
          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-200">
                <Target className="h-3.5 w-3.5 text-emerald-400" />
                {lang === "tr" ? "Emir & Kasa Planı" : "Execution Ticket"}
              </span>
              <span
                className={`mono-nums rounded-xs px-1.5 py-0.5 text-[10px] font-bold ${
                  ticketSide === "SHORT"
                    ? "bg-purple-500/20 text-purple-300"
                    : "bg-emerald-500/15 text-emerald-300"
                }`}
              >
                {ticketSide} &middot; {leverage}x
              </span>
            </div>

            {isBootingChart ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-6 animate-pulse rounded bg-white/[0.05]" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05] rounded border border-white/[0.07] bg-[#080B10] text-[11px]">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-slate-400">{lang === "tr" ? "Giriş" : "Entry"}</span>
                  <span className="mono-nums font-bold text-white">{formatPrice(ticketEntry)}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-slate-400">
                    {lang === "tr" ? "Pozisyon" : "Notional"}
                  </span>
                  <span className="mono-nums font-medium text-slate-200">
                    {ticketUnits.toFixed(4)} ({formatUsd(ticketNotional)})
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-slate-400">SL (-{stopLossPct}%)</span>
                  <span className="mono-nums font-bold text-rose-400">
                    {formatPrice(activeResult.suggestedStopPrice)} &middot; -
                    {formatUsd(ticketRiskUsd)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-slate-400">TP (+{takeProfitPct}%)</span>
                  <span className="mono-nums font-bold text-emerald-400">
                    {formatPrice(activeResult.suggestedTargetPrice)} &middot; +
                    {formatUsd(ticketRewardUsd)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <ShieldAlert className="h-3 w-3" />
                    {lang === "tr" ? "Likidasyon" : "Est. Liq"}
                  </span>
                  <span className="mono-nums font-bold text-amber-300">
                    {activeResult.estimatedLiquidationPrice > 0
                      ? `${formatPrice(activeResult.estimatedLiquidationPrice)} (${leverage}x)`
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
                    {activeResult.kellyFractionPct}% &middot; -{formatUsd(activeResult.totalCostsUsd)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isBootingChart}
                onClick={() => onCopyTicket(buildCopyText())}
                className="inline-flex items-center justify-center gap-1.5 rounded border border-white/[0.1] bg-[#121822] py-2 text-[11px] font-semibold text-white transition hover:border-white/[0.2] disabled:opacity-50 cursor-pointer"
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
                className="inline-flex items-center justify-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/15 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{lang === "tr" ? "Sinyal At" : "Send Alert"}</span>
              </button>
            </div>
          </div>

          {/* Strategy Quick Selector + Precision Sliders */}
          <div className="p-3.5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-200">
                <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
                {lang === "tr" ? "Strateji & Parametreler" : "Strategy & Parameters"}
              </span>
              <Activity className="h-3.5 w-3.5 text-slate-500" />
            </div>

            {/* 6-Strategy Compact Selector Grid */}
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
                    className={`flex items-center justify-between rounded border px-2 py-1.5 text-[10.5px] transition cursor-pointer ${
                      active
                        ? "border-emerald-500/50 bg-emerald-500/10 text-white"
                        : "border-white/[0.08] bg-[#080B10] text-slate-300 hover:border-white/[0.16]"
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

            {/* Precision Sliders */}
            <div className="space-y-3 text-[11px]">
              <div>
                <div className="flex justify-between text-slate-300">
                  <span>{lang === "tr" ? "Kasa Büyüklüğü" : "Account Capital"}</span>
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

              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{lang === "tr" ? "Kaldıraç" : "Lev"}</span>
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
                    className="quant-range mt-1.5 w-full"
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
                    className="quant-range mt-1.5 w-full"
                  />
                </div>
              </div>
            </div>

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
                className="flex w-full items-center justify-between rounded border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-left text-[11px] transition hover:bg-emerald-500/15 cursor-pointer"
              >
                <div>
                  <span className="font-bold text-emerald-300">
                    {lang === "tr" ? "Quant Pro'ya Geç" : "Unlock Quant Pro"}
                  </span>
                  <span className="block text-[10px] text-slate-300">
                    {lang === "tr"
                      ? "12 parite · 7/24 Cloud Cron · CSV"
                      : "12 pairs · 24/7 Cloud Cron · CSV"}
                  </span>
                </div>
                <span className="mono-nums rounded bg-emerald-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">
                  $12 / $29
                </span>
              </button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
