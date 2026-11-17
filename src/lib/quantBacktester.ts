export type TimeframeId = "15m" | "1h" | "4h" | "1d";

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
}

export interface TradeExecution {
  id: number;
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
  currentSignal: "LONG" | "FLAT" | "ENTRY_NOW";
  activeEntryPrice: number | null;
  suggestedStopPrice: number;
  suggestedTargetPrice: number;
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

export function runStrategyBacktest(
  candles: OHLCVCandle[],
  config: StrategyConfig
): BacktestResult {
  const meta = STRATEGY_CATALOG[config.strategyId];
  const capital = Math.max(100, config.capital);
  const leverage = Math.max(1, Math.min(20, config.leverage));
  const stopPct = Math.max(0.25, config.stopLossPct) / 100;
  const targetPct = Math.max(0.5, config.takeProfitPct) / 100;
  const roundTripFeeRate = (Math.max(0, config.feePct) / 100) * 2;

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
      activeEntryPrice: null,
      suggestedStopPrice: 0,
      suggestedTargetPrice: 0,
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

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    // Check intrabar SL / TP & strategy exit for active long position
    if (activeTrade && i > activeTrade.entryIndex) {
      let exitPrice: number | null = null;
      let exitReason: TradeExecution["exitReason"] | null = null;

      if (candle.low <= activeTrade.stopPrice) {
        exitPrice = activeTrade.stopPrice;
        exitReason = "SL";
      } else if (candle.high >= activeTrade.targetPrice) {
        exitPrice = activeTrade.targetPrice;
        exitReason = "TP";
      } else if (i >= warmup) {
        let signalExit = false;
        if (config.strategyId === "donchian_breakout") {
          signalExit = candle.close < dcExit.priorLow[i];
        } else if (config.strategyId === "ema_cross") {
          signalExit = emaFast[i] < emaSlow[i];
        } else if (config.strategyId === "rsi_reversion") {
          signalExit = rsi[i] >= config.rsiOverbought;
        } else if (config.strategyId === "bollinger_bounce") {
          signalExit = candle.close >= bb.upper[i];
        } else if (config.strategyId === "macd_momentum") {
          signalExit = macdLine[i] < macdSignal[i];
        } else if (config.strategyId === "volume_breakout") {
          signalExit = emaFast[i] < emaSlow[i] && candle.close < candle.open;
        }
        if (signalExit) {
          exitPrice = candle.close;
          exitReason = "SIGNAL";
        }
      }

      if (exitPrice !== null && exitReason !== null) {
        const grossPct = (exitPrice - activeTrade.entryPrice) / activeTrade.entryPrice;
        const netLevPct = Math.max(-0.98, (grossPct - roundTripFeeRate) * leverage);
        const pnlUsd = roundNum(equity * netLevPct, 2);
        equity = Math.max(10, roundNum(equity + pnlUsd, 2));

        trades.push({
          id: trades.length + 1,
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

        activeTrade = null;
      }
    }

    // Check strategy entry if flat and past warmup
    if (!activeTrade && i >= warmup && i < candles.length) {
      let signalEntry = false;
      if (config.strategyId === "donchian_breakout") {
        signalEntry = candle.close > dcEntry.priorHigh[i];
      } else if (config.strategyId === "ema_cross") {
        signalEntry = emaFast[i - 1] <= emaSlow[i - 1] && emaFast[i] > emaSlow[i];
      } else if (config.strategyId === "rsi_reversion") {
        signalEntry = rsi[i - 1] <= config.rsiOversold && rsi[i] > config.rsiOversold;
      } else if (config.strategyId === "bollinger_bounce") {
        signalEntry =
          candles[i - 1].low <= bb.lower[i - 1] &&
          candle.close > bb.lower[i] &&
          candle.close > candle.open;
      } else if (config.strategyId === "macd_momentum") {
        signalEntry = macdLine[i - 1] <= macdSignal[i - 1] && macdLine[i] > macdSignal[i];
      } else if (config.strategyId === "volume_breakout") {
        signalEntry =
          avgVol[i] > 0 &&
          candle.volume >= avgVol[i] * 1.6 &&
          candle.close > candle.open * 1.006 &&
          candle.close >= emaFast[i];
      }

      if (signalEntry) {
        activeTrade = {
          entryIndex: i,
          entryTime: candle.time,
          entryPrice: candle.close,
          stopPrice: roundPriceAuto(candle.close * (1 - stopPct)),
          targetPrice: roundPriceAuto(candle.close * (1 + targetPct)),
        };
        if (i === candles.length - 1) {
          triggeredLastBar = true;
        }
      }
    }

    // Track mark-to-market equity & drawdown
    let mtmEquity = equity;
    if (activeTrade) {
      const openPct = (candle.close - activeTrade.entryPrice) / activeTrade.entryPrice;
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
  let currentSignal: BacktestResult["currentSignal"] = "FLAT";
  let activeEntryPrice: number | null = null;
  const lastCandle = candles[candles.length - 1];
  let suggestedStopPrice = roundPriceAuto(lastCandle.close * (1 - stopPct));
  let suggestedTargetPrice = roundPriceAuto(lastCandle.close * (1 + targetPct));

  if (activeTrade) {
    currentSignal = triggeredLastBar ? "ENTRY_NOW" : "LONG";
    activeEntryPrice = activeTrade.entryPrice;
    suggestedStopPrice = activeTrade.stopPrice;
    suggestedTargetPrice = activeTrade.targetPrice;

    const grossPct = (lastCandle.close - activeTrade.entryPrice) / activeTrade.entryPrice;
    const netLevPct = Math.max(-0.98, (grossPct - roundTripFeeRate) * leverage);
    const pnlUsd = roundNum(equity * netLevPct, 2);
    const mtmFinal = Math.max(10, roundNum(equity + pnlUsd, 2));

    trades.push({
      id: trades.length + 1,
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

  return {
    strategyId: config.strategyId,
    nameTr: meta.nameTr,
    nameEn: meta.nameEn,
    descTr: meta.descTr,
    descEn: meta.descEn,
    config,
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
    activeEntryPrice,
    suggestedStopPrice,
    suggestedTargetPrice,
  };
}

function scoreBacktest(r: BacktestResult): number {
  const tradeBonus = r.totalTrades >= 3 ? 5 : r.totalTrades === 0 ? -50 : 0;
  return r.netProfitPct - r.maxDrawdownPct * 0.5 + r.profitFactor * 1.5 + tradeBonus;
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
  leverage: number
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
    });
  }

  return { best, testedCount };
}
