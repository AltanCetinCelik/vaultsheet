import {
  assessDerivativesSqueeze,
  buildCoinRadarRow,
  buildFallbackDerivativesPulse,
  generateFallbackCandles,
  optimizeStrategyConfig,
  type CoinRadarRow,
  type DerivativesPulse,
  type OHLCVCandle,
  type SignalState,
  type StrategyId,
  type TimeframeId,
  type TradeDirectionMode,
} from "@/lib/quantBacktester";

export interface QuantAssetSpec {
  symbol: string;
  label: string;
  proOnly?: boolean;
}

export const QUANT_ASSETS: QuantAssetSpec[] = [
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

export type MarketDataSource =
  | "binance_vision"
  | "binance_spot"
  | "bybit_linear"
  | "simulated";

export interface MtfConfluenceEntry {
  timeframe: TimeframeId;
  bestStrategyId: StrategyId;
  strategyNameTr: string;
  strategyNameEn: string;
  currentSignal: SignalState;
  activeSide: "LONG" | "SHORT";
  netProfitPct: number;
  outOfSampleReturnPct: number;
  isRobustOos: boolean;
}

const BYBIT_INTERVAL: Record<TimeframeId, string> = {
  "15m": "15",
  "1h": "60",
  "4h": "240",
  "1d": "D",
};

const BYBIT_RATIO_PERIOD: Record<TimeframeId, string> = {
  "15m": "15min",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

function parseBinanceKlines(raw: unknown[][]): OHLCVCandle[] {
  return raw.map((row) => ({
    time: Number(row[0]),
    open: Number.parseFloat(String(row[1])),
    high: Number.parseFloat(String(row[2])),
    low: Number.parseFloat(String(row[3])),
    close: Number.parseFloat(String(row[4])),
    volume: Number.parseFloat(String(row[5])),
  }));
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 6000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "VaultSheet-Quant/2.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchCandlesWithFallback(
  symbol: string,
  timeframe: TimeframeId,
  limit = 1000
): Promise<{ candles: OHLCVCandle[]; source: MarketDataSource }> {
  const sym = symbol.toUpperCase();
  const cappedLimit = Math.max(100, Math.min(1000, limit));

  // 1. Binance Vision CDN (unblocked globally, fast 1000 bars)
  const visionRaw = await fetchJsonWithTimeout<unknown[][]>(
    `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(timeframe)}&limit=${cappedLimit}`,
    6000
  );
  if (Array.isArray(visionRaw) && visionRaw.length >= 60) {
    return { candles: parseBinanceKlines(visionRaw), source: "binance_vision" };
  }

  // 2. Binance Spot Primary
  const spotRaw = await fetchJsonWithTimeout<unknown[][]>(
    `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(timeframe)}&limit=${cappedLimit}`,
    5500
  );
  if (Array.isArray(spotRaw) && spotRaw.length >= 60) {
    return { candles: parseBinanceKlines(spotRaw), source: "binance_spot" };
  }

  // 3. Bybit v5 Linear Perpetual Fallback (newest-first -> reverse chronologically)
  const bybitJson = await fetchJsonWithTimeout<{
    retCode?: number;
    result?: { list?: string[][] };
  }>(
    `https://api.bybit.com/v5/market/kline?category=linear&symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(BYBIT_INTERVAL[timeframe])}&limit=${cappedLimit}`,
    6000
  );
  const bybitList = bybitJson?.result?.list;
  if (Array.isArray(bybitList) && bybitList.length >= 60) {
    const parsed = [...bybitList].reverse().map((row) => ({
      time: Number(row[0]),
      open: Number.parseFloat(String(row[1])),
      high: Number.parseFloat(String(row[2])),
      low: Number.parseFloat(String(row[3])),
      close: Number.parseFloat(String(row[4])),
      volume: Number.parseFloat(String(row[5])),
    }));
    return { candles: parsed, source: "bybit_linear" };
  }

  // 4. Deterministic fallback if network completely unreachable
  return {
    candles: generateFallbackCandles(sym, timeframe, cappedLimit),
    source: "simulated",
  };
}

export async function fetchDerivativesPulseWithFallback(
  symbol: string,
  timeframe: TimeframeId,
  candles: OHLCVCandle[],
  currentSignal: SignalState = "FLAT"
): Promise<{
  pulse: DerivativesPulse;
  source: "binance_fapi" | "bybit_linear" | "gate_perp" | "simulated";
}> {
  const sym = symbol.toUpperCase();
  const fb = buildFallbackDerivativesPulse(sym, candles, currentSignal);

  const gateContract = sym.replace(/USDT$/, "_USDT");

  // Run Binance fapi & Gate.io Global Perpetuals in parallel -> 0ms failover delay regardless of server region
  const [prem, oi, whaleList, takerList, gateTickers, gateStats] = await Promise.all([
    fetchJsonWithTimeout<{
      markPrice: string;
      indexPrice: string;
      lastFundingRate: string;
    }>(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(sym)}`, 2500),
    fetchJsonWithTimeout<{ openInterest: string }>(
      `https://fapi.binance.com/fapi/v1/openInterest?symbol=${encodeURIComponent(sym)}`,
      2500
    ),
    fetchJsonWithTimeout<
      { longAccount: string; shortAccount: string; longShortRatio: string }[]
    >(
      `https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${encodeURIComponent(sym)}&period=${encodeURIComponent(timeframe)}&limit=1`,
      2500
    ),
    fetchJsonWithTimeout<{ buySellRatio: string }[]>(
      `https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${encodeURIComponent(sym)}&period=${encodeURIComponent(timeframe)}&limit=1`,
      2500
    ),
    fetchJsonWithTimeout<
      {
        mark_price: string;
        index_price: string;
        funding_rate: string;
      }[]
    >(
      `https://api.gateio.ws/api/v4/futures/usdt/tickers?contract=${encodeURIComponent(gateContract)}`,
      4500
    ),
    fetchJsonWithTimeout<
      {
        mark_price: number;
        open_interest_usd: number;
        top_long_size: number;
        top_short_size: number;
        lsr_taker: number;
        last_funding_rate: string;
      }[]
    >(
      `https://api.gateio.ws/api/v4/futures/usdt/contract_stats?contract=${encodeURIComponent(gateContract)}&interval=${encodeURIComponent(timeframe)}&limit=1`,
      4500
    ),
  ]);

  if (prem && prem.markPrice && oi && oi.openInterest) {
    const markPrice = Number.parseFloat(prem.markPrice) || fb.markPrice;
    const indexPrice = Number.parseFloat(prem.indexPrice) || fb.indexPrice;
    const fundingRatePct =
      Math.round((Number.parseFloat(prem.lastFundingRate) || 0) * 100 * 10000) / 10000;
    const basisPct =
      indexPrice > 0
        ? Math.round(((markPrice - indexPrice) / indexPrice) * 100 * 10000) / 10000
        : 0;
    const openInterestUsd = Math.round(
      (Number.parseFloat(oi.openInterest) || 0) * markPrice
    );

    const whaleTop = Array.isArray(whaleList) ? whaleList[0] : undefined;
    const whaleLongPct = whaleTop
      ? Math.round(Number.parseFloat(whaleTop.longAccount) * 1000) / 10
      : fb.whaleLongPct;
    const whaleShortPct = Math.round((100 - whaleLongPct) * 10) / 10;
    const whaleRatio = whaleTop
      ? Math.round(Number.parseFloat(whaleTop.longShortRatio) * 100) / 100
      : fb.whaleRatio;
    const takerBuySellRatio =
      Array.isArray(takerList) && takerList[0]
        ? Math.round(Number.parseFloat(takerList[0].buySellRatio) * 100) / 100
        : fb.takerBuySellRatio;

    const squeeze = assessDerivativesSqueeze(
      fundingRatePct,
      whaleLongPct,
      takerBuySellRatio,
      currentSignal
    );

    return {
      source: "binance_fapi",
      pulse: {
        symbol: sym,
        fundingRatePct,
        markPrice,
        indexPrice,
        basisPct,
        openInterestUsd,
        whaleLongPct,
        whaleShortPct,
        whaleRatio,
        takerBuySellRatio,
        ...squeeze,
        isLiveDerivatives: true,
      },
    };
  }

  // Secondary: Gate.io Global USDT Perpetuals (Zero US-East geo-block, includes OI USD, Top Whale L/S & Taker ratio)

  const gT = Array.isArray(gateTickers) ? gateTickers[0] : undefined;
  const gS = Array.isArray(gateStats) ? gateStats[0] : undefined;
  if (gT?.mark_price || gS?.mark_price) {
    const markPrice = Number.parseFloat(String(gT?.mark_price ?? gS?.mark_price ?? fb.markPrice));
    const indexPrice = Number.parseFloat(String(gT?.index_price ?? markPrice));
    const rawFund = Number.parseFloat(String(gT?.funding_rate ?? gS?.last_funding_rate ?? 0));
    const fundingRatePct = Math.round(rawFund * 100 * 10000) / 10000;
    const basisPct =
      indexPrice > 0
        ? Math.round(((markPrice - indexPrice) / indexPrice) * 100 * 10000) / 10000
        : 0;
    const openInterestUsd = Math.round(Number(gS?.open_interest_usd) || fb.openInterestUsd);

    const topLong = Number(gS?.top_long_size) || 0;
    const topShort = Number(gS?.top_short_size) || 0;
    const whaleLongPct =
      topLong + topShort > 0
        ? Math.round((topLong / (topLong + topShort)) * 1000) / 10
        : fb.whaleLongPct;
    const whaleShortPct = Math.round((100 - whaleLongPct) * 10) / 10;
    const whaleRatio = Math.round((whaleLongPct / Math.max(5, whaleShortPct)) * 100) / 100;
    const rawTaker = Number(gS?.lsr_taker);
    const takerBuySellRatio =
      Number.isFinite(rawTaker) && rawTaker > 0
        ? Math.round(rawTaker * 100) / 100
        : fb.takerBuySellRatio;

    const squeeze = assessDerivativesSqueeze(
      fundingRatePct,
      whaleLongPct,
      takerBuySellRatio,
      currentSignal
    );

    return {
      source: "gate_perp",
      pulse: {
        symbol: sym,
        fundingRatePct,
        markPrice,
        indexPrice,
        basisPct,
        openInterestUsd,
        whaleLongPct,
        whaleShortPct,
        whaleRatio,
        takerBuySellRatio,
        ...squeeze,
        isLiveDerivatives: true,
      },
    };
  }

  // 3. Fallback: Bybit v5 Linear Perpetual Tickers & Account Long/Short Ratio
  const [bybitTicker, bybitRatio] = await Promise.all([
    fetchJsonWithTimeout<{
      result?: {
        list?: {
          markPrice: string;
          indexPrice: string;
          fundingRate: string;
          openInterestValue: string;
        }[];
      };
    }>(
      `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${encodeURIComponent(sym)}`,
      4500
    ),
    fetchJsonWithTimeout<{
      result?: { list?: { buyRatio: string; sellRatio: string }[] };
    }>(
      `https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=${encodeURIComponent(sym)}&period=${encodeURIComponent(BYBIT_RATIO_PERIOD[timeframe])}&limit=1`,
      4500
    ),
  ]);

  const bItem = bybitTicker?.result?.list?.[0];
  if (bItem?.markPrice) {
    const markPrice = Number.parseFloat(bItem.markPrice) || fb.markPrice;
    const indexPrice = Number.parseFloat(bItem.indexPrice) || fb.indexPrice;
    const fundingRatePct =
      Math.round((Number.parseFloat(bItem.fundingRate) || 0) * 100 * 10000) / 10000;
    const basisPct =
      indexPrice > 0
        ? Math.round(((markPrice - indexPrice) / indexPrice) * 100 * 10000) / 10000
        : 0;
    const openInterestUsd = Math.round(
      Number.parseFloat(bItem.openInterestValue) || fb.openInterestUsd
    );

    const rItem = bybitRatio?.result?.list?.[0];
    const whaleLongPct = rItem
      ? Math.round(Number.parseFloat(rItem.buyRatio) * 1000) / 10
      : fb.whaleLongPct;
    const whaleShortPct = Math.round((100 - whaleLongPct) * 10) / 10;
    const whaleRatio = Math.round((whaleLongPct / Math.max(5, whaleShortPct)) * 100) / 100;

    const squeeze = assessDerivativesSqueeze(
      fundingRatePct,
      whaleLongPct,
      fb.takerBuySellRatio,
      currentSignal
    );

    return {
      source: "bybit_linear",
      pulse: {
        symbol: sym,
        fundingRatePct,
        markPrice,
        indexPrice,
        basisPct,
        openInterestUsd,
        whaleLongPct,
        whaleShortPct,
        whaleRatio,
        takerBuySellRatio: fb.takerBuySellRatio,
        ...squeeze,
        isLiveDerivatives: true,
      },
    };
  }

  return { source: "simulated", pulse: fb };
}

export async function fetchRadarSnapshotServer(
  timeframe: TimeframeId,
  direction: TradeDirectionMode
): Promise<{ rows: CoinRadarRow[]; source: MarketDataSource }> {
  const symbolsParam = encodeURIComponent(JSON.stringify(QUANT_ASSETS.map((a) => a.symbol)));

  const [visionTickers, fapiPrem, gateTickers, bybitTickers] = await Promise.all([
    fetchJsonWithTimeout<{ symbol: string; lastPrice: string; priceChangePercent: string }[]>(
      `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${symbolsParam}`,
      5000
    ),
    fetchJsonWithTimeout<{ symbol: string; lastFundingRate: string }[]>(
      `https://fapi.binance.com/fapi/v1/premiumIndex`,
      4000
    ),
    fetchJsonWithTimeout<{ contract: string; funding_rate: string; change_percentage: string }[]>(
      `https://api.gateio.ws/api/v4/futures/usdt/tickers`,
      4500
    ),
    fetchJsonWithTimeout<{
      result?: { list?: { symbol: string; price24hPcnt: string; fundingRate: string }[] };
    }>(`https://api.bybit.com/v5/market/tickers?category=linear`, 4000),
  ]);

  const changeMap = new Map<string, number>();
  if (Array.isArray(visionTickers)) {
    for (const t of visionTickers) {
      changeMap.set(t.symbol, Number.parseFloat(t.priceChangePercent) || 0);
    }
  }

  const fundingMap = new Map<string, number>();
  if (Array.isArray(fapiPrem)) {
    for (const p of fapiPrem) {
      fundingMap.set(
        p.symbol,
        Math.round((Number.parseFloat(p.lastFundingRate) || 0) * 100 * 10000) / 10000
      );
    }
  }
  if (Array.isArray(gateTickers)) {
    for (const g of gateTickers) {
      if (!g.contract?.endsWith("_USDT")) continue;
      const sym = g.contract.replace(/_USDT$/, "USDT");
      if (!fundingMap.has(sym)) {
        fundingMap.set(
          sym,
          Math.round((Number.parseFloat(g.funding_rate) || 0) * 100 * 10000) / 10000
        );
      }
      if (!changeMap.has(sym) && g.change_percentage) {
        changeMap.set(sym, Number.parseFloat(g.change_percentage) || 0);
      }
    }
  }
  const bybitList = bybitTickers?.result?.list;
  if (Array.isArray(bybitList)) {
    for (const b of bybitList) {
      if (!changeMap.has(b.symbol)) {
        changeMap.set(b.symbol, Math.round((Number.parseFloat(b.price24hPcnt) || 0) * 10000) / 100);
      }
      if (!fundingMap.has(b.symbol)) {
        fundingMap.set(
          b.symbol,
          Math.round((Number.parseFloat(b.fundingRate) || 0) * 100 * 10000) / 10000
        );
      }
    }
  }

  let primarySource: MarketDataSource = "simulated";

  const rows = await Promise.all(
    QUANT_ASSETS.map(async (asset) => {
      const { candles, source } = await fetchCandlesWithFallback(asset.symbol, timeframe, 400);
      if (source !== "simulated" && primarySource === "simulated") {
        primarySource = source;
      }
      const chg = changeMap.get(asset.symbol) ?? 0;
      const fundingPct = fundingMap.get(asset.symbol) ?? 0;
      return buildCoinRadarRow(
        asset.symbol,
        asset.label,
        candles,
        chg,
        asset.proOnly,
        fundingPct,
        direction,
        timeframe
      );
    })
  );

  return { rows, source: primarySource };
}

export async function fetchMtfConfluenceServer(
  symbol: string,
  direction: TradeDirectionMode,
  leverage = 2,
  fundingRatePct = 0
): Promise<MtfConfluenceEntry[]> {
  const tfs: TimeframeId[] = ["15m", "1h", "4h", "1d"];
  const entries = await Promise.all(
    tfs.map(async (tf) => {
      const { candles } = await fetchCandlesWithFallback(symbol, tf, 350);
      const { best } = optimizeStrategyConfig(
        candles,
        10000,
        leverage,
        direction,
        fundingRatePct,
        tf
      );
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
    })
  );
  return entries;
}
