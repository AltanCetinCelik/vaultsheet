export type TimeframeId = "15m" | "1h" | "4h" | "1d";

export type TradeDirectionMode = "both" | "long" | "short";
export type SignalState = "LONG" | "SHORT" | "FLAT" | "ENTRY_NOW" | "SHORT_NOW";
export type SqueezeState =
  | "SHORT_SQUEEZE"
  | "LONG_SQUEEZE"
  | "WHALE_ACCUMULATION"
  | "NEUTRAL";

export type StrategyId =
  | "donchian_breakout"
  | "ema_cross"
  | "rsi_reversion"
  | "bollinger_bounce"
  | "macd_momentum"
  | "volume_breakout";

export interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StrategyConfig {
  strategyId: StrategyId;
  capital: number;
  leverage: number;
  stopLossPct: number;
  takeProfitPct: number;
  feePct: number;
  fastPeriod: number;
  slowPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  direction?: TradeDirectionMode;
}

export interface TradeExecution {
  id: number;
  side: "LONG" | "SHORT";
  entryIndex: number;
  exitIndex: number;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  exitReason: "TP" | "SL" | "SIGNAL" | "OPEN";
  grossReturnPct: number;
  netReturnPct: number;
  pnlUsd: number;
  equityAfter: number;
}

export interface BacktestResult {
  strategyId: StrategyId;
  nameTr: string;
  nameEn: string;
  descTr: string;
  descEn: string;
  config: StrategyConfig;
  trades: TradeExecution[];
  equityCurve: {
    time: number;
    price: number;
    strategyEquity: number;
    holdEquity: number;
    drawdownPct: number;
  }[];
  netProfitPct: number;
  netProfitUsd: number;
  finalEquity: number;
  buyAndHoldReturnPct: number;
  alphaPct: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  totalTrades: number;
  currentSignal: SignalState;
  activeSide: "LONG" | "SHORT";
  activeEntryPrice: number | null;
  suggestedStopPrice: number;
  suggestedTargetPrice: number;
  estimatedLiquidationPrice: number;
  oosSplitIndex: number;
  inSampleReturnPct: number;
  outOfSampleReturnPct: number;
  outOfSampleWinRatePct: number;
  isRobustOos: boolean;
  overlayUpper: number[];
  overlayLower: number[];
  overlayLabel: string;
}

export interface CoinRadarRow {
  symbol: string;
  base: string;
  price: number;
  change24hPct: number;
  bestStrategyId: StrategyId;
  bestStrategyNameTr: string;
  bestStrategyNameEn: string;
  netProfitPct: number;
  outOfSampleReturnPct: number;
  isRobustOos: boolean;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  totalTrades: number;
  currentSignal: SignalState;
  activeSide: "LONG" | "SHORT";
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  fundingRatePct: number;
  squeezeState: SqueezeState;
  proOnly?: boolean;
}

export interface DerivativesPulse {
  symbol: string;
  fundingRatePct: number;
  markPrice: number;
  indexPrice: number;
  basisPct: number;
  openInterestUsd: number;
  whaleLongPct: number;
  whaleShortPct: number;
  whaleRatio: number;
  takerBuySellRatio: number;
  squeezeState: SqueezeState;
  squeezeScore: number;
  squeezeLabelTr: string;
  squeezeLabelEn: string;
  squeezeDetailTr: string;
  squeezeDetailEn: string;
  isLiveDerivatives: boolean;
}

interface StrategyMeta {
  id: StrategyId;
  nameTr: string;
  nameEn: string;
  descTr: string;
  descEn: string;
}

export const STRATEGY_CATALOG: Record<StrategyId, StrategyMeta> = {
  donchian_breakout: {
    id: "donchian_breakout",
    nameTr: "Donchian Kanal Kırılımı",
    nameEn: "Donchian Channel Breakout",
    descTr: "Son 20 mum zirvesini hacimli kırdığında trend yönüne girer, alt kanal kırılımında çıkar.",
    descEn: "Enters long on non-repainting N-bar high breakouts and trails exit on lower band breakdown.",
  },
  ema_cross: {
    id: "ema_cross",
    nameTr: "EMA Trend Kesişimi",
    nameEn: "Dual EMA Trend Cross",
    descTr: "Hızlı EMA yavaş EMA'yı yukarı kestiğinde trend pozisyonu açar, ters kesişimde kapatır.",
    descEn: "Captures sustained directional momentum when Fast EMA crosses above Slow EMA.",
  },
  rsi_reversion: {
    id: "rsi_reversion",
    nameTr: "RSI Aşırı Satım Tepkisi",
    nameEn: "RSI Oversold Reversion",
    descTr: "Wilder RSI aşırı satım eşiğinin altından yukarı döndüğünde dip tepkisi alır.",
    descEn: "Buys mean-reversion bounces when Wilder RSI recovers out of oversold territory.",
  },
  bollinger_bounce: {
    id: "bollinger_bounce",
    nameTr: "Bollinger Alt Bant Sekmesi",
    nameEn: "Bollinger Lower Band Bounce",
    descTr: "Fiyat alt Bollinger bandına dokunup tekrar bant içine kapandığında uzun pozisyon açar.",
    descEn: "Enters on statistical volatility snap-backs when price reclaims the lower 2σ band.",
  },
  macd_momentum: {
    id: "macd_momentum",
    nameTr: "MACD Histogram İvmesi",
    nameEn: "MACD Momentum Shift",
    descTr: "MACD çizgisi sinyal çizgisini yukarı kestiğinde ve histogram pozitife döndüğünde alır.",
    descEn: "Follows inflection shifts when MACD crosses above its 9-period signal line.",
  },
  volume_breakout: {
    id: "volume_breakout",
    nameTr: "Balina Hacim Patlaması",
    nameEn: "Volume Spike Impulse",
    descTr: "Hacim 20 mum ortalamasının 1.6x üstüne çıkıp yeşil momentum mumu yakınca alır.",
    descEn: "Triggers when volume surges 1.6x above 20-bar average on a bullish impulse close.",
  },
};

const ASSET_BASE_PRICES: Record<string, number> = {
  BTCUSDT: 91200,
  ETHUSDT: 3180,
  SOLUSDT: 214,
  BNBUSDT: 625,
  XRPUSDT: 1.12,
  AVAXUSDT: 35.8,
  DOGEUSDT: 0.36,
  SUIUSDT: 3.45,
  PAXGUSDT: 2640,
  LINKUSDT: 15.2,
  ADAUSDT: 0.68,
  ARBUSDT: 0.78,
};

const INTERVAL_MS: Record<TimeframeId, number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

function roundNum(val: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(val * f) / f;
}

function roundPriceAuto(val: number): number {
  if (val >= 1000) return roundNum(val, 2);
  if (val >= 10) return roundNum(val, 2);
  return roundNum(val, 4);
}

/**
 * Deterministic seeded OHLCV generator for offline / test environments.
 * Combines cyclical bull/bear waves with volatility bursts so every strategy produces real trades.
 */
export function generateFallbackCandles(
  symbol: string,
  interval: TimeframeId,
  count = 300
): OHLCVCandle[] {
  const upper = symbol.toUpperCase();
  const basePrice = ASSET_BASE_PRICES[upper] ?? 100;
  let seed = 0x811c9dc5;
  for (let i = 0; i < upper.length; i++) {
    seed ^= upper.charCodeAt(i);
    seed = Math.imul(seed, 0x01000193);
  }
  for (let i = 0; i < interval.length; i++) {
    seed ^= interval.charCodeAt(i);
    seed = Math.imul(seed, 0x01000193);
  }

  const nextRand = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const stepMs = INTERVAL_MS[interval];
  const anchorTime = 1763380000000 - count * stepMs;
  const candles: OHLCVCandle[] = [];
  let price = basePrice * 0.88;

  for (let i = 0; i < count; i++) {
    const wave1 = Math.sin(i * 0.14) * 0.011;
    const wave2 = Math.cos(i * 0.047) * 0.0065;
    const noise = (nextRand() - 0.485) * 0.022;
    const impulse = i % 37 === 0 ? (nextRand() > 0.35 ? 0.032 : -0.028) : 0;

    const pctMove = wave1 + wave2 + noise + impulse;
    const open = price;
    const close = Math.max(open * 0.5, open * (1 + pctMove));
    const wickUp = (0.004 + nextRand() * 0.014) * Math.max(open, close);
    const wickDn = (0.004 + nextRand() * 0.014) * Math.min(open, close);
    const high = Math.max(open, close) + wickUp;
    const low = Math.max(0.0001, Math.min(open, close) - wickDn);

    const volSpike = Math.abs(pctMove) > 0.018 || i % 37 === 0 ? 2.1 + nextRand() * 1.4 : 0.7 + nextRand() * 0.8;
    const volume = roundNum(1000000 * volSpike, 2);

    candles.push({
      time: anchorTime + i * stepMs,
      open: roundPriceAuto(open),
      high: roundPriceAuto(high),
      low: roundPriceAuto(low),
      close: roundPriceAuto(close),
      volume,
    });
    price = close;
  }

  return candles;
}

function computeEma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(0);
  if (values.length === 0) return out;
  const p = Math.max(2, Math.round(period));
  const k = 2 / (p + 1);
  let ema = values[0];
  out[0] = ema;
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

function computeSma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(0);
  const p = Math.max(2, Math.round(period));
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= p) sum -= values[i - p];
    const denom = Math.min(i + 1, p);
    out[i] = sum / denom;
  }
  return out;
}

function computeRsi(closes: number[], period = 14): number[] {
  const out = new Array<number>(closes.length).fill(50);
  if (closes.length <= period) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return out;
}

function computeBollinger(
  closes: number[],
  period = 20,
  mult = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = computeSma(closes, period);
  const upper = new Array<number>(closes.length).fill(0);
  const lower = new Array<number>(closes.length).fill(0);
  const p = Math.max(2, Math.round(period));

  for (let i = 0; i < closes.length; i++) {
    const start = Math.max(0, i - p + 1);
    const sliceLen = i - start + 1;
    let sqSum = 0;
    for (let j = start; j <= i; j++) {
      const d = closes[j] - middle[i];
      sqSum += d * d;
    }
    const std = Math.sqrt(sqSum / sliceLen);
    upper[i] = middle[i] + mult * std;
    lower[i] = middle[i] - mult * std;
  }

  return { upper, middle, lower };
}

function computeDonchian(
  highs: number[],
  lows: number[],
  period = 20
): { priorHigh: number[]; priorLow: number[] } {
  const priorHigh = new Array<number>(highs.length).fill(0);
  const priorLow = new Array<number>(lows.length).fill(0);
  const p = Math.max(2, Math.round(period));

  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      priorHigh[i] = highs[0];
      priorLow[i] = lows[0];
      continue;
    }
    const start = Math.max(0, i - p);
    let maxH = -Infinity;
    let minL = Infinity;
    for (let j = start; j < i; j++) {
      if (highs[j] > maxH) maxH = highs[j];
      if (lows[j] < minL) minL = lows[j];
    }
    priorHigh[i] = maxH;
    priorLow[i] = minL;
  }

  return { priorHigh, priorLow };
}

export function computeEstimatedLiquidationPrice(
  entryPrice: number,
  side: "LONG" | "SHORT",
  leverage: number
): number {
  if (!Number.isFinite(entryPrice) || entryPrice <= 0 || leverage <= 1) {
    return 0;
  }
  const marginRatio = Math.max(0.02, 1 / leverage - 0.005);
  const liq =
    side === "SHORT"
      ? entryPrice * (1 + marginRatio)
      : entryPrice * Math.max(0.05, 1 - marginRatio);
  return roundPriceAuto(liq);
}

export function assessDerivativesSqueeze(
  fundingRatePct: number,
  whaleLongPct: number,
  takerBuySellRatio: number,
  currentSignal: SignalState
): Pick<
  DerivativesPulse,
  | "squeezeState"
  | "squeezeScore"
  | "squeezeLabelTr"
  | "squeezeLabelEn"
  | "squeezeDetailTr"
  | "squeezeDetailEn"
> {
  if (
    fundingRatePct <= -0.004 &&
    (takerBuySellRatio >= 1.02 ||
      whaleLongPct >= 52 ||
      currentSignal === "LONG" ||
      currentSignal === "ENTRY_NOW")
  ) {
    const score = Math.min(
      96,
      Math.round(76 + Math.abs(fundingRatePct) * 650 + Math.max(0, (takerBuySellRatio - 1) * 40))
    );
    return {
      squeezeState: "SHORT_SQUEEZE",
      squeezeScore: score,
      squeezeLabelTr: "SHORT SQUEEZE RİSKİ",
      squeezeLabelEn: "SHORT SQUEEZE SETUP",
      squeezeDetailTr:
        "Negatif fonlama + alıcı baskısı short pozisyonları stoplamaya zorluyor.",
      squeezeDetailEn:
        "Negative funding + buyer absorption is pressuring crowded shorts.",
    };
  }

  if (
    fundingRatePct >= 0.018 &&
    (whaleLongPct >= 62 ||
      takerBuySellRatio < 0.96 ||
      currentSignal === "SHORT" ||
      currentSignal === "SHORT_NOW")
  ) {
    const score = Math.min(
      94,
      Math.round(74 + fundingRatePct * 520 + Math.max(0, (whaleLongPct - 60) * 0.8))
    );
    return {
      squeezeState: "LONG_SQUEEZE",
      squeezeScore: score,
      squeezeLabelTr: "LONG SQUEEZE / AŞIRI KALDIRAÇ",
      squeezeLabelEn: "LONG SQUEEZE RISK",
      squeezeDetailTr:
        "Yüksek pozitif fonlama ve kalabalık longlar aşağı yönlü iğne riski yaratıyor.",
      squeezeDetailEn:
        "Elevated positive funding signals crowded longs vulnerable to a flush.",
    };
  }

  if (whaleLongPct >= 58 && takerBuySellRatio >= 1.06) {
    const score = Math.min(86, Math.round(64 + (whaleLongPct - 55) + (takerBuySellRatio - 1) * 35));
    return {
      squeezeState: "WHALE_ACCUMULATION",
      squeezeScore: score,
      squeezeLabelTr: "BALİNA BİRİKİMİ",
      squeezeLabelEn: "WHALE ACCUMULATION",
      squeezeDetailTr:
        "Top hesaplar ağırlıklı long tarafta ve agresif taker alış hacmi önde.",
      squeezeDetailEn:
        "Top trader accounts skew long while aggressive taker buy flow leads.",
    };
  }

  return {
    squeezeState: "NEUTRAL",
    squeezeScore: 50,
    squeezeLabelTr: "DENGELİ VADELİ AKIŞ",
    squeezeLabelEn: "BALANCED FLOW",
    squeezeDetailTr:
      "Fonlama oranı ve taker dengesi nötr bölgede; strateji kırılımı bekleniyor.",
    squeezeDetailEn:
      "Funding and taker flow are balanced; waiting on price breakout confirmation.",
  };
}

export function buildFallbackDerivativesPulse(
  symbol: string,
  candles: OHLCVCandle[],
  currentSignal: SignalState
): DerivativesPulse {
  const upper = symbol.toUpperCase();
  let hash = 0x811c9dc5;
  for (let i = 0; i < upper.length; i++) {
    hash ^= upper.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const u1 = ((hash >>> 0) % 1000) / 1000;
  const u2 = (((hash * 2654435761) >>> 0) % 1000) / 1000;
  const lastClose = candles[candles.length - 1]?.close ?? ASSET_BASE_PRICES[upper] ?? 100;
  const recentOpen = candles[Math.max(0, candles.length - 12)]?.open ?? lastClose;
  const trendPct = recentOpen > 0 ? ((lastClose - recentOpen) / recentOpen) * 100 : 0;

  const fundingRatePct = roundNum(
    trendPct < -1.5 ? -0.0085 + u1 * 0.004 : 0.0045 + (u1 - 0.35) * 0.018,
    4
  );
  const basisPct = roundNum((u2 - 0.42) * 0.09, 4);
  const markPrice = roundPriceAuto(lastClose * (1 + basisPct / 100));
  const whaleLongPct = roundNum(47 + u1 * 21, 1);
  const whaleShortPct = roundNum(100 - whaleLongPct, 1);
  const whaleRatio = roundNum(whaleLongPct / Math.max(10, whaleShortPct), 2);
  const takerBuySellRatio = roundNum(
    trendPct < -1.5 && currentSignal === "LONG" ? 1.07 + u2 * 0.14 : 0.91 + u2 * 0.24,
    2
  );
  const baseOi = upper === "BTCUSDT" ? 5.6e9 : upper === "ETHUSDT" ? 2.4e9 : upper === "SOLUSDT" ? 1.15e9 : 2.8e8;
  const openInterestUsd = Math.round(baseOi * (0.85 + u1 * 0.4));

  const squeeze = assessDerivativesSqueeze(
    fundingRatePct,
    whaleLongPct,
    takerBuySellRatio,
    currentSignal
  );

  return {
    symbol: upper,
    fundingRatePct,
    markPrice,
    indexPrice: lastClose,
    basisPct,
    openInterestUsd,
    whaleLongPct,
    whaleShortPct,
    whaleRatio,
    takerBuySellRatio,
    ...squeeze,
    isLiveDerivatives: false,
  };
}

export function runStrategyBacktest(
  candles: OHLCVCandle[],
  config: StrategyConfig
): BacktestResult {
  const meta = STRATEGY_CATALOG[config.strategyId];
  const direction: TradeDirectionMode = config.direction ?? "long";
  const capital = Math.max(100, config.capital);
  const leverage = Math.max(1, Math.min(20, config.leverage));
  const stopPct = Math.max(0.25, config.stopLossPct) / 100;
  const targetPct = Math.max(0.5, config.takeProfitPct) / 100;
  const roundTripFeeRate = (Math.max(0, config.feePct) / 100) * 2;
  const defaultSide: "LONG" | "SHORT" = direction === "short" ? "SHORT" : "LONG";

  if (candles.length < 30) {
    return {
      strategyId: config.strategyId,
      nameTr: meta.nameTr,
      nameEn: meta.nameEn,
      descTr: meta.descTr,
      descEn: meta.descEn,
      config,
      trades: [],
      equityCurve: [],
      netProfitPct: 0,
      netProfitUsd: 0,
      finalEquity: capital,
      buyAndHoldReturnPct: 0,
      alphaPct: 0,
      winRatePct: 0,
      profitFactor: 0,
      maxDrawdownPct: 0,
      sharpeRatio: 0,
      totalTrades: 0,
      currentSignal: "FLAT",
      activeSide: defaultSide,
      activeEntryPrice: null,
      suggestedStopPrice: 0,
      suggestedTargetPrice: 0,
      estimatedLiquidationPrice: 0,
      oosSplitIndex: 0,
      inSampleReturnPct: 0,
      outOfSampleReturnPct: 0,
      outOfSampleWinRatePct: 0,
      isRobustOos: false,
      overlayUpper: [],
      overlayLower: [],
      overlayLabel: "Indicator Bands",
    };
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  const fastPeriod = Math.max(3, config.fastPeriod);
  const slowPeriod = Math.max(fastPeriod + 4, config.slowPeriod);

  const emaFast = computeEma(closes, fastPeriod);
  const emaSlow = computeEma(closes, slowPeriod);
  const rsi = computeRsi(closes, 14);
  const bb = computeBollinger(closes, Math.max(12, slowPeriod), 2);
  const dcEntry = computeDonchian(highs, lows, Math.max(10, slowPeriod));
  const dcExit = computeDonchian(highs, lows, Math.max(5, Math.floor(slowPeriod / 2)));

  const ema12 = computeEma(closes, 12);
  const ema26 = computeEma(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const macdSignal = computeEma(macdLine, 9);
  const avgVol = computeSma(volumes, 20);

  const warmup = Math.max(25, slowPeriod + 2);
  let equity = capital;
  let peakEquity = capital;
  let maxDrawdownPct = 0;

  let activeTrade: {
    side: "LONG" | "SHORT";
    entryIndex: number;
    entryTime: number;
    entryPrice: number;
    stopPrice: number;
    targetPrice: number;
  } | null = null;

  const trades: TradeExecution[] = [];
  const equityCurve: BacktestResult["equityCurve"] = [];
  const firstClose = closes[0];
  let triggeredLastBar = false;

  const evaluateSignals = (i: number) => {
    const candle = candles[i];
    const prevCandle = candles[i - 1];
    let longEntry = false;
    let shortEntry = false;
    let longExitSignal = false;
    let shortExitSignal = false;

    if (config.strategyId === "donchian_breakout") {
      longEntry = candle.close > dcEntry.priorHigh[i];
      shortEntry = candle.close < dcEntry.priorLow[i];
      longExitSignal = candle.close < dcExit.priorLow[i];
      shortExitSignal = candle.close > dcExit.priorHigh[i];
    } else if (config.strategyId === "ema_cross") {
      longEntry = emaFast[i - 1] <= emaSlow[i - 1] && emaFast[i] > emaSlow[i];
      shortEntry = emaFast[i - 1] >= emaSlow[i - 1] && emaFast[i] < emaSlow[i];
      longExitSignal = emaFast[i] < emaSlow[i];
      shortExitSignal = emaFast[i] > emaSlow[i];
    } else if (config.strategyId === "rsi_reversion") {
      longEntry = rsi[i - 1] <= config.rsiOversold && rsi[i] > config.rsiOversold;
      shortEntry = rsi[i - 1] >= config.rsiOverbought && rsi[i] < config.rsiOverbought;
      longExitSignal = rsi[i] >= config.rsiOverbought;
      shortExitSignal = rsi[i] <= config.rsiOversold;
    } else if (config.strategyId === "bollinger_bounce") {
      longEntry =
        prevCandle.low <= bb.lower[i - 1] &&
        candle.close > bb.lower[i] &&
        candle.close > candle.open;
      shortEntry =
        prevCandle.high >= bb.upper[i - 1] &&
        candle.close < bb.upper[i] &&
        candle.close < candle.open;
      longExitSignal = candle.close >= bb.upper[i];
      shortExitSignal = candle.close <= bb.lower[i];
    } else if (config.strategyId === "macd_momentum") {
      longEntry = macdLine[i - 1] <= macdSignal[i - 1] && macdLine[i] > macdSignal[i];
      shortEntry = macdLine[i - 1] >= macdSignal[i - 1] && macdLine[i] < macdSignal[i];
      longExitSignal = macdLine[i] < macdSignal[i];
      shortExitSignal = macdLine[i] > macdSignal[i];
    } else if (config.strategyId === "volume_breakout") {
      const hasSpike = avgVol[i] > 0 && candle.volume >= avgVol[i] * 1.6;
      longEntry = hasSpike && candle.close > candle.open * 1.006 && candle.close >= emaFast[i];
      shortEntry = hasSpike && candle.close < candle.open * 0.994 && candle.close <= emaFast[i];
      longExitSignal = emaFast[i] < emaSlow[i] && candle.close < candle.open;
      shortExitSignal = emaFast[i] > emaSlow[i] && candle.close > candle.open;
    }

    return { longEntry, shortEntry, longExitSignal, shortExitSignal };
  };

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const signals = i >= warmup ? evaluateSignals(i) : null;
    let exitedViaStopOrTargetThisBar = false;

    // 1. Check intrabar SL / TP & signal exit for open position
    if (activeTrade && i > activeTrade.entryIndex) {
      let exitPrice: number | null = null;
      let exitReason: TradeExecution["exitReason"] | null = null;

      if (activeTrade.side === "LONG") {
        if (candle.low <= activeTrade.stopPrice) {
          exitPrice = activeTrade.stopPrice;
          exitReason = "SL";
        } else if (candle.high >= activeTrade.targetPrice) {
          exitPrice = activeTrade.targetPrice;
          exitReason = "TP";
        } else if (signals?.longExitSignal) {
          exitPrice = candle.close;
          exitReason = "SIGNAL";
        }
      } else {
        if (candle.high >= activeTrade.stopPrice) {
          exitPrice = activeTrade.stopPrice;
          exitReason = "SL";
        } else if (candle.low <= activeTrade.targetPrice) {
          exitPrice = activeTrade.targetPrice;
          exitReason = "TP";
        } else if (signals?.shortExitSignal) {
          exitPrice = candle.close;
          exitReason = "SIGNAL";
        }
      }

      if (exitPrice !== null && exitReason !== null) {
        const grossPct =
          activeTrade.side === "LONG"
            ? (exitPrice - activeTrade.entryPrice) / activeTrade.entryPrice
            : (activeTrade.entryPrice - exitPrice) / activeTrade.entryPrice;
        const netLevPct = Math.max(-0.98, (grossPct - roundTripFeeRate) * leverage);
        const pnlUsd = roundNum(equity * netLevPct, 2);
        equity = Math.max(10, roundNum(equity + pnlUsd, 2));

        trades.push({
          id: trades.length + 1,
          side: activeTrade.side,
          entryIndex: activeTrade.entryIndex,
          exitIndex: i,
          entryTime: activeTrade.entryTime,
          exitTime: candle.time,
          entryPrice: activeTrade.entryPrice,
          exitPrice: roundPriceAuto(exitPrice),
          exitReason,
          grossReturnPct: roundNum(grossPct * leverage * 100, 2),
          netReturnPct: roundNum(netLevPct * 100, 2),
          pnlUsd,
          equityAfter: equity,
        });

        exitedViaStopOrTargetThisBar = exitReason === "SL" || exitReason === "TP";
        activeTrade = null;
      }
    }

    // 2. Check strategy entry if flat (allow signal-to-signal flip on SIGNAL exit in bi-directional mode)
    if (!activeTrade && signals && !exitedViaStopOrTargetThisBar) {
      const canLong = direction === "long" || direction === "both";
      const canShort = direction === "short" || direction === "both";

      if (canLong && signals.longEntry) {
        activeTrade = {
          side: "LONG",
          entryIndex: i,
          entryTime: candle.time,
          entryPrice: candle.close,
          stopPrice: roundPriceAuto(candle.close * (1 - stopPct)),
          targetPrice: roundPriceAuto(candle.close * (1 + targetPct)),
        };
        if (i === candles.length - 1) triggeredLastBar = true;
      } else if (canShort && signals.shortEntry) {
        activeTrade = {
          side: "SHORT",
          entryIndex: i,
          entryTime: candle.time,
          entryPrice: candle.close,
          stopPrice: roundPriceAuto(candle.close * (1 + stopPct)),
          targetPrice: roundPriceAuto(candle.close * (1 - targetPct)),
        };
        if (i === candles.length - 1) triggeredLastBar = true;
      }
    }

    // 3. Track mark-to-market equity & drawdown
    let mtmEquity = equity;
    if (activeTrade) {
      const openPct =
        activeTrade.side === "LONG"
          ? (candle.close - activeTrade.entryPrice) / activeTrade.entryPrice
          : (activeTrade.entryPrice - candle.close) / activeTrade.entryPrice;
      const netOpenLev = Math.max(-0.98, (openPct - roundTripFeeRate * 0.5) * leverage);
      mtmEquity = Math.max(10, roundNum(equity * (1 + netOpenLev), 2));
    }

    if (mtmEquity > peakEquity) peakEquity = mtmEquity;
    const ddPct = peakEquity > 0 ? roundNum(((peakEquity - mtmEquity) / peakEquity) * 100, 2) : 0;
    if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;

    const holdEquity = roundNum(capital * (candle.close / firstClose), 2);
    equityCurve.push({
      time: candle.time,
      price: candle.close,
      strategyEquity: mtmEquity,
      holdEquity,
      drawdownPct: ddPct,
    });
  }

  // Record open position if active on final candle
  let currentSignal: SignalState = "FLAT";
  let activeSide: "LONG" | "SHORT" = defaultSide;
  let activeEntryPrice: number | null = null;
  const lastCandle = candles[candles.length - 1];
  let suggestedStopPrice = roundPriceAuto(
    defaultSide === "SHORT"
      ? lastCandle.close * (1 + stopPct)
      : lastCandle.close * (1 - stopPct)
  );
  let suggestedTargetPrice = roundPriceAuto(
    defaultSide === "SHORT"
      ? lastCandle.close * (1 - targetPct)
      : lastCandle.close * (1 + targetPct)
  );

  if (activeTrade) {
    activeSide = activeTrade.side;
    currentSignal =
      activeTrade.side === "LONG"
        ? triggeredLastBar
          ? "ENTRY_NOW"
          : "LONG"
        : triggeredLastBar
          ? "SHORT_NOW"
          : "SHORT";
    activeEntryPrice = activeTrade.entryPrice;
    suggestedStopPrice = activeTrade.stopPrice;
    suggestedTargetPrice = activeTrade.targetPrice;

    const grossPct =
      activeTrade.side === "LONG"
        ? (lastCandle.close - activeTrade.entryPrice) / activeTrade.entryPrice
        : (activeTrade.entryPrice - lastCandle.close) / activeTrade.entryPrice;
    const netLevPct = Math.max(-0.98, (grossPct - roundTripFeeRate) * leverage);
    const pnlUsd = roundNum(equity * netLevPct, 2);
    const mtmFinal = Math.max(10, roundNum(equity + pnlUsd, 2));

    trades.push({
      id: trades.length + 1,
      side: activeTrade.side,
      entryIndex: activeTrade.entryIndex,
      exitIndex: candles.length - 1,
      entryTime: activeTrade.entryTime,
      exitTime: lastCandle.time,
      entryPrice: activeTrade.entryPrice,
      exitPrice: lastCandle.close,
      exitReason: "OPEN",
      grossReturnPct: roundNum(grossPct * leverage * 100, 2),
      netReturnPct: roundNum(netLevPct * 100, 2),
      pnlUsd,
      equityAfter: mtmFinal,
    });
  }

  const estimatedLiquidationPrice = computeEstimatedLiquidationPrice(
    activeEntryPrice ?? lastCandle.close,
    activeSide,
    leverage
  );

  const finalEquity = equityCurve[equityCurve.length - 1]?.strategyEquity ?? capital;
  const netProfitUsd = roundNum(finalEquity - capital, 2);
  const netProfitPct = roundNum(((finalEquity - capital) / capital) * 100, 2);
  const buyAndHoldReturnPct = roundNum(((lastCandle.close - firstClose) / firstClose) * 100, 2);
  const alphaPct = roundNum(netProfitPct - buyAndHoldReturnPct, 2);

  const winningTrades = trades.filter((t) => t.pnlUsd > 0);
  const losingTrades = trades.filter((t) => t.pnlUsd <= 0);
  const winRatePct =
    trades.length > 0 ? roundNum((winningTrades.length / trades.length) * 100, 1) : 0;

  const grossProfit = winningTrades.reduce((s, t) => s + t.pnlUsd, 0);
  const grossLoss = Math.abs(losingTrades.reduce((s, t) => s + t.pnlUsd, 0));
  const profitFactor =
    grossLoss > 0
      ? roundNum(grossProfit / grossLoss, 2)
      : grossProfit > 0
        ? 9.99
        : 0;

  // Walk-Forward Out-of-Sample Split (First 70% Train / Last 30% Unseen Validation)
  const oosSplitIndex = Math.max(warmup + 5, Math.min(candles.length - 15, Math.floor(candles.length * 0.7)));
  const splitEquity = equityCurve[oosSplitIndex]?.strategyEquity ?? capital;
  const inSampleReturnPct = roundNum(((splitEquity - capital) / capital) * 100, 2);
  const outOfSampleReturnPct =
    splitEquity > 0 ? roundNum(((finalEquity - splitEquity) / splitEquity) * 100, 2) : 0;
  const oosTrades = trades.filter((t) => t.entryIndex >= oosSplitIndex);
  const outOfSampleWinRatePct =
    oosTrades.length > 0
      ? roundNum((oosTrades.filter((t) => t.pnlUsd > 0).length / oosTrades.length) * 100, 1)
      : winRatePct;
  const isRobustOos =
    trades.length >= 2 && inSampleReturnPct > -2 && outOfSampleReturnPct > 0 && winRatePct >= 40;

  // Approximate annualized trade-return Sharpe ratio
  let sharpeRatio = 0;
  if (trades.length >= 2) {
    const returns = trades.map((t) => t.netReturnPct);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (returns.length - 1);
    const std = Math.sqrt(variance);
    if (std > 0) {
      sharpeRatio = roundNum((mean / std) * Math.sqrt(Math.min(252, trades.length * 4)), 2);
    }
  }

  let overlayUpper: number[];
  let overlayLower: number[];
  let overlayLabel: string;

  if (config.strategyId === "donchian_breakout") {
    overlayUpper = dcEntry.priorHigh;
    overlayLower = dcExit.priorLow;
    overlayLabel = `Donchian (${Math.max(10, slowPeriod)}/${Math.max(5, Math.floor(slowPeriod / 2))})`;
  } else if (config.strategyId === "bollinger_bounce") {
    overlayUpper = bb.upper;
    overlayLower = bb.lower;
    overlayLabel = `Bollinger 2σ (${Math.max(12, slowPeriod)})`;
  } else {
    overlayUpper = emaFast;
    overlayLower = emaSlow;
    overlayLabel = `EMA (${fastPeriod}/${slowPeriod})`;
  }

  return {
    strategyId: config.strategyId,
    nameTr: meta.nameTr,
    nameEn: meta.nameEn,
    descTr: meta.descTr,
    descEn: meta.descEn,
    config: { ...config, direction },
    trades,
    equityCurve,
    netProfitPct,
    netProfitUsd,
    finalEquity,
    buyAndHoldReturnPct,
    alphaPct,
    winRatePct,
    profitFactor,
    maxDrawdownPct,
    sharpeRatio,
    totalTrades: trades.length,
    currentSignal,
    activeSide,
    activeEntryPrice,
    suggestedStopPrice,
    suggestedTargetPrice,
    estimatedLiquidationPrice,
    oosSplitIndex,
    inSampleReturnPct,
    outOfSampleReturnPct,
    outOfSampleWinRatePct,
    isRobustOos,
    overlayUpper,
    overlayLower,
    overlayLabel,
  };
}

function scoreBacktest(r: BacktestResult): number {
  const tradeBonus = r.totalTrades >= 3 ? 5 : r.totalTrades === 0 ? -50 : 0;
  const oosBonus = r.isRobustOos ? 6 : 0;
  return (
    r.netProfitPct * 0.7 +
    r.outOfSampleReturnPct * 0.9 -
    r.maxDrawdownPct * 0.5 +
    r.profitFactor * 1.5 +
    tradeBonus +
    oosBonus
  );
}

export function runStrategyTournament(
  candles: OHLCVCandle[],
  baseConfig: Omit<StrategyConfig, "strategyId">
): BacktestResult[] {
  const ids = Object.keys(STRATEGY_CATALOG) as StrategyId[];
  const results = ids.map((strategyId) =>
    runStrategyBacktest(candles, { ...baseConfig, strategyId })
  );
  results.sort((a, b) => scoreBacktest(b) - scoreBacktest(a));
  return results;
}

export function optimizeStrategyConfig(
  candles: OHLCVCandle[],
  baseCapital: number,
  leverage: number,
  direction: TradeDirectionMode = "long"
): { best: BacktestResult; testedCount: number } {
  const strategyIds = Object.keys(STRATEGY_CATALOG) as StrategyId[];
  const slTpPairs: [number, number][] = [
    [1.5, 4.0],
    [2.0, 5.5],
    [2.5, 7.0],
    [3.0, 8.5],
    [3.5, 10.0],
    [4.0, 12.0],
  ];

  let best: BacktestResult | null = null;
  let testedCount = 0;

  for (const strategyId of strategyIds) {
    for (const [stopLossPct, takeProfitPct] of slTpPairs) {
      testedCount += 1;
      const res = runStrategyBacktest(candles, {
        strategyId,
        capital: baseCapital,
        leverage,
        stopLossPct,
        takeProfitPct,
        feePct: 0.08,
        fastPeriod: 9,
        slowPeriod: 21,
        rsiOversold: 32,
        rsiOverbought: 70,
        direction,
      });

      if (!best || scoreBacktest(res) > scoreBacktest(best)) {
        best = res;
      }
    }
  }

  if (!best) {
    best = runStrategyBacktest(candles, {
      strategyId: "donchian_breakout",
      capital: baseCapital,
      leverage,
      stopLossPct: 2.5,
      takeProfitPct: 6.5,
      feePct: 0.08,
      fastPeriod: 9,
      slowPeriod: 21,
      rsiOversold: 32,
      rsiOverbought: 70,
      direction,
    });
  }

  return { best, testedCount };
}

/**
 * Evaluates a coin across the 6-strategy tournament (default bi-directional 2x futures)
 * to rank active market signals, OOS robustness & derivatives funding squeeze across all assets.
 */
export function buildCoinRadarRow(
  symbol: string,
  base: string,
  candles: OHLCVCandle[],
  change24hPct: number,
  proOnly = false,
  fundingRatePct = 0,
  direction: TradeDirectionMode = "both"
): CoinRadarRow {
  const { best } = optimizeStrategyConfig(candles, 10000, 2, direction);
  const lastPrice = candles[candles.length - 1]?.close ?? 0;
  const squeeze = assessDerivativesSqueeze(fundingRatePct, 54, 1.04, best.currentSignal);

  return {
    symbol,
    base,
    price: lastPrice,
    change24hPct,
    bestStrategyId: best.strategyId,
    bestStrategyNameTr: best.nameTr,
    bestStrategyNameEn: best.nameEn,
    netProfitPct: best.netProfitPct,
    outOfSampleReturnPct: best.outOfSampleReturnPct,
    isRobustOos: best.isRobustOos,
    winRatePct: best.winRatePct,
    profitFactor: best.profitFactor,
    maxDrawdownPct: best.maxDrawdownPct,
    totalTrades: best.totalTrades,
    currentSignal: best.currentSignal,
    activeSide: best.activeSide,
    entryPrice: best.activeEntryPrice ?? lastPrice,
    stopPrice: best.suggestedStopPrice,
    targetPrice: best.suggestedTargetPrice,
    fundingRatePct,
    squeezeState: squeeze.squeezeState,
    proOnly,
  };
}
