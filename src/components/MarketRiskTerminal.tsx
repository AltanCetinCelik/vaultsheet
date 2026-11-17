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
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  Lock,
  LogOut,
  Radar,
  RefreshCw,
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
  buildCoinRadarRow,
  generateFallbackCandles,
  optimizeStrategyConfig,
  runStrategyBacktest,
  runStrategyTournament,
  type BacktestResult,
  type CoinRadarRow,
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
  { symbol: "DOGEUSDT", label: "DOGE", proOnly: true },
  { symbol: "AVAXUSDT", label: "AVAX", proOnly: true },
  { symbol: "SUIUSDT", label: "SUI", proOnly: true },
  { symbol: "LINKUSDT", label: "LINK", proOnly: true },
  { symbol: "ADAUSDT", label: "ADA", proOnly: true },
  { symbol: "ARBUSDT", label: "ARB", proOnly: true },
];

const RADAR_SYMBOLS_QUERY = encodeURIComponent(
  JSON.stringify(ASSETS.map((a) => a.symbol))
);

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
  return ASSETS.map((a) => {
    const c = generateFallbackCandles(a.symbol, "4h", 160);
    const first = c[0]?.close ?? 1;
    const last = c[c.length - 1]?.close ?? 1;
    const chg = Math.round(((last - first) / first) * 10000) / 100;
    return buildCoinRadarRow(a.symbol, a.label, c, chg, a.proOnly);
  });
}

interface Binance24hDto {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
}

export default function MarketRiskTerminal({
  lang,
  isPaid: isPaidProp,
  onRequireUpgrade,
}: MarketRiskTerminalProps) {
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [timeframe, setTimeframe] = useState<TimeframeId>("4h");
  const [candles, setCandles] = useState<OHLCVCandle[]>(() =>
    generateFallbackCandles("BTCUSDT", "4h", 300)
  );
  const [feedMode, setFeedMode] = useState<"live" | "simulated">("simulated");
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(false);

  // 12-Coin Alpha Radar State
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

  // Refresh live 24h prices & scan all 12 assets cleanly
  const refreshAlphaRadar = useCallback(async (tf: TimeframeId) => {
    setIsScanningRadar(true);
    try {
      const tickerRes = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=${RADAR_SYMBOLS_QUERY}`,
        { cache: "no-store" }
      );
      if (!tickerRes.ok) throw new Error(`HTTP ${tickerRes.status}`);
      const dtoList = (await tickerRes.json()) as Binance24hDto[];
      const priceMap = new Map<string, { price: number; chg: number }>();
      for (const item of dtoList) {
        priceMap.set(item.symbol, {
          price: Number.parseFloat(item.lastPrice),
          chg: Number.parseFloat(item.priceChangePercent),
        });
      }

      // Fetch real klines in parallel for top 5 visible radar assets, anchored fallback for remaining
      const nextRows = await Promise.all(
        ASSETS.map(async (asset, idx) => {
          const live24 = priceMap.get(asset.symbol);
          let series: OHLCVCandle[] | null = null;
          if (idx < 5) {
            try {
              const kRes = await fetch(
                `https://api.binance.com/api/v3/klines?symbol=${asset.symbol}&interval=${tf}&limit=160`,
                { cache: "no-store" }
              );
              if (kRes.ok) {
                const raw = (await kRes.json()) as unknown[][];
                if (Array.isArray(raw) && raw.length >= 60) {
                  series = raw.map((row) => ({
                    time: Number(row[0]),
                    open: Number.parseFloat(String(row[1])),
                    high: Number.parseFloat(String(row[2])),
                    low: Number.parseFloat(String(row[3])),
                    close: Number.parseFloat(String(row[4])),
                    volume: Number.parseFloat(String(row[5])),
                  }));
                }
              }
            } catch {
              // fallback below
            }
          }

          if (!series) {
            const fb = generateFallbackCandles(asset.symbol, tf, 160);
            if (live24 && Number.isFinite(live24.price) && live24.price > 0) {
              const lastClose = fb[fb.length - 1]?.close || 1;
              const scale = live24.price / lastClose;
              series = fb.map((bar) => ({
                ...bar,
                open: bar.open * scale,
                high: bar.high * scale,
                low: bar.low * scale,
                close: bar.close * scale,
              }));
            } else {
              series = fb;
            }
          }

          const chg = live24?.chg ?? 0;
          return buildCoinRadarRow(asset.symbol, asset.label, series, chg, asset.proOnly);
        })
      );

      setRadarRows(nextRows);
    } catch {
      // keep existing deterministic radar rows
    } finally {
      setIsScanningRadar(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!active) return;
      await Promise.all([loadCandles(symbol, timeframe), refreshAlphaRadar(timeframe)]);
    };
    void init();
    return () => {
      active = false;
    };
  }, [symbol, timeframe, loadCandles, refreshAlphaRadar]);

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
      triggerUpgrade(
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

  const lastClose = candles[candles.length - 1]?.close ?? 0;
  const ticketEntry = activeResult.activeEntryPrice ?? lastClose;
  const ticketNotional = capital * leverage;
  const ticketUnits = ticketEntry > 0 ? ticketNotional / ticketEntry : 0;
  const ticketRiskUsd = Math.round(ticketNotional * (stopLossPct / 100));
  const ticketRewardUsd = Math.round(ticketNotional * (takeProfitPct / 100));

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
      {/* 1. LIVE 12-COIN ALPHA SCANNER STRIP */}
      <div className="border-b border-slate-800/90 bg-[#0B1120] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white sm:text-sm">
              {lang === "tr"
                ? `Canlı 12 Parite Alpha Tarayıcısı (${timeframe.toUpperCase()})`
                : `Live 12-Asset Alpha Scanner (${timeframe.toUpperCase()})`}
            </h2>
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
              {radarRows.filter((r) => r.currentSignal !== "FLAT").length}{" "}
              {lang === "tr" ? "Aktif Sinyal" : "Active Signals"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: lang === "tr" ? "Tümü (En Kârlı)" : "All (Top PnL)" },
              { id: "active", label: lang === "tr" ? "Sadece Aktif AL" : "Active Signals Only" },
              { id: "high_wr", label: lang === "tr" ? "En Yüksek Win %" : "Highest Win Rate" },
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
              onClick={() => void refreshAlphaRadar(timeframe)}
              disabled={isScanningRadar}
              className="ml-1 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isScanningRadar ? "animate-spin" : ""}`} />
              <span>{lang === "tr" ? "Tara" : "Scan"}</span>
            </button>
          </div>
        </div>

        {/* Horizontal 12-Card Scanner Strip */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {filteredRadar.slice(0, 6).map((row) => {
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
                    className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                      row.currentSignal === "ENTRY_NOW"
                        ? "bg-emerald-400 text-slate-950"
                        : row.currentSignal === "LONG"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {row.currentSignal === "ENTRY_NOW"
                      ? lang === "tr"
                        ? "YENİ AL"
                        : "BUY NOW"
                      : row.currentSignal === "LONG"
                        ? "LONG"
                        : lang === "tr"
                          ? "BEKLE"
                          : "FLAT"}
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
                  <span className="truncate max-w-[90px]">
                    {lang === "tr" ? row.bestStrategyNameTr : row.bestStrategyNameEn}
                  </span>
                  <span className="mono-nums font-semibold text-slate-300">
                    {row.winRatePct}%W
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Terminal Content */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Top Asset Pill Row + Timeframe + Auto-Optimizer */}
        <div className="flex flex-col gap-3 border-b border-slate-800/90 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {ASSETS.map((a) => {
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
              <span>
                {feedMode === "live"
                  ? lang === "tr"
                    ? "Canlı Akış"
                    : "Live Feed"
                  : lang === "tr"
                    ? "Örnek Mumlar"
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
                ? `işlem · ${leverage}x Kaldıraç`
                : `trades · ${leverage}x Lev`}
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

        {/* Main 12-Column Interactive Stage */}
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Left 8 Cols: Interactive Candlestick Chart + Equity Curve */}
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

            {/* Live Order & Position Sizing Ticket */}
            <div className="rounded-xl border border-emerald-500/30 bg-[#050811] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                  <Target className="h-3.5 w-3.5 text-emerald-400" />
                  {lang === "tr" ? "Canlı Emir & Kasa Planı" : "Actionable Order Ticket"}
                </span>
                <span className="mono-nums text-[10px] font-bold text-slate-400">
                  {symbol} · {leverage}x
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

              <button
                type="button"
                onClick={() => {
                  const planText = `${symbol} (${timeframe.toUpperCase()}) | Strategy: ${activeResult.nameEn}\nSignal: ${activeResult.currentSignal} | Leverage: ${leverage}x\nEntry: ${formatPrice(ticketEntry)} | Size: ${ticketUnits.toFixed(4)} (${formatUsd(ticketNotional)})\nStop-Loss (-${stopLossPct}%): ${formatPrice(activeResult.suggestedStopPrice)} (-${formatUsd(ticketRiskUsd)})\nTake-Profit (+${takeProfitPct}%): ${formatPrice(activeResult.suggestedTargetPrice)} (+${formatUsd(ticketRewardUsd)})`;
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
