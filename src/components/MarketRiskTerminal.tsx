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
  Check,
  Copy,
  ExternalLink,
  LogOut,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import TerminalCockpitView from "@/components/TerminalCockpitView";
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
  type StrategyId,
  type TimeframeId,
  type TradeDirectionMode,
} from "@/lib/quantBacktester";

export interface MarketRiskTerminalProps {
  lang: AppLang;
  isPaid?: boolean;
  onRequireUpgrade?: (reason: string) => void;
}

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
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
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
    timeZone: "UTC",
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

export default function MarketRiskTerminal({
  lang,
  isPaid: isPaidProp,
  onRequireUpgrade,
}: MarketRiskTerminalProps) {
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [timeframe, setTimeframe] = useState<TimeframeId>("4h");
  const [directionMode, setDirectionMode] = useState<TradeDirectionMode>("both");
  const [candles, setCandles] = useState<OHLCVCandle[]>([]);
  const [feedSource, setFeedSource] = useState<MarketDataSource>("simulated");
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(true);

  // Live Perpetual Futures Derivatives Pulse (Funding / OI / Whale Ratio / Squeeze)
  const [derivativesPulse, setDerivativesPulse] = useState<DerivativesPulse>(() =>
    buildFallbackDerivativesPulse("BTCUSDT", [], "FLAT")
  );
  const [mtfEntries, setMtfEntries] = useState<MtfConfluenceEntry[]>(() => [
    {
      timeframe: "15m",
      bestStrategyId: "ema_cross",
      strategyNameTr: "EMA Trend",
      strategyNameEn: "EMA Trend",
      currentSignal: "FLAT",
      activeSide: "LONG",
      netProfitPct: 0,
      outOfSampleReturnPct: 0,
      isRobustOos: false,
    },
    {
      timeframe: "1h",
      bestStrategyId: "ema_cross",
      strategyNameTr: "EMA Trend",
      strategyNameEn: "EMA Trend",
      currentSignal: "FLAT",
      activeSide: "LONG",
      netProfitPct: 0,
      outOfSampleReturnPct: 0,
      isRobustOos: false,
    },
    {
      timeframe: "4h",
      bestStrategyId: "ema_cross",
      strategyNameTr: "EMA Trend",
      strategyNameEn: "EMA Trend",
      currentSignal: "FLAT",
      activeSide: "LONG",
      netProfitPct: 0,
      outOfSampleReturnPct: 0,
      isRobustOos: false,
    },
    {
      timeframe: "1d",
      bestStrategyId: "ema_cross",
      strategyNameTr: "EMA Trend",
      strategyNameEn: "EMA Trend",
      currentSignal: "FLAT",
      activeSide: "LONG",
      netProfitPct: 0,
      outOfSampleReturnPct: 0,
      isRobustOos: false,
    },
  ]);

  // 12-Coin Alpha & Futures Radar State (clean skeleton until live /api/market resolves)
  const [radarRows, setRadarRows] = useState<CoinRadarRow[]>([]);
  const [radarFilter, setRadarFilter] = useState<"all" | "active" | "high_wr">("all");
  const [isScanningRadar, setIsScanningRadar] = useState<boolean>(true);

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
        setRadarRows((prev) => (prev.length > 0 ? prev : buildInitialRadar()));
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
        ? `Sıfır-Sızıntılı Kör OOS: İlk %70 eğitimde ${testedCount} kombinasyon yarıştı → Kazanan: ${best.nameTr} | Görünmemiş %30 OOS: ${best.outOfSampleReturnPct >= 0 ? "+" : ""}${best.outOfSampleReturnPct}%`
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
    <div className="w-full bg-[#080B10] text-slate-100">
      <TerminalCockpitView
        lang={lang}
        isPaid={isPaid}
        consumedFreeOpt={freeOptUsed}
        symbol={symbol}
        timeframe={timeframe}
        directionMode={directionMode}
        setDirectionMode={setDirectionMode}
        candles={candles}
        feedSource={feedSource}
        isLoadingFeed={isLoadingFeed}
        derivativesPulse={derivativesPulse}
        mtfEntries={mtfEntries}
        radarRows={radarRows}
        filteredRadar={filteredRadar}
        radarFilter={radarFilter}
        setRadarFilter={setRadarFilter}
        isScanningRadar={isScanningRadar}
        onRefreshRadar={() => void refreshAlphaRadar(timeframe, directionMode)}
        onSelectAsset={handleSelectAsset}
        onSelectTimeframe={handleSelectTimeframe}
        onAutoOptimize={handleAutoOptimize}
        optMessage={optMessage}
        tournament={tournament}
        activeResult={activeResult}
        activeStrategyId={activeStrategyId}
        onSelectStrategy={(id) => {
          setSelectedStrategyId(id);
          setHasPickedStrategyManually(true);
        }}
        capital={capital}
        setCapital={setCapital}
        stopLossPct={stopLossPct}
        setStopLossPct={setStopLossPct}
        takeProfitPct={takeProfitPct}
        setTakeProfitPct={setTakeProfitPct}
        leverage={leverage}
        setLeverage={setLeverage}
        fastPeriod={fastPeriod}
        setFastPeriod={setFastPeriod}
        slowPeriod={slowPeriod}
        setSlowPeriod={setSlowPeriod}
        ticketEntry={ticketEntry}
        ticketSide={ticketSide}
        ticketNotional={ticketNotional}
        ticketUnits={ticketUnits}
        ticketRiskUsd={ticketRiskUsd}
        ticketRewardUsd={ticketRewardUsd}
        copiedTicket={copiedTicket}
        onCopyTicket={(planText) => {
          if (typeof navigator !== "undefined") {
            void navigator.clipboard.writeText(planText);
            setCopiedTicket(true);
            setTimeout(() => setCopiedTicket(false), 1800);
          }
        }}
        onDispatchAlert={() => void handleDispatchAlert()}
        isSendingAlert={isSendingAlert}
        onExportTradesCsv={handleExportTradesCsv}
        alertChannel={alertChannel}
        onChangeAlertChannel={(ch) => setAlertChannelDraft(ch)}
        alertWebhookUrl={alertWebhookUrl}
        onChangeWebhookUrl={(v) => setAlertWebhookDraft(v)}
        telegramBotToken={telegramBotToken}
        onChangeTelegramToken={(v) => setTelegramTokenDraft(v)}
        telegramChatId={telegramChatId}
        onChangeTelegramChatId={(v) => setTelegramChatDraft(v)}
        sentinelSymbols={sentinelSymbols}
        onToggleSentinelSymbol={(sym, label, proOnly) => {
          if (proOnly && !isPaid) {
            triggerUpgrade(
              lang === "tr"
                ? `${label} bulut takibi Pro lisansla açılır.`
                : `${label} cloud alerts require Pro license.`
            );
            return;
          }
          const activeWatch = sentinelSymbols.includes(sym);
          const nextList = activeWatch
            ? sentinelSymbols.filter((s) => s !== sym)
            : [...sentinelSymbols, sym];
          setSentinelSymbolsDraft(nextList.length > 0 ? nextList : [sym]);
        }}
        sentinelCloudActive={sentinelCloudActive}
        onSaveCloudSentinel={(activeOverride) => void handleSaveCloudSentinel(activeOverride)}
        isSyncingCloud={isSyncingCloud}
        sentinelTriggerUrl={storedProfile?.sentinelTriggerUrl}
        onTriggerCloudScan={() => void handleTriggerCloudSentinelNow()}
        isRunningCloudScan={isRunningCloudScan}
        copiedCronUrl={copiedCronUrl}
        onCopyCronUrl={(url) => {
          if (typeof window !== "undefined") {
            const fullCronUrl = `${window.location.origin}${url}`;
            void navigator.clipboard.writeText(fullCronUrl);
            setCopiedCronUrl(true);
            setTimeout(() => setCopiedCronUrl(false), 2000);
            showToast(
              lang === "tr"
                ? "Kişisel 7/24 Cron URL kopyalandı! cron-job.org vb. ile 5dk tetikleyebilirsin."
                : "Personal 24/7 Cron URL copied! Trigger it every 5m on cron-job.org."
            );
          }
        }}
        sentinelEnabled={sentinelEnabled}
        onToggleLocalSentinel={() => setSentinelEnabled((prev) => !prev)}
        lastSentinelScan={lastSentinelScan}
        alertStatus={alertStatus}
        onOpenUpgrade={triggerUpgrade}
        formatPrice={formatPrice}
        formatUsd={formatUsd}
        formatCompactUsd={formatCompactUsd}
        formatShortDate={formatShortDate}
      />

      {/* DARK OBSIDIAN QUANT AUTH & POLAR UPGRADE MODAL */}
      {/* Auth & Pro Upgrade Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-white/[0.1] bg-[#0D1118] p-5 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/[0.07] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
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
                className="rounded p-1 text-slate-400 hover:bg-white/[0.06] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {upgradeReason && (
              <p className="mt-3 rounded border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                {upgradeReason}
              </p>
            )}

            <div className="mt-3 grid grid-cols-3 rounded border border-white/[0.08] bg-[#080B10] p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("signup");
                  setAuthError(null);
                }}
                className={`rounded-xs py-1.5 transition cursor-pointer ${
                  authTab === "signup"
                    ? "bg-white/[0.12] text-white"
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
                className={`rounded-xs py-1.5 transition cursor-pointer ${
                  authTab === "login"
                    ? "bg-white/[0.12] text-white"
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
                className={`rounded-xs py-1.5 transition cursor-pointer ${
                  authTab === "key"
                    ? "bg-white/[0.12] text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {lang === "tr" ? "Lisans Anahtarı" : "License Key"}
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="mt-3.5 space-y-3">
              {authTab === "signup" && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-300">
                    {lang === "tr" ? "Ad Soyad" : "Full Name"}
                  </label>
                  <input
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="mt-1 w-full rounded border border-white/[0.1] bg-[#080B10] px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              )}

              {(authTab === "signup" || authTab === "login") && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300">
                      {lang === "tr" ? "E-posta Adresi" : "Email Address"}
                    </label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="trader@domain.com"
                      className="mt-1 w-full rounded border border-white/[0.1] bg-[#080B10] px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300">
                      {lang === "tr" ? "Şifre (en az 6 karakter)" : "Password (min. 6 chars)"}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 w-full rounded border border-white/[0.1] bg-[#080B10] px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {authTab === "key" && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-300">
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
                    className="mono-nums mt-1 w-full rounded border border-white/[0.1] bg-[#080B10] px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              )}

              {authError && <p className="text-xs font-medium text-rose-400">{authError}</p>}

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full rounded bg-emerald-400 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60 cursor-pointer"
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

            <div className="mt-4 border-t border-white/[0.08] pt-3.5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {lang === "tr"
                  ? "Veya Tüm 12 Parite, 15m/1D & Sınırsız Auto-Optimize'ı Aç"
                  : "Or Unlock All 12 Pairs, 15m/1D & Unlimited Sweeps"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={passCheckoutHref}
                  className="flex flex-col rounded border border-white/[0.1] bg-[#080B10] p-3 transition hover:border-white/[0.25]"
                >
                  <span className="text-[11px] font-semibold text-slate-300">
                    {lang === "tr" ? "7 Günlük Quant Pass" : "7-Day Quant Pass"}
                  </span>
                  <span className="mono-nums mt-0.5 text-lg font-extrabold text-white">$12</span>
                  <span className="text-[10px] text-slate-400">
                    {lang === "tr" ? "Tek seferlik · Yenileme yok" : "One-time · No renewal"}
                  </span>
                </a>
                <a
                  href={proCheckoutHref}
                  className="flex flex-col rounded border border-emerald-500/60 bg-emerald-500/10 p-3 transition hover:bg-emerald-500/15"
                >
                  <span className="text-[11px] font-semibold text-emerald-300">
                    {lang === "tr" ? "Yıllık Quant Pro" : "Annual Quant Pro"}
                  </span>
                  <span className="mono-nums mt-0.5 text-lg font-extrabold text-white">$29/yr</span>
                  <span className="text-[10px] text-emerald-200/90">
                    {lang === "tr" ? "365 gün tam erişim" : "Full year · Unlimited sweeps"}
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Dashboard Modal */}
      {showAccountModal && accountTier.isLoggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-white/[0.1] bg-[#0D1118] p-5 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/[0.07] pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded ${
                    isPaid
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-cyan-500/15 text-cyan-400"
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {storedProfile?.customerName || "VaultSheet Quant Account"}
                  </h3>
                  <p
                    className={`text-[11px] font-semibold ${
                      isPaid ? "text-emerald-400" : "text-cyan-400"
                    }`}
                  >
                    {accountTier.planName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-white/[0.06] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-2 rounded border border-white/[0.08] bg-[#080B10] p-3.5 text-xs">
              {storedProfile?.customerEmail && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">
                    {lang === "tr" ? "E-posta:" : "Email:"}
                  </span>
                  <span className="font-semibold text-white">
                    {storedProfile.customerEmail}
                  </span>
                </div>
              )}

              {isPaid ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">
                      {lang === "tr" ? "Lisans Anahtarı:" : "License Key:"}
                    </span>
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
                          className="rounded border border-white/[0.1] bg-[#121822] p-1 text-slate-300 hover:text-white cursor-pointer"
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
                    <span className="text-slate-400">
                      {lang === "tr" ? "Geçerlilik:" : "Valid Until:"}
                    </span>
                    <span className="mono-nums font-semibold text-white">
                      {formatExpiryShort(storedProfile?.expiresAt)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">
                    {lang === "tr" ? "Erişim:" : "Access Tier:"}
                  </span>
                  <span className="font-semibold text-white">
                    {lang === "tr"
                      ? "5 Ana Parite · 1.000 Mum · 1 Ücretsiz OOS Tarama"
                      : "5 Core Pairs · 1,000 Bars · 1 Free OOS Sweep"}
                  </span>
                </div>
              )}
            </div>

            {!isPaid && (
              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <a
                  href={passCheckoutHref}
                  className="flex flex-col rounded border border-white/[0.1] bg-[#080B10] p-3 transition hover:border-white/[0.25]"
                >
                  <span className="text-[11px] font-semibold text-slate-300">
                    {lang === "tr" ? "7 Günlük Pass" : "7-Day Pass"}
                  </span>
                  <span className="mono-nums mt-0.5 text-lg font-bold text-white">$12</span>
                  <span className="text-[10px] text-slate-400">
                    {lang === "tr" ? "12 parite + 15m/1D" : "12 pairs + 15m/1D"}
                  </span>
                </a>
                <a
                  href={proCheckoutHref}
                  className="flex flex-col rounded border border-emerald-500/60 bg-emerald-500/10 p-3 transition hover:bg-emerald-500/15"
                >
                  <span className="text-[11px] font-semibold text-emerald-300">
                    {lang === "tr" ? "Yıllık Pro" : "Annual Pro"}
                  </span>
                  <span className="mono-nums mt-0.5 text-lg font-bold text-white">$29/yr</span>
                  <span className="text-[10px] text-emerald-200/90">
                    {lang === "tr" ? "365 gün limitsiz" : "365 days unlimited"}
                  </span>
                </a>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3.5">
              <a
                href={storedProfile?.portalUrl || "https://polar.sh/vaultsheet/portal"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-white/[0.1] bg-[#121822] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                {lang === "tr" ? "Fatura Portalı" : "Billing Portal"}
              </a>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 cursor-pointer"
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
        <div className="fixed bottom-4 right-4 z-50 rounded border border-white/[0.12] bg-[#121822] px-3.5 py-2.5 text-xs font-semibold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
