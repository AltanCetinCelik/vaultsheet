"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Award,
  Bell,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  Flame,
  Layers,
  Lock,
  LogOut,
  Radar,
  RefreshCw,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import QuantCandlestickChart from "@/components/QuantCandlestickChart";
import type { AppLang } from "@/lib/financialForensics";
import {
  CHECKOUT_URLS,
  getCheckoutUrlWithEmail,
  loadStoredLicenseKey,
  saveStoredLicenseProfile,
  verifyLicenseKey,
  type StoredLicenseProfile,
} from "@/lib/licensing";
import {
  QUANT_ASSETS,
  type MarketDataSource,
  type MtfConfluenceEntry,
} from "@/lib/marketData";
import {
  assessDerivativesSqueeze,
  buildCoinRadarRow,
  buildFallbackDerivativesPulse,
  generateFallbackCandles,
  optimizeStrategyConfig,
  runStrategyBacktest,
  runStrategyTournament,
  type BacktestResult,
  type CoinRadarRow,
  type DerivativesPulse,
  type OHLCVCandle,
  type SignalState,
  type StrategyId,
  type TimeframeId,
  type TradeDirectionMode,
} from "@/lib/quantBacktester";

export interface MarketRiskTerminalProps {
  lang: AppLang;
  isPaid?: boolean;
  onRequireUpgrade?: (reason: string) => void;
}

const TIMEFRAMES: { id: TimeframeId; label: string; proOnly?: boolean }[] = [
  { id: "15m", label: "15m", proOnly: true },
  { id: "1h", label: "1H" },
  { id: "4h", label: "4H" },
  { id: "1d", label: "1D", proOnly: true },
];

type AuthModalTab = "signup" | "login" | "key";
const LICENSE_CHANGE_EVENT = "vaultsheet-license-changed";
const LICENSE_PROFILE_STORAGE_KEY = "vaultsheet_license_profile_v1";
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

function getZeroSnapshot(): string {
  return "0";
}

function subscribeLicenseStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(LICENSE_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(LICENSE_CHANGE_EVENT, handler);
  };
}

function getEmptySnapshot(): string {
  return "";
}

function loadRawLicenseProfileJson(): string {
  if (typeof window === "undefined") return "";
  const raw = window.localStorage.getItem(LICENSE_PROFILE_STORAGE_KEY) ?? "";
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as StoredLicenseProfile;
    if (parsed?.expiresAt && Date.parse(parsed.expiresAt) <= Date.now()) {
      return "";
    }
    return raw;
  } catch {
    return "";
  }
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

const ALERT_STORAGE_KEY = "vaultsheet_alert_config_v1";
const ALERT_CHANGE_EVENT = "vaultsheet-alert-config-changed";

interface SavedAlertConfig {
  channel: "discord" | "telegram" | "webhook";
  webhookUrl: string;
  telegramBotToken: string;
  telegramChatId: string;
}

function subscribeAlertStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(ALERT_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(ALERT_CHANGE_EVENT, handler);
  };
}

function loadRawAlertJson(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ALERT_STORAGE_KEY) ?? "";
}

function formatCompactUsd(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return "$0";
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return formatUsd(val);
}

function signalBadgeText(sig: SignalState, lang: AppLang): string {
  if (sig === "ENTRY_NOW") return lang === "tr" ? "YENİ AL" : "BUY NOW";
  if (sig === "SHORT_NOW") return lang === "tr" ? "YENİ SHORT" : "SHORT NOW";
  if (sig === "LONG") return "LONG";
  if (sig === "SHORT") return "SHORT";
  return lang === "tr" ? "BEKLE" : "FLAT";
}

function signalBadgeClass(sig: SignalState): string {
  if (sig === "ENTRY_NOW") return "bg-emerald-400 text-slate-950";
  if (sig === "SHORT_NOW") return "bg-fuchsia-400 text-slate-950";
  if (sig === "LONG") return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
  if (sig === "SHORT") return "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30";
  return "bg-slate-800 text-slate-400";
}

function playAlertTone(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    for (const [offset, freq] of [
      [0, 587.33],
      [0.14, 880],
    ]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.08, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.17);
    }
  } catch {
    // Ignore browser audio autoplay restrictions
  }
}

function formatShortDate(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

function formatExpiryShort(iso?: string): string {
  if (!iso) return "Active";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "Active";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

function buildInitialRadar(): CoinRadarRow[] {
  return QUANT_ASSETS.map((a) => {
    const c = generateFallbackCandles(a.symbol, "4h", 300);
    const first = c[0]?.close ?? 1;
    const last = c[c.length - 1]?.close ?? 1;
    const chg = Math.round(((last - first) / first) * 10000) / 100;
    return buildCoinRadarRow(a.symbol, a.label, c, chg, a.proOnly, 0, "both", "4h");
  });
}

function buildInitialMtf(candles: OHLCVCandle[]): MtfConfluenceEntry[] {
  const tfs: TimeframeId[] = ["15m", "1h", "4h", "1d"];
  return tfs.map((tf) => {
    const bars = tf === "4h" ? candles : generateFallbackCandles("BTCUSDT", tf, 300);
    const { best } = optimizeStrategyConfig(bars, 10000, 2, "both", 0, tf);
    return {
      timeframe: tf,
      bestStrategyId: best.strategyId,
      strategyNameTr: best.nameTr,
      strategyNameEn: best.nameEn,
      currentSignal: best.currentSignal,
      activeSide: best.activeSide,
      netProfitPct: best.netProfitPct,
      outOfSampleReturnPct: best.outOfSampleReturnPct,
      isRobustOos: best.isRobustOos,
    };
  });
}

function formatSourceTag(src: MarketDataSource, barsCount: number, lang: AppLang): string {
  if (src === "binance_vision") return `BINANCE VISION · ${barsCount}B`;
  if (src === "binance_spot") return `BINANCE SPOT · ${barsCount}B`;
  if (src === "bybit_linear") return `BYBIT PERP · ${barsCount}B`;
  return lang === "tr" ? `SİMÜLASYON · ${barsCount}B` : `SIMULATED · ${barsCount}B`;
}

export default function MarketRiskTerminal({
  lang,
  isPaid: isPaidProp,
  onRequireUpgrade,
}: MarketRiskTerminalProps) {
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [timeframe, setTimeframe] = useState<TimeframeId>("4h");
  const [directionMode, setDirectionMode] = useState<TradeDirectionMode>("both");
  const [candles, setCandles] = useState<OHLCVCandle[]>(() =>
    generateFallbackCandles("BTCUSDT", "4h", 1000)
  );
  const [feedSource, setFeedSource] = useState<MarketDataSource>("simulated");
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(false);

  // Live Perpetual Futures Derivatives Pulse (Funding / OI / Whale Ratio / Squeeze)
  const [derivativesPulse, setDerivativesPulse] = useState<DerivativesPulse>(() =>
    buildFallbackDerivativesPulse("BTCUSDT", generateFallbackCandles("BTCUSDT", "4h", 1000), "FLAT")
  );
  const [mtfEntries, setMtfEntries] = useState<MtfConfluenceEntry[]>(() =>
    buildInitialMtf(generateFallbackCandles("BTCUSDT", "4h", 300))
  );

  // 12-Coin Alpha & Futures Radar State
  const [radarRows, setRadarRows] = useState<CoinRadarRow[]>(() => buildInitialRadar());
  const [radarFilter, setRadarFilter] = useState<"all" | "active" | "high_wr">("all");
  const [isScanningRadar, setIsScanningRadar] = useState<boolean>(false);

  // Backtest Strategy Parameters
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
  const [copiedTicket, setCopiedTicket] = useState<boolean>(false);

  // Webhook Alert Bridge & 24/7 Cloud Sentinel State
  const [alertChannelDraft, setAlertChannelDraft] = useState<
    "discord" | "telegram" | "webhook" | null
  >(null);
  const [alertWebhookDraft, setAlertWebhookDraft] = useState<string | null>(null);
  const [telegramTokenDraft, setTelegramTokenDraft] = useState<string | null>(null);
  const [telegramChatDraft, setTelegramChatDraft] = useState<string | null>(null);
  const [sentinelSymbolsDraft, setSentinelSymbolsDraft] = useState<string[] | null>(null);
  const [sentinelCloudActiveDraft, setSentinelCloudActiveDraft] = useState<boolean | null>(null);
  const [isSendingAlert, setIsSendingAlert] = useState<boolean>(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [isRunningCloudScan, setIsRunningCloudScan] = useState<boolean>(false);
  const [copiedCronUrl, setCopiedCronUrl] = useState<boolean>(false);
  const [alertStatus, setAlertStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sentinelEnabled, setSentinelEnabled] = useState<boolean>(false);
  const [lastSentinelScan, setLastSentinelScan] = useState<string | null>(null);
  const lastDispatchedSigRef = useRef<string>("");

  // Self-Contained Quant Auth & Polar Checkout Modal State
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<AuthModalTab>("signup");
  const [authName, setAuthName] = useState<string>("");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [licenseKeyDraft, setLicenseKeyDraft] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);
  const [upgradeReason, setUpgradeReason] = useState<string>("");
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const autoVerifyRef = useRef(false);

  const rawAlertJson = useSyncExternalStore(
    subscribeAlertStorage,
    loadRawAlertJson,
    getEmptySnapshot
  );

  const storedLicenseKey = useSyncExternalStore(
    subscribeLicenseStorage,
    loadStoredLicenseKey,
    getEmptySnapshot
  );
  const rawProfileJson = useSyncExternalStore(
    subscribeLicenseStorage,
    loadRawLicenseProfileJson,
    getEmptySnapshot
  );
  const rawFreeOptFlag = useSyncExternalStore(
    subscribeOptStorage,
    loadRawOptFlag,
    getZeroSnapshot
  );
  const freeOptUsed = rawFreeOptFlag === "1";

  const storedProfile = useMemo<StoredLicenseProfile | null>(() => {
    if (!rawProfileJson) return null;
    try {
      const parsed = JSON.parse(rawProfileJson) as StoredLicenseProfile;
      return parsed && typeof parsed.plan === "string" ? parsed : null;
    } catch {
      return null;
    }
  }, [rawProfileJson]);

  const accountTier = useMemo(() => {
    if (typeof isPaidProp === "boolean" && isPaidProp) {
      return {
        isLoggedIn: true,
        isPaid: true,
        planName: storedProfile?.planName || "Quant Pro Active",
      };
    }
    if (storedProfile) {
      const paid =
        storedProfile.plan === "pass_7d" || storedProfile.plan === "pro_monthly";
      return {
        isLoggedIn: true,
        isPaid: paid,
        planName: storedProfile.planName,
      };
    }
    if (storedLicenseKey && verifyLicenseKey(storedLicenseKey).valid) {
      const legacy = verifyLicenseKey(storedLicenseKey);
      return {
        isLoggedIn: true,
        isPaid: true,
        planName:
          legacy.plan === "pass_7d" ? "7-Day Quant Pass" : "Annual Quant Pro",
      };
    }
    return {
      isLoggedIn: false,
      isPaid: false,
      planName: "Free Starter",
    };
  }, [isPaidProp, storedProfile, storedLicenseKey]);

  const isPaid = accountTier.isPaid;
  const licenseKeyInput = licenseKeyDraft ?? storedLicenseKey;

  const savedAlertConfig = useMemo<SavedAlertConfig>(() => {
    let parsed: Partial<SavedAlertConfig> = {};
    if (rawAlertJson) {
      try {
        parsed = JSON.parse(rawAlertJson) as Partial<SavedAlertConfig>;
      } catch {
        parsed = {};
      }
    }
    return {
      channel: parsed.channel ?? storedProfile?.alertChannel ?? "discord",
      webhookUrl: parsed.webhookUrl ?? storedProfile?.alertWebhookUrl ?? "",
      telegramBotToken: parsed.telegramBotToken ?? "",
      telegramChatId: parsed.telegramChatId ?? storedProfile?.telegramChatId ?? "",
    };
  }, [rawAlertJson, storedProfile]);

  const alertChannel = alertChannelDraft ?? savedAlertConfig.channel;
  const alertWebhookUrl = alertWebhookDraft ?? savedAlertConfig.webhookUrl;
  const telegramBotToken = telegramTokenDraft ?? savedAlertConfig.telegramBotToken;
  const telegramChatId = telegramChatDraft ?? savedAlertConfig.telegramChatId;
  const sentinelSymbols =
    sentinelSymbolsDraft ?? storedProfile?.sentinelSymbols ?? ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
  const sentinelCloudActive =
    sentinelCloudActiveDraft ?? storedProfile?.sentinelActive ?? false;

  const persistAlertConfigLocal = useCallback(
    (next: SavedAlertConfig) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(ALERT_CHANGE_EVENT));
    },
    []
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const triggerUpgrade = useCallback(
    (reason: string) => {
      if (onRequireUpgrade) {
        onRequireUpgrade(reason);
        return;
      }
      setUpgradeReason(reason);
      setAuthTab("key");
      setAuthError(null);
      setShowAuthModal(true);
    },
    [onRequireUpgrade]
  );

  // Sync navbar auth & Polar return checkout_id
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOpenAuth = (evt: Event) => {
      const custom = evt as CustomEvent<{ mode?: AuthModalTab }>;
      setAuthTab(custom.detail?.mode ?? "signup");
      setAuthError(null);
      setUpgradeReason("");
      setShowAuthModal(true);
    };

    const onOpenAccount = () => {
      setShowAccountModal(true);
    };

    window.addEventListener("vaultsheet-open-auth", onOpenAuth);
    window.addEventListener("vaultsheet-open-account", onOpenAccount);

    if (!autoVerifyRef.current) {
      const params = new URLSearchParams(window.location.search);
      const authParam = params.get("auth");
      const accountParam = params.get("account");
      if (authParam === "signup" || authParam === "login" || authParam === "key") {
        Promise.resolve().then(() => {
          setAuthTab(authParam);
          setShowAuthModal(true);
        });
      } else if (accountParam === "1") {
        Promise.resolve().then(() => {
          setShowAccountModal(true);
        });
      }

      const checkoutId = params.get("checkout_id")?.trim() ?? "";
      if (checkoutId) {
        autoVerifyRef.current = true;
        fetch("/api/license", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkoutId }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.valid && data?.key) {
              saveStoredLicenseProfile({
                key: data.key,
                displayKey: data.displayKey || data.key,
                plan: data.plan,
                planName: data.planName,
                customerEmail: data.customerEmail,
                customerName: data.customerName,
                purchasedAt: data.purchasedAt,
                expiresAt: data.expiresAt,
                portalUrl: data.portalUrl,
              });
              window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
              const nextUrl = new URL(window.location.href);
              nextUrl.searchParams.delete("checkout_id");
              window.history.replaceState(
                {},
                "",
                nextUrl.pathname + nextUrl.search + nextUrl.hash
              );
              setShowAccountModal(true);
              showToast(data.message || "Quant Pro Pass activated!");
            }
          })
          .catch(() => {
            // Ignore transient offline errors
          });
      }
    }

    return () => {
      window.removeEventListener("vaultsheet-open-auth", onOpenAuth);
      window.removeEventListener("vaultsheet-open-account", onOpenAccount);
    };
  }, [showToast]);

  const loadCandles = useCallback(
    async (
      sym: string,
      tf: TimeframeId,
      dir: TradeDirectionMode = "both",
      lev = 2
    ): Promise<OHLCVCandle[]> => {
      setIsLoadingFeed(true);
      try {
        const res = await fetch(
          `/api/market?mode=detail&symbol=${encodeURIComponent(sym)}&tf=${encodeURIComponent(tf)}&dir=${encodeURIComponent(dir)}&limit=1000&leverage=${lev}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          ok?: boolean;
          candles?: OHLCVCandle[];
          source?: MarketDataSource;
          derivatives?: DerivativesPulse;
          mtf?: MtfConfluenceEntry[];
        };
        if (!data?.ok || !Array.isArray(data.candles) || data.candles.length < 60) {
          throw new Error("Insufficient server bars");
        }

        setCandles(data.candles);
        setFeedSource(data.source ?? "binance_vision");
        if (data.derivatives) setDerivativesPulse(data.derivatives);
        if (Array.isArray(data.mtf) && data.mtf.length > 0) {
          setMtfEntries(data.mtf);
        }
        return data.candles;
      } catch {
        const fb = generateFallbackCandles(sym, tf, 1000);
        setCandles(fb);
        setFeedSource("simulated");
        setDerivativesPulse(buildFallbackDerivativesPulse(sym, fb, "FLAT"));
        return fb;
      } finally {
        setIsLoadingFeed(false);
      }
    },
    []
  );

  // Refresh live 12-coin Alpha & Futures Radar via multi-exchange /api/market proxy
  const refreshAlphaRadar = useCallback(
    async (tf: TimeframeId, dir: TradeDirectionMode) => {
      setIsScanningRadar(true);
      try {
        const res = await fetch(
          `/api/market?mode=radar&tf=${encodeURIComponent(tf)}&dir=${encodeURIComponent(dir)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          ok?: boolean;
          rows?: CoinRadarRow[];
        };
        if (data?.ok && Array.isArray(data.rows) && data.rows.length > 0) {
          setRadarRows(data.rows);
        }
      } catch {
        // keep existing deterministic radar rows
      } finally {
        setIsScanningRadar(false);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!active) return;
      await Promise.all([
        loadCandles(symbol, timeframe, directionMode, leverage),
        refreshAlphaRadar(timeframe, directionMode),
      ]);
    };
    void init();
    return () => {
      active = false;
    };
  }, [symbol, timeframe, directionMode, leverage, loadCandles, refreshAlphaRadar]);

  const tournament = useMemo<BacktestResult[]>(() => {
    return runStrategyTournament(candles, {
      capital,
      leverage,
      stopLossPct,
      takeProfitPct,
      feePct: 0.06,
      slippagePct: 0.04,
      fundingRatePct: derivativesPulse.fundingRatePct,
      timeframe,
      fastPeriod,
      slowPeriod,
      rsiOversold: 32,
      rsiOverbought: 70,
      direction: directionMode,
    });
  }, [
    candles,
    capital,
    leverage,
    stopLossPct,
    takeProfitPct,
    derivativesPulse.fundingRatePct,
    timeframe,
    fastPeriod,
    slowPeriod,
    directionMode,
  ]);

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
      feePct: 0.06,
      slippagePct: 0.04,
      fundingRatePct: derivativesPulse.fundingRatePct,
      timeframe,
      fastPeriod,
      slowPeriod,
      rsiOversold: 32,
      rsiOverbought: 70,
      direction: directionMode,
    });
  }, [
    tournament,
    activeStrategyId,
    candles,
    capital,
    leverage,
    stopLossPct,
    takeProfitPct,
    derivativesPulse.fundingRatePct,
    timeframe,
    fastPeriod,
    slowPeriod,
    directionMode,
  ]);

  const handleSelectAsset = (assetSym: string, label: string, proOnly?: boolean) => {
    if (proOnly && !isPaid) {
      triggerUpgrade(
        lang === "tr"
          ? `${label} paritesi ve 12 varlıklı canlı Alpha Radar ($12 7 Günlük Paket veya $29 Yıllık Pro) ile açılır.`
          : `${label} and all 12 Alpha Radar pairs require a $12 7-Day Pass or Annual Pro license.`
      );
      return;
    }
    setSymbol(assetSym);
    setHasPickedStrategyManually(false);
    setOptMessage(null);
  };

  const handleSelectTimeframe = (tf: { id: TimeframeId; label: string; proOnly?: boolean }) => {
    if (tf.proOnly && !isPaid) {
      triggerUpgrade(
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
      triggerUpgrade(
        lang === "tr"
          ? "Ücretsiz 36 kombinasyon Auto-Optimize hakkını kullandın. Sınırsız optimizasyon ve 12 parite için Pro kilidini aç."
          : "You used your 1st free 36-setup sweep. Unlock unlimited Auto-Optimize with a $12 Pass or Pro license."
      );
      return;
    }

    const { best, testedCount } = optimizeStrategyConfig(
      candles,
      capital,
      leverage,
      directionMode,
      derivativesPulse.fundingRatePct,
      timeframe
    );
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
        ? `Sıfır-Sızıntılı Kör OOS: İlk %70 eğitimde ${testedCount} kombinasyon yarıştı → Kazanan: ${best.nameTr} | Görünmemiş %30 OOS: %${best.outOfSampleReturnPct >= 0 ? "+" : ""}${best.outOfSampleReturnPct}`
        : `Strict Zero-Leakage OOS: Ranked ${testedCount} setups on first 70% only → Winner: ${best.nameEn} | Blind 30% OOS: ${best.outOfSampleReturnPct >= 0 ? "+" : ""}${best.outOfSampleReturnPct}%`
    );
  };

  const handleExportTradesCsv = () => {
    if (!isPaid) {
      triggerUpgrade(
        lang === "tr"
          ? "Backtest işlem dökümünü (.CSV) indirmek için $12 7 Günlük Paket veya Pro lisans gerekir."
          : "Exporting the backtest trade execution CSV requires a $12 7-Day Pass or Annual Pro license."
      );
      return;
    }
    const headers = [
      "Trade#",
      "Side",
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
        t.side,
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmittingAuth(true);

    try {
      if (authTab === "key") {
        const trimmed = licenseKeyInput.trim();
        if (!trimmed) {
          setAuthError(
            lang === "tr"
              ? "Ödeme e-postanı veya VS- lisans anahtarını gir."
              : "Enter your checkout email address or VS- license key."
          );
          return;
        }
        const response = await fetch("/api/license", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: trimmed }),
        });
        const data = await response.json();
        if (response.ok && data?.valid && data?.key) {
          saveStoredLicenseProfile({
            key: data.key,
            displayKey: data.displayKey || data.key,
            plan: data.plan,
            planName: data.planName || "Quant Pro Pass",
            customerEmail: data.customerEmail,
            customerName: data.customerName,
            purchasedAt: data.purchasedAt,
            expiresAt: data.expiresAt,
            portalUrl: data.portalUrl,
          });
          setLicenseKeyDraft(null);
          window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
          setShowAuthModal(false);
          setShowAccountModal(true);
          showToast(data.message || "Quant Pro Pass activated!");
        } else {
          setAuthError(
            data?.message ||
              (lang === "tr" ? "Geçersiz e-posta veya anahtar." : "Invalid email or license key.")
          );
        }
        return;
      }

      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: authTab,
          name: authName,
          email: authEmail,
          password: authPassword,
        }),
      });
      const data = await response.json();
      if (response.ok && data?.valid && data?.profile) {
        saveStoredLicenseProfile(data.profile as StoredLicenseProfile);
        setAuthPassword("");
        window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
        setShowAuthModal(false);
        setShowAccountModal(true);
        showToast(data.message || "Signed in!");
      } else {
        setAuthError(data?.message || "Authentication failed.");
      }
    } catch {
      setAuthError("Network error. Please retry.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSignOut = () => {
    saveStoredLicenseProfile(null);
    setLicenseKeyDraft("");
    window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
    setShowAccountModal(false);
    showToast(lang === "tr" ? "Oturum kapatıldı." : "Signed out.");
  };

  const filteredRadar = useMemo(() => {
    let list = [...radarRows];
    if (radarFilter === "active") {
      list = list.filter((r) => r.currentSignal !== "FLAT");
    } else if (radarFilter === "high_wr") {
      list.sort((a, b) => b.winRatePct - a.winRatePct);
    } else {
      list.sort((a, b) => b.netProfitPct - a.netProfitPct);
    }
    return list;
  }, [radarRows, radarFilter]);

  const equityChart = useMemo(() => {
    const curve = activeResult.equityCurve;
    if (curve.length === 0) {
      return {
        stratPath: "",
        stratArea: "",
        holdPath: "",
        endStrat: { x: 0, y: 0 },
        endHold: { x: 0, y: 0 },
      };
    }

    const W = 760;
    const H = 145;
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

  const liveSqueeze = useMemo(
    () =>
      assessDerivativesSqueeze(
        derivativesPulse.fundingRatePct,
        derivativesPulse.whaleLongPct,
        derivativesPulse.takerBuySellRatio,
        activeResult.currentSignal
      ),
    [derivativesPulse, activeResult.currentSignal]
  );

  const lastClose = candles[candles.length - 1]?.close ?? 0;
  const ticketEntry = activeResult.activeEntryPrice ?? lastClose;
  const ticketSide = activeResult.activeSide;
  const ticketNotional = capital * leverage;
  const ticketUnits = ticketEntry > 0 ? ticketNotional / ticketEntry : 0;
  const ticketRiskUsd = Math.round(ticketNotional * (stopLossPct / 100));
  const ticketRewardUsd = Math.round(ticketNotional * (takeProfitPct / 100));

  const handleDispatchAlert = useCallback(
    async (autoTriggered = false) => {
      const nextCfg: SavedAlertConfig = {
        channel: alertChannel,
        webhookUrl: alertWebhookUrl.trim(),
        telegramBotToken: telegramBotToken.trim(),
        telegramChatId: telegramChatId.trim(),
      };
      persistAlertConfigLocal(nextCfg);

      if (!autoTriggered) {
        setIsSendingAlert(true);
        setAlertStatus(null);
      }

      try {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: nextCfg.channel,
            webhookUrl: nextCfg.webhookUrl,
            telegramBotToken: nextCfg.telegramBotToken,
            telegramChatId: nextCfg.telegramChatId,
            customerId: storedProfile?.customerId,
            customerEmail: storedProfile?.customerEmail,
            signal: {
              symbol,
              timeframe,
              strategyName: activeResult.nameEn,
              signal: activeResult.currentSignal,
              side: ticketSide,
              entryPrice: formatPrice(ticketEntry),
              stopLoss: formatPrice(activeResult.suggestedStopPrice),
              takeProfit: formatPrice(activeResult.suggestedTargetPrice),
              liquidationPrice:
                activeResult.estimatedLiquidationPrice > 0
                  ? formatPrice(activeResult.estimatedLiquidationPrice)
                  : undefined,
              leverage,
              positionUsd: formatUsd(ticketNotional),
              netReturnPct: activeResult.netProfitPct,
              outOfSampleReturnPct: activeResult.outOfSampleReturnPct,
              winRatePct: activeResult.winRatePct,
              fundingRatePct: derivativesPulse.fundingRatePct,
              squeezeLabel: liveSqueeze.squeezeLabelEn,
            },
          }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (res.ok && data?.ok) {
          setAlertStatus({ ok: true, msg: data.message || "Signal delivered!" });
          if (!autoTriggered) showToast(data.message || "Webhook dispatched!");
        } else {
          setAlertStatus({
            ok: false,
            msg: data?.message || "Webhook dispatch failed.",
          });
        }
      } catch {
        setAlertStatus({
          ok: false,
          msg: lang === "tr" ? "Ağ hatası, webhook gönderilemedi." : "Network error sending alert.",
        });
      } finally {
        if (!autoTriggered) setIsSendingAlert(false);
      }
    },
    [
      alertChannel,
      alertWebhookUrl,
      telegramBotToken,
      telegramChatId,
      persistAlertConfigLocal,
      storedProfile,
      symbol,
      timeframe,
      activeResult,
      ticketSide,
      ticketEntry,
      leverage,
      ticketNotional,
      derivativesPulse.fundingRatePct,
      liveSqueeze.squeezeLabelEn,
      showToast,
      lang,
    ]
  );

  const handleSaveCloudSentinel = async (activeOverride?: boolean) => {
    const nextCfg: SavedAlertConfig = {
      channel: alertChannel,
      webhookUrl: alertWebhookUrl.trim(),
      telegramBotToken: telegramBotToken.trim(),
      telegramChatId: telegramChatId.trim(),
    };
    persistAlertConfigLocal(nextCfg);

    if (!storedProfile?.customerId || !storedProfile?.customerEmail) {
      triggerUpgrade(
        lang === "tr"
          ? "7/24 bulut sinyal ayarlarını şifreli kaydetmek ve kişisel Cron URL'si almak için ücretsiz hesap aç/giriş yap."
          : "Sign in or create a free account to encrypt & save your 24/7 Cloud Sentinel watchlist."
      );
      return;
    }

    const nextActive = activeOverride ?? sentinelCloudActive;
    setIsSyncingCloud(true);
    setAlertStatus(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_settings",
          email: storedProfile.customerEmail,
          customerId: storedProfile.customerId,
          alertChannel: nextCfg.channel,
          alertWebhookUrl: nextCfg.webhookUrl,
          telegramBotToken: nextCfg.telegramBotToken,
          telegramChatId: nextCfg.telegramChatId,
          sentinelActive: nextActive,
          sentinelSymbols,
          sentinelTf: timeframe,
          sentinelDir: directionMode,
        }),
      });
      const data = (await res.json()) as {
        valid?: boolean;
        profile?: StoredLicenseProfile;
        message?: string;
      };
      if (res.ok && data?.valid && data?.profile) {
        saveStoredLicenseProfile(data.profile);
        setSentinelCloudActiveDraft(null);
        setSentinelSymbolsDraft(null);
        window.dispatchEvent(new Event(LICENSE_CHANGE_EVENT));
        setAlertStatus({
          ok: true,
          msg:
            lang === "tr"
              ? `Şifreli Bulut Nöbetçi kaydedildi (${sentinelSymbols.length} coin · ${timeframe.toUpperCase()}).`
              : `Encrypted Cloud Sentinel saved (${sentinelSymbols.length} coins · ${timeframe.toUpperCase()}).`,
        });
      } else {
        setAlertStatus({
          ok: false,
          msg: data?.message || "Could not sync settings.",
        });
      }
    } catch {
      setAlertStatus({ ok: false, msg: "Network error syncing cloud settings." });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleTriggerCloudSentinelNow = async () => {
    if (!storedProfile?.sentinelTriggerUrl) {
      await handleSaveCloudSentinel(true);
      return;
    }
    setIsRunningCloudScan(true);
    setAlertStatus(null);
    try {
      const res = await fetch(`${storedProfile.sentinelTriggerUrl}&force=1`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        evaluatedPairs?: number;
        dispatchedCount?: number;
        reports?: { triggered?: string[]; dispatched?: string[]; errors?: string[] }[];
        message?: string;
      };
      const rep = data.reports?.[0];
      if (res.ok && data?.ok) {
        const errs = rep?.errors ?? [];
        if (errs.length > 0 && (data.dispatchedCount ?? 0) === 0) {
          setAlertStatus({ ok: false, msg: errs[0] });
        } else {
          const trig = rep?.triggered?.length ?? 0;
          setAlertStatus({
            ok: true,
            msg:
              lang === "tr"
                ? `Bulut taraması tamamlandı: ${data.evaluatedPairs ?? 0} parite tarandı, ${trig} sinyal bulundu, ${data.dispatchedCount ?? 0} alarm iletildi.`
                : `Cloud sweep finished: ${data.evaluatedPairs ?? 0} pairs scanned, ${trig} active signals, ${data.dispatchedCount ?? 0} alerts delivered.`,
          });
        }
      } else {
        setAlertStatus({
          ok: false,
          msg: data?.message || "Cloud sentinel execution failed.",
        });
      }
    } catch {
      setAlertStatus({ ok: false, msg: "Network error reaching cloud sentinel." });
    } finally {
      setIsRunningCloudScan(false);
    }
  };

  // 60-Second Live Signal Sentinel (refreshes bars + radar & alerts on fresh bar signals)
  useEffect(() => {
    if (!sentinelEnabled) return;
    const timer = window.setInterval(() => {
      void (async () => {
        const freshBars = await loadCandles(symbol, timeframe, directionMode, leverage);
        await refreshAlphaRadar(timeframe, directionMode);
        const nowStr = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setLastSentinelScan(nowStr);

        const freshEval = runStrategyBacktest(freshBars, {
          strategyId: activeStrategyId,
          capital,
          leverage,
          stopLossPct,
          takeProfitPct,
          feePct: 0.06,
          slippagePct: 0.04,
          fundingRatePct: derivativesPulse.fundingRatePct,
          timeframe,
          fastPeriod,
          slowPeriod,
          rsiOversold: 32,
          rsiOverbought: 70,
          direction: directionMode,
        });

        const isFreshBarSignal =
          freshEval.currentSignal === "ENTRY_NOW" || freshEval.currentSignal === "SHORT_NOW";
        const latestBarTime = freshBars[freshBars.length - 1]?.time ?? 0;
        const sigKey = `${symbol}:${timeframe}:${activeStrategyId}:${freshEval.currentSignal}:${latestBarTime}`;

        if (isFreshBarSignal && lastDispatchedSigRef.current !== sigKey) {
          lastDispatchedSigRef.current = sigKey;
          playAlertTone();
          showToast(
            `${symbol} ${freshEval.currentSignal} (${formatPrice(freshEval.activeEntryPrice ?? 0)})`
          );
          if (
            alertWebhookUrl.trim() ||
            telegramBotToken.trim() ||
            storedProfile?.hasSavedTelegramToken
          ) {
            void handleDispatchAlert(true);
          }
        }
      })();
    }, 60000);

    return () => window.clearInterval(timer);
  }, [
    sentinelEnabled,
    symbol,
    timeframe,
    directionMode,
    activeStrategyId,
    capital,
    leverage,
    stopLossPct,
    takeProfitPct,
    fastPeriod,
    slowPeriod,
    derivativesPulse.fundingRatePct,
    alertWebhookUrl,
    telegramBotToken,
    storedProfile?.hasSavedTelegramToken,
    loadCandles,
    refreshAlphaRadar,
    handleDispatchAlert,
    showToast,
  ]);

  const passCheckoutHref = getCheckoutUrlWithEmail(
    CHECKOUT_URLS.pass7Day,
    storedProfile?.customerEmail
  );
  const proCheckoutHref = getCheckoutUrlWithEmail(
    CHECKOUT_URLS.proMonthly,
    storedProfile?.customerEmail
  );

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#070B14] text-slate-100 shadow-[0_28px_70px_-15px_rgba(2,6,23,0.75)]">
      {/* 1. LIVE 12-COIN ALPHA & PERPETUAL FUTURES RADAR */}
      <div className="border-b border-slate-800/90 bg-[#0B1120] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Radar className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white sm:text-sm">
              {lang === "tr"
                ? `Canlı 12 Parite Alpha & Futures Tarayıcısı (${timeframe.toUpperCase()})`
                : `Live 12-Pair Alpha & Futures Radar (${timeframe.toUpperCase()})`}
            </h2>
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
              {radarRows.filter((r) => r.currentSignal !== "FLAT").length}{" "}
              {lang === "tr" ? "Aktif Sinyal" : "Active Signals"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: lang === "tr" ? "Tümü (En Kârlı)" : "All (Top PnL)" },
              { id: "active", label: lang === "tr" ? "Aktif Long / Short" : "Active Signals" },
              { id: "high_wr", label: lang === "tr" ? "En Yüksek Win %" : "Highest Win %" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRadarFilter(tab.id as "all" | "active" | "high_wr")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                  radarFilter === tab.id
                    ? "bg-white text-slate-950"
                    : "border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => void refreshAlphaRadar(timeframe, directionMode)}
              disabled={isScanningRadar}
              className="ml-1 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isScanningRadar ? "animate-spin" : ""}`} />
              <span>{lang === "tr" ? "Tümünü Tara" : "Scan All 12"}</span>
            </button>
          </div>
        </div>

        {/* Full 12-Coin Scanner Grid */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {filteredRadar.map((row) => {
            const isSelected = symbol === row.symbol;
            const locked = row.proOnly && !isPaid;
            return (
              <button
                key={row.symbol}
                type="button"
                onClick={() => handleSelectAsset(row.symbol, row.base, row.proOnly)}
                className={`group rounded-xl border p-3 text-left transition cursor-pointer ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-slate-800 bg-[#050811] hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-extrabold text-white inline-flex items-center gap-1">
                    {row.base}
                    {locked && <Lock className="h-2.5 w-2.5 text-slate-500" />}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${signalBadgeClass(
                      row.currentSignal
                    )}`}
                  >
                    {signalBadgeText(row.currentSignal, lang)}
                  </span>
                </div>

                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="mono-nums text-xs font-semibold text-slate-200">
                    {formatPrice(row.price)}
                  </span>
                  <span
                    className={`mono-nums text-[11px] font-bold ${
                      row.netProfitPct >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {row.netProfitPct >= 0 ? "+" : ""}
                    {row.netProfitPct}%
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span
                    className={`mono-nums font-semibold ${
                      row.outOfSampleReturnPct >= 0 ? "text-sky-300" : "text-amber-400"
                    }`}
                  >
                    OOS {row.outOfSampleReturnPct >= 0 ? "+" : ""}
                    {row.outOfSampleReturnPct}%
                  </span>
                  <span
                    className={`mono-nums font-semibold ${
                      row.fundingRatePct < 0 ? "text-emerald-300" : "text-slate-300"
                    }`}
                  >
                    {row.squeezeState === "SHORT_SQUEEZE"
                      ? "SQZ↑"
                      : `F:${row.fundingRatePct >= 0 ? "+" : ""}${row.fundingRatePct.toFixed(3)}%`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Terminal Content */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Top Asset Pill Row + Direction Toggle + Timeframe + Auto-Optimizer */}
        <div className="flex flex-col gap-3 border-b border-slate-800/90 pb-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {QUANT_ASSETS.map((a) => {
              const selected = symbol === a.symbol;
              return (
                <button
                  key={a.symbol}
                  type="button"
                  onClick={() => handleSelectAsset(a.symbol, a.label, a.proOnly)}
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
            {/* Direction Mode Selector (Long + Short / Long / Short) */}
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-[11px] font-bold">
              {(
                [
                  { id: "both", label: lang === "tr" ? "LONG+SHORT" : "BOTH" },
                  { id: "long", label: "LONG" },
                  { id: "short", label: "SHORT" },
                ] as { id: TradeDirectionMode; label: string }[]
              ).map((dirOpt) => (
                <button
                  key={dirOpt.id}
                  type="button"
                  onClick={() => {
                    setDirectionMode(dirOpt.id);
                    setHasPickedStrategyManually(false);
                  }}
                  className={`rounded-md px-2 py-1 transition cursor-pointer ${
                    directionMode === dirOpt.id
                      ? dirOpt.id === "short"
                        ? "bg-fuchsia-600 text-white"
                        : "bg-emerald-500 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {dirOpt.label}
                </button>
              ))}
            </div>

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
              onClick={() => void loadCandles(symbol, timeframe, directionMode, leverage)}
              disabled={isLoadingFeed}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingFeed ? "animate-spin" : ""}`} />
              <span>{formatSourceTag(feedSource, candles.length, lang)}</span>
            </button>

            <button
              type="button"
              onClick={handleAutoOptimize}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-300 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-sm transition hover:brightness-105 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 fill-slate-950" />
              <span>
                {lang === "tr" ? "Kör OOS Optimize (36 Test)" : "Zero-Leak OOS Sweep (36)"}
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

        {/* Live Binance Futures Derivatives & Squeeze Bar */}
        <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-slate-800/90 bg-[#050811] p-3 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{lang === "tr" ? "Fonlama (8s) & Mark" : "Funding (8h) & Mark"}</span>
              <span
                className={`rounded px-1 text-[9px] font-bold ${
                  derivativesPulse.isLiveDerivatives
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {derivativesPulse.isLiveDerivatives ? "PERP LIVE" : "EST"}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span
                className={`mono-nums text-sm font-extrabold ${
                  derivativesPulse.fundingRatePct < 0
                    ? "text-emerald-400"
                    : derivativesPulse.fundingRatePct >= 0.015
                      ? "text-rose-400"
                      : "text-white"
                }`}
              >
                {derivativesPulse.fundingRatePct >= 0 ? "+" : ""}
                {derivativesPulse.fundingRatePct.toFixed(4)}%
              </span>
              <span className="mono-nums text-[11px] text-slate-400">
                Basis {derivativesPulse.basisPct >= 0 ? "+" : ""}
                {derivativesPulse.basisPct.toFixed(3)}%
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-800/80">
            <span className="block text-[10px] text-slate-400">
              {lang === "tr" ? "Açık Pozisyon (Open Interest)" : "Perp Open Interest"}
            </span>
            <span className="mono-nums mt-1 block text-sm font-extrabold text-white">
              {formatCompactUsd(derivativesPulse.openInterestUsd)}
            </span>
            <span className="mono-nums text-[10px] text-slate-400">
              Mark {formatPrice(derivativesPulse.markPrice)}
            </span>
          </div>

          <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{lang === "tr" ? "Balina Long / Short" : "Whale Long / Short"}</span>
              <span className="mono-nums font-bold text-white">
                {derivativesPulse.whaleRatio}x
              </span>
            </div>
            <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-rose-500/50">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{ width: `${derivativesPulse.whaleLongPct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] mono-nums">
              <span className="text-emerald-300">L {derivativesPulse.whaleLongPct}%</span>
              <span className="text-rose-300">S {derivativesPulse.whaleShortPct}%</span>
            </div>
          </div>

          <div
            className={`rounded-lg px-3 py-2 border ${
              liveSqueeze.squeezeState === "SHORT_SQUEEZE"
                ? "border-emerald-500/40 bg-emerald-500/10"
                : liveSqueeze.squeezeState === "LONG_SQUEEZE"
                  ? "border-rose-500/40 bg-rose-500/10"
                  : "border-slate-800/80 bg-slate-900/70"
            }`}
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="inline-flex items-center gap-1 font-bold text-slate-300">
                <Flame className="h-3 w-3 text-amber-400" />
                {lang === "tr" ? liveSqueeze.squeezeLabelTr : liveSqueeze.squeezeLabelEn}
              </span>
              <span className="mono-nums text-[10px] font-bold text-slate-300">
                Taker {derivativesPulse.takerBuySellRatio}x
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-slate-300 line-clamp-2">
              {lang === "tr" ? liveSqueeze.squeezeDetailTr : liveSqueeze.squeezeDetailEn}
            </p>
          </div>
        </div>

        {/* Multi-Timeframe Confluence Strip (15m · 1H · 4H · 1D) */}
        <div className="flex flex-col gap-2 rounded-xl border border-slate-800/90 bg-[#050811] px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-bold text-slate-200">
              {lang === "tr"
                ? `${symbol} Çoklu Zaman Dilimi (MTF) Uyumu:`
                : `${symbol} Multi-Timeframe Confluence:`}
            </span>
            {(() => {
              const bullCount = mtfEntries.filter(
                (m) => m.currentSignal === "LONG" || m.currentSignal === "ENTRY_NOW"
              ).length;
              const bearCount = mtfEntries.filter(
                (m) => m.currentSignal === "SHORT" || m.currentSignal === "SHORT_NOW"
              ).length;
              return (
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                    bullCount >= 3
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : bearCount >= 3
                        ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40"
                        : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {bullCount >= 3
                    ? lang === "tr"
                      ? `${bullCount}/4 GÜÇLÜ BOĞA`
                      : `${bullCount}/4 STRONG BULL`
                    : bearCount >= 3
                      ? lang === "tr"
                        ? `${bearCount}/4 GÜÇLÜ AYI`
                        : `${bearCount}/4 STRONG BEAR`
                      : lang === "tr"
                        ? `${bullCount} Long · ${bearCount} Short`
                        : `${bullCount} Long · ${bearCount} Short`}
                </span>
              );
            })()}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {mtfEntries.map((m) => (
              <div
                key={m.timeframe}
                className="flex items-center justify-between gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[10px]"
              >
                <span className="font-bold uppercase text-slate-300">{m.timeframe}</span>
                <span
                  className={`rounded px-1.5 py-0.5 font-extrabold ${signalBadgeClass(
                    m.currentSignal
                  )}`}
                >
                  {signalBadgeText(m.currentSignal, lang)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-Optimize Notification Banner */}
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

        {/* 4 Quant KPI Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between gap-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {lang === "tr" ? "Net Getiri & Kör OOS %30" : "Net Return & Blind 30% OOS"}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold ${
                  activeResult.isRobustOos
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {activeResult.isRobustOos
                  ? lang === "tr"
                    ? "KÖR OOS DOĞRULANDI"
                    : "BLIND OOS PASSED"
                  : lang === "tr"
                    ? "OVERFIT UYARI"
                    : "LOW OOS"}
              </span>
            </div>
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
              {lang === "tr" ? "Kör %30 OOS:" : "Blind 30% OOS:"}{" "}
              <strong
                className={
                  activeResult.outOfSampleReturnPct >= 0 ? "text-sky-300" : "text-rose-300"
                }
              >
                {activeResult.outOfSampleReturnPct >= 0 ? "+" : ""}
                {activeResult.outOfSampleReturnPct}%
              </strong>{" "}
              &middot; Alpha {activeResult.alphaPct >= 0 ? "+" : ""}
              {activeResult.alphaPct}%
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {lang === "tr" ? "Kazanma % · Expectancy · Kelly" : "Win % · Expectancy · Kelly"}
            </span>
            <span className="mono-nums mt-1 block text-xl font-extrabold text-white sm:text-2xl">
              {activeResult.winRatePct}%{" "}
              <span className="text-sm font-bold text-blue-400">
                PF {activeResult.profitFactor}
              </span>
            </span>
            <span className="mono-nums mt-1 block text-[11px] text-slate-400">
              {lang === "tr" ? "İşlem Başı:" : "Exp:"}{" "}
              <strong
                className={
                  activeResult.expectancyUsd >= 0 ? "text-emerald-300" : "text-rose-300"
                }
              >
                {activeResult.expectancyUsd >= 0 ? "+" : ""}
                {formatUsd(activeResult.expectancyUsd)}
              </strong>{" "}
              &middot; Kelly {activeResult.kellyFractionPct}%
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {lang === "tr" ? "Max Erime & Maliyet Kesintisi" : "Max DD & Fees/Slippage"}
            </span>
            <span className="mono-nums mt-1 block text-xl font-extrabold text-rose-400 sm:text-2xl">
              -{activeResult.maxDrawdownPct}%{" "}
              <span className="text-sm font-bold text-slate-300">
                S: {activeResult.sharpeRatio}
              </span>
            </span>
            <span className="mono-nums mt-1 block text-[11px] text-slate-400">
              {lang === "tr" ? "Kasa:" : "Eq:"}{" "}
              <strong className="text-white">{formatUsd(activeResult.finalEquity)}</strong>{" "}
              &middot; {lang === "tr" ? "Kesinti" : "Costs"} -{formatUsd(activeResult.totalCostsUsd)}
            </span>
          </div>

          <div
            className={`rounded-xl border p-4 ${
              activeResult.currentSignal === "FLAT"
                ? "border-slate-800 bg-slate-900/70"
                : activeResult.activeSide === "SHORT"
                  ? "border-fuchsia-500/50 bg-fuchsia-500/10"
                  : "border-emerald-500/50 bg-emerald-500/10"
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {lang === "tr"
                ? `Son Mum Sinyali (${symbol} · ${candles.length}B)`
                : `Latest Bar Signal (${symbol} · ${candles.length}B)`}
            </span>
            <span
              className={`mt-1 block text-lg font-extrabold sm:text-xl ${
                activeResult.currentSignal === "FLAT"
                  ? "text-slate-300"
                  : activeResult.activeSide === "SHORT"
                    ? "text-fuchsia-300"
                    : "text-emerald-400"
              }`}
            >
              {signalBadgeText(activeResult.currentSignal, lang)}
            </span>
            <span className="mono-nums mt-1 block text-[11px] text-slate-300">
              SL {formatPrice(activeResult.suggestedStopPrice)} &middot; TP{" "}
              {formatPrice(activeResult.suggestedTargetPrice)}
            </span>
          </div>
        </div>

        {/* Main 12-Column Interactive Stage */}
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Left 8 Cols: Interactive Candlestick Chart + Equity Curve + Webhook & 24/7 Cloud Sentinel */}
          <div className="lg:col-span-8 space-y-4">
            <QuantCandlestickChart
              symbol={symbol}
              timeframe={timeframe}
              candles={candles}
              result={activeResult}
              lang={lang}
            />

            {/* Equity Curve Chart */}
            <div className="rounded-xl border border-slate-800 bg-[#050811] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold text-white">
                    {lang === "tr"
                      ? `Bileşik Kasa Eğrisi: ${activeResult.nameTr}`
                      : `Compounded Equity Curve: ${activeResult.nameEn}`}
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
                  viewBox="0 0 760 145"
                  className="h-36 w-full"
                  role="img"
                  aria-label="Strategy equity versus buy and hold curve"
                >
                  <defs>
                    <linearGradient id="quantEqGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {equityChart.stratArea && (
                    <path d={equityChart.stratArea} fill="url(#quantEqGrad2)" />
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

            {/* Live Webhook & 24/7 Encrypted Cloud Sentinel Panel */}
            <div className="rounded-xl border border-slate-800 bg-[#050811] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-sky-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    {lang === "tr"
                      ? "7/24 Bulut Sinyal Nöbetçisi & Şifreli Webhook Köprüsü"
                      : "24/7 Cloud Signal Sentinel & Encrypted Webhook Bridge"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSentinelEnabled((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                    sentinelEnabled
                      ? "bg-emerald-400 text-slate-950"
                      : "border border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      sentinelEnabled ? "bg-slate-950 animate-ping" : "bg-slate-500"
                    }`}
                  />
                  <span>
                    {sentinelEnabled
                      ? lang === "tr"
                        ? `Sekme 60sn AÇIK${lastSentinelScan ? ` (${lastSentinelScan})` : ""}`
                        : `60s Tab ON${lastSentinelScan ? ` (${lastSentinelScan})` : ""}`
                      : lang === "tr"
                        ? "Sekme 60sn Oto-Tarama"
                        : "60s Tab Auto-Scan"}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: "discord", label: "Discord Webhook" },
                    { id: "telegram", label: "Telegram Bot (AES-256 Cloud)" },
                    { id: "webhook", label: "Custom JSON Bot" },
                  ] as const
                ).map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setAlertChannelDraft(ch.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      alertChannel === ch.id
                        ? "bg-sky-500 text-slate-950 font-bold"
                        : "border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>

              {alertChannel === "telegram" ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input
                    type="password"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramTokenDraft(e.target.value)}
                    placeholder={
                      storedProfile?.hasSavedTelegramToken
                        ? "•••••••• (Encrypted token saved in cloud)"
                        : "Bot Token (123456789:AAH...)"
                    }
                    className="mono-nums rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatDraft(e.target.value)}
                    placeholder="Chat ID (-100... or @channel)"
                    className="mono-nums rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
              ) : (
                <input
                  type="url"
                  value={alertWebhookUrl}
                  onChange={(e) => setAlertWebhookDraft(e.target.value)}
                  placeholder={
                    alertChannel === "discord"
                      ? "https://discord.com/api/webhooks/..."
                      : "https://your-bot-endpoint.com/webhook"
                  }
                  className="mono-nums w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                />
              )}

              {/* Watchlist Coin Selector for 7/24 Cloud Sentinel */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {lang === "tr"
                      ? `7/24 Bulut İzleme Listesi (${sentinelSymbols.length} Parite · ${timeframe.toUpperCase()}):`
                      : `24/7 Cloud Watchlist (${sentinelSymbols.length} Pairs · ${timeframe.toUpperCase()}):`}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleSaveCloudSentinel(!sentinelCloudActive)}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                      sentinelCloudActive
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    {sentinelCloudActive
                      ? lang === "tr"
                        ? "Bulut Cron: AKTİF"
                        : "Cloud Cron: ON"
                      : lang === "tr"
                        ? "Bulut Cron: KAPALI"
                        : "Cloud Cron: OFF"}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {QUANT_ASSETS.map((a) => {
                    const activeWatch = sentinelSymbols.includes(a.symbol);
                    return (
                      <button
                        key={`w-${a.symbol}`}
                        type="button"
                        onClick={() => {
                          if (a.proOnly && !isPaid) {
                            triggerUpgrade(
                              lang === "tr"
                                ? `${a.label} bulut takibi Pro lisansla açılır.`
                                : `${a.label} cloud alerts require Pro license.`
                            );
                            return;
                          }
                          const nextList = activeWatch
                            ? sentinelSymbols.filter((s) => s !== a.symbol)
                            : [...sentinelSymbols, a.symbol];
                          setSentinelSymbolsDraft(nextList.length > 0 ? nextList : [a.symbol]);
                        }}
                        className={`rounded px-2 py-1 text-[10px] font-bold transition cursor-pointer ${
                          activeWatch
                            ? "bg-blue-600/30 text-blue-200 border border-blue-400/50"
                            : "bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300"
                        }`}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isSyncingCloud}
                    onClick={() => void handleSaveCloudSentinel(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50 cursor-pointer"
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

                  {storedProfile?.sentinelTriggerUrl && (
                    <>
                      <button
                        type="button"
                        disabled={isRunningCloudScan}
                        onClick={() => void handleTriggerCloudSentinelNow()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${isRunningCloudScan ? "animate-spin" : ""}`}
                        />
                        <span>
                          {lang === "tr" ? "Bulutu Şimdi Tara" : "Run Cloud Watchlist"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined" && storedProfile.sentinelTriggerUrl) {
                            const fullCronUrl = `${window.location.origin}${storedProfile.sentinelTriggerUrl}`;
                            void navigator.clipboard.writeText(fullCronUrl);
                            setCopiedCronUrl(true);
                            setTimeout(() => setCopiedCronUrl(false), 2000);
                            showToast(
                              lang === "tr"
                                ? "Kişisel 7/24 Cron URL kopyalandı! (cron-job.org / UptimeRobot 5dk-15dk)"
                                : "Personal 24/7 Cron URL copied! Paste into cron-job.org / UptimeRobot."
                            );
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer"
                      >
                        {copiedCronUrl ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>{lang === "tr" ? "Cron URL" : "Cron URL"}</span>
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSendingAlert}
                  onClick={() => void handleDispatchAlert(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {isSendingAlert
                      ? lang === "tr"
                        ? "Gönderiliyor..."
                        : "Sending..."
                      : lang === "tr"
                        ? "Emri Şimdi Webhook'a Gönder"
                        : "Dispatch Signal Now"}
                  </span>
                </button>
              </div>

              {alertStatus && (
                <div
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                    alertStatus.ok
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  {alertStatus.msg}
                </div>
              )}
            </div>
          </div>

          {/* Right 4 Cols: 6-Strategy Leaderboard + Sliders + Live Execution Ticket */}
          <div className="lg:col-span-4 space-y-4">
            {/* 6-Strategy Tournament */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    {lang === "tr" ? "6-Strateji Performans Ligi" : "6-Strategy Tournament"}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400">
                  {candles.length}B &middot; Zero-Leak OOS
                </span>
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
                          Win {strat.winRatePct}% &middot;{" "}
                          <strong
                            className={
                              strat.outOfSampleReturnPct >= 0 ? "text-sky-300" : "text-amber-300"
                            }
                          >
                            OOS {strat.outOfSampleReturnPct >= 0 ? "+" : ""}
                            {strat.outOfSampleReturnPct}%
                          </strong>
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

            {/* Parameter Sliders */}
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

            {/* Live Order & Position Sizing Ticket + Liquidation */}
            <div
              className={`rounded-xl border bg-[#050811] p-4 space-y-3 ${
                ticketSide === "SHORT" ? "border-fuchsia-500/40" : "border-emerald-500/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                  <Target className="h-3.5 w-3.5 text-emerald-400" />
                  {lang === "tr" ? "Canlı Emir & Kasa Planı" : "Actionable Order Ticket"}
                </span>
                <span
                  className={`mono-nums rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                    ticketSide === "SHORT"
                      ? "bg-fuchsia-500/20 text-fuchsia-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {ticketSide} &middot; {leverage}x
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-900/90 px-3 py-2 border border-slate-800">
                  <span className="block text-[10px] text-slate-400">
                    {lang === "tr" ? "Giriş / Pozisyon" : "Entry / Size"}
                  </span>
                  <span className="mono-nums font-bold text-white">
                    {formatPrice(ticketEntry)}
                  </span>
                  <span className="mono-nums block text-[10px] text-slate-400">
                    {ticketUnits.toFixed(4)} {symbol.replace(/USDT$/, "")} ({formatUsd(ticketNotional)})
                  </span>
                </div>

                <div className="rounded-lg bg-slate-900/90 px-3 py-2 border border-slate-800">
                  <span className="block text-[10px] text-slate-400">
                    {lang === "tr" ? "SL Zarar / TP Kâr" : "SL Risk / TP Reward"}
                  </span>
                  <span className="mono-nums block text-[11px] font-bold text-rose-400">
                    SL {formatPrice(activeResult.suggestedStopPrice)} (-{formatUsd(ticketRiskUsd)})
                  </span>
                  <span className="mono-nums block text-[11px] font-bold text-emerald-400">
                    TP {formatPrice(activeResult.suggestedTargetPrice)} (+{formatUsd(ticketRewardUsd)})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-200">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                  {lang === "tr" ? "Tahmini Likidasyon:" : "Est. Liquidation:"}
                </span>
                <span className="mono-nums font-extrabold text-amber-300">
                  {activeResult.estimatedLiquidationPrice > 0
                    ? `${formatPrice(activeResult.estimatedLiquidationPrice)} (${leverage}x)`
                    : lang === "tr"
                      ? "Yok (1x Spot)"
                      : "None (1x Spot)"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const planText = `${symbol} (${timeframe.toUpperCase()}) | Strategy: ${activeResult.nameEn}\nSide: ${ticketSide} (${activeResult.currentSignal}) | Leverage: ${leverage}x\nEntry: ${formatPrice(ticketEntry)} | Size: ${ticketUnits.toFixed(4)} (${formatUsd(ticketNotional)})\nStop-Loss (-${stopLossPct}%): ${formatPrice(activeResult.suggestedStopPrice)} (-${formatUsd(ticketRiskUsd)})\nTake-Profit (+${takeProfitPct}%): ${formatPrice(activeResult.suggestedTargetPrice)} (+${formatUsd(ticketRewardUsd)})\nEst. Liquidation: ${activeResult.estimatedLiquidationPrice > 0 ? formatPrice(activeResult.estimatedLiquidationPrice) : "1x Spot"}\nWalk-Forward OOS 30%: ${activeResult.outOfSampleReturnPct >= 0 ? "+" : ""}${activeResult.outOfSampleReturnPct}%`;
                  if (typeof navigator !== "undefined") {
                    void navigator.clipboard.writeText(planText);
                    setCopiedTicket(true);
                    setTimeout(() => setCopiedTicket(false), 1800);
                  }
                }}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-800 py-2 text-xs font-bold text-white transition hover:bg-slate-700 cursor-pointer"
              >
                {copiedTicket ? (
                  <>
                    <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" />
                    {lang === "tr" ? "Emir Planı Kopyalandı!" : "Order Setup Copied!"}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-300" />
                    {lang === "tr" ? "Emir & SL/TP Planını Kopyala" : "Copy Order & SL/TP Setup"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Trade Execution Ledger */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#050811]">
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
                  <th className="px-4 py-2.5">{lang === "tr" ? "Yön" : "Side"}</th>
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
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                          t.side === "SHORT"
                            ? "bg-fuchsia-500/20 text-fuchsia-300"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {t.side}
                      </span>
                    </td>
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
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
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

      {/* DARK OBSIDIAN QUANT AUTH & POLAR UPGRADE MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B1120] p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {authTab === "signup"
                    ? lang === "tr"
                      ? "Ücretsiz Quant Hesabı Aç"
                      : "Create Quant Starter Account"
                    : authTab === "login"
                      ? lang === "tr"
                        ? "VaultSheet Quant Girişi"
                        : "Log In to VaultSheet Quant"
                      : lang === "tr"
                        ? "Quant Pro Lisansını Etkinleştir"
                        : "Unlock Quant Pro Terminal"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {upgradeReason && (
              <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {upgradeReason}
              </p>
            )}

            <div className="mt-4 grid grid-cols-3 rounded-xl bg-slate-900 p-1 text-xs font-semibold border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("signup");
                  setAuthError(null);
                }}
                className={`rounded-lg py-1.5 transition cursor-pointer ${
                  authTab === "signup"
                    ? "bg-white text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {lang === "tr" ? "Üye Ol" : "Sign Up"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("login");
                  setAuthError(null);
                }}
                className={`rounded-lg py-1.5 transition cursor-pointer ${
                  authTab === "login"
                    ? "bg-white text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {lang === "tr" ? "Giriş" : "Log In"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("key");
                  setAuthError(null);
                }}
                className={`rounded-lg py-1.5 transition cursor-pointer ${
                  authTab === "key"
                    ? "bg-white text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {lang === "tr" ? "Lisans / E-posta" : "License Key"}
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3">
              {authTab === "signup" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">
                    {lang === "tr" ? "Ad Soyad" : "Full Name"}
                  </label>
                  <input
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              )}

              {(authTab === "signup" || authTab === "login") && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300">
                      {lang === "tr" ? "E-posta Adresi" : "Email Address"}
                    </label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="trader@domain.com"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300">
                      {lang === "tr" ? "Şifre (en az 6 karakter)" : "Password (min. 6 chars)"}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {authTab === "key" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">
                    {lang === "tr"
                      ? "Polar Ödeme E-postası veya VS- Lisans Anahtarı"
                      : "Polar Checkout Email OR VS- License Key"}
                  </label>
                  <input
                    type="text"
                    value={licenseKeyInput}
                    onChange={(e) => {
                      setLicenseKeyDraft(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="you@example.com or VS-PRO-XXXX"
                    className="mono-nums mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              )}

              {authError && <p className="text-xs font-medium text-rose-400">{authError}</p>}

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full rounded-xl bg-white py-2.5 text-xs font-bold text-slate-950 shadow-xs transition hover:bg-slate-200 disabled:opacity-60 cursor-pointer"
              >
                {isSubmittingAuth
                  ? lang === "tr"
                    ? "Doğrulanıyor..."
                    : "Verifying..."
                  : authTab === "signup"
                    ? lang === "tr"
                      ? "Ücretsiz Hesap Oluştur"
                      : "Create Account"
                    : authTab === "login"
                      ? lang === "tr"
                        ? "Giriş Yap"
                        : "Log In"
                      : lang === "tr"
                        ? "Anahtarı Doğrula ve Aç"
                        : "Verify & Activate"}
              </button>
            </form>

            <div className="mt-4 border-t border-slate-800 pt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {lang === "tr"
                  ? "Veya Tüm 12 Parite, 15m/1D & Sınırsız Auto-Optimize'ı Aç"
                  : "Or Unlock All 12 Pairs, 15m/1D & Unlimited Sweeps"}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={passCheckoutHref}
                  className="flex flex-col rounded-xl border border-slate-700 bg-slate-900 p-3 transition hover:border-emerald-400"
                >
                  <span className="text-xs font-semibold text-slate-300">
                    {lang === "tr" ? "7 Günlük Quant Pass" : "7-Day Quant Pass"}
                  </span>
                  <span className="mono-nums mt-0.5 text-lg font-extrabold text-white">$12</span>
                  <span className="text-[10px] text-slate-400">
                    {lang === "tr" ? "Tek seferlik · Yenileme yok" : "One-time · No renewal"}
                  </span>
                </a>
                <a
                  href={proCheckoutHref}
                  className="flex flex-col rounded-xl border-2 border-emerald-400 bg-emerald-500/10 p-3 transition hover:bg-emerald-500/20"
                >
                  <span className="text-xs font-semibold text-emerald-300">
                    {lang === "tr" ? "Yıllık Quant Pro" : "Annual Quant Pro"}
                  </span>
                  <span className="mono-nums mt-0.5 text-lg font-extrabold text-white">$29/yr</span>
                  <span className="text-[10px] text-emerald-200">
                    {lang === "tr" ? "365 gün tüm modüller" : "Full year · Unlimited sweeps"}
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DARK OBSIDIAN QUANT ACCOUNT DASHBOARD MODAL */}
      {showAccountModal && accountTier.isLoggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B1120] p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isPaid
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {storedProfile?.customerName || "VaultSheet Quant Account"}
                  </h3>
                  <p
                    className={`text-xs font-semibold ${
                      isPaid ? "text-emerald-400" : "text-blue-400"
                    }`}
                  >
                    {accountTier.planName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-xs">
              {storedProfile?.customerEmail && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-semibold text-white">
                    {storedProfile.customerEmail}
                  </span>
                </div>
              )}

              {isPaid ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">License Key:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="mono-nums font-semibold text-white">
                        {storedProfile?.displayKey ||
                          (storedLicenseKey
                            ? `VS-****-${storedLicenseKey.slice(-6)}`
                            : "Active")}
                      </span>
                      {(storedProfile?.key || storedLicenseKey) && (
                        <button
                          type="button"
                          onClick={() => {
                            const fullKey = storedProfile?.key || storedLicenseKey;
                            if (typeof navigator !== "undefined" && fullKey) {
                              void navigator.clipboard.writeText(fullKey);
                              setCopiedKey(true);
                              setTimeout(() => setCopiedKey(false), 1800);
                            }
                          }}
                          className="rounded border border-slate-700 bg-slate-800 p-1 text-slate-300 hover:bg-slate-700 cursor-pointer"
                        >
                          {copiedKey ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Valid Until:</span>
                    <span className="mono-nums font-semibold text-white">
                      {formatExpiryShort(storedProfile?.expiresAt)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Access Tier:</span>
                  <span className="font-semibold text-white">
                    5 Core Pairs · 1 Free 36-Setup Sweep
                  </span>
                </div>
              )}
            </div>

            {!isPaid && (
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <a
                  href={passCheckoutHref}
                  className="flex flex-col rounded-xl border border-slate-700 bg-slate-900 p-3 transition hover:border-emerald-400"
                >
                  <span className="text-xs font-semibold text-slate-300">7-Day Pass</span>
                  <span className="mono-nums mt-0.5 text-lg font-bold text-white">$12</span>
                  <span className="text-[10px] text-slate-400">12 pairs + 15m/1D</span>
                </a>
                <a
                  href={proCheckoutHref}
                  className="flex flex-col rounded-xl border-2 border-emerald-400 bg-emerald-500/10 p-3 transition hover:bg-emerald-500/20"
                >
                  <span className="text-xs font-semibold text-emerald-300">Annual Pro</span>
                  <span className="mono-nums mt-0.5 text-lg font-bold text-white">$29/yr</span>
                  <span className="text-[10px] text-emerald-200">365 days unlimited</span>
                </a>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
              <a
                href={storedProfile?.portalUrl || "https://polar.sh/vaultsheet/portal"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                Billing Portal
              </a>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                {lang === "tr" ? "Çıkış Yap" : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
