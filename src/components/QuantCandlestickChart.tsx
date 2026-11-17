"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BaselineSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { Activity, Maximize2 } from "lucide-react";
import type { AppLang } from "@/lib/financialForensics";
import type {
  BacktestResult,
  OHLCVCandle,
  TimeframeId,
  TradeExecution,
} from "@/lib/quantBacktester";

interface QuantCandlestickChartProps {
  symbol: string;
  timeframe: TimeframeId;
  candles: OHLCVCandle[];
  result: BacktestResult;
  lang: AppLang;
  isLoading?: boolean;
}

interface HudReadout {
  timeSec: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  equity: number;
  holdEquity: number;
  upper: number | null;
  lower: number | null;
}

function getPricePrecision(price: number): { precision: number; minMove: number } {
  if (!Number.isFinite(price) || price <= 0) return { precision: 2, minMove: 0.01 };
  if (price >= 1000) return { precision: 2, minMove: 0.01 };
  if (price >= 10) return { precision: 2, minMove: 0.01 };
  if (price >= 1) return { precision: 3, minMove: 0.001 };
  if (price >= 0.1) return { precision: 4, minMove: 0.0001 };
  return { precision: 5, minMove: 0.00001 };
}

function formatAxisPrice(val: number): string {
  if (!Number.isFinite(val)) return "$0";
  if (val >= 1000) return `$${val.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (val >= 10) return `$${val.toFixed(2)}`;
  if (val >= 1) return `$${val.toFixed(3)}`;
  return `$${val.toFixed(4)}`;
}

function formatHudUtc(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min} UTC`;
}

function formatCompactVol(vol: number): string {
  if (!Number.isFinite(vol)) return "0";
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toFixed(0);
}

export default function QuantCandlestickChart({
  symbol,
  timeframe,
  candles,
  result,
  lang,
  isLoading = false,
}: QuantCandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const upperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const equitySeriesRef = useRef<ISeriesApi<"Baseline"> | null>(null);
  const holdSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const candleMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const eqMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  const [visibleCount, setVisibleCount] = useState<number>(150);
  const [hoveredHud, setHoveredHud] = useState<HudReadout | null>(null);
  const hudLookupRef = useRef<Map<number, HudReadout>>(new Map());
  const visibleCountRef = useRef<number>(150);
  const lastViewportKeyRef = useRef<string>("");

  // Deduplicate & map bar data with strict ascending UTC seconds
  const preparedData = useMemo(() => {
    const ohlc: {
      time: UTCTimestamp;
      open: number;
      high: number;
      low: number;
      close: number;
    }[] = [];
    const volume: { time: UTCTimestamp; value: number; color: string }[] = [];
    const upperLine: { time: UTCTimestamp; value: number }[] = [];
    const lowerLine: { time: UTCTimestamp; value: number }[] = [];
    const equityLine: { time: UTCTimestamp; value: number }[] = [];
    const holdLine: { time: UTCTimestamp; value: number }[] = [];
    const lookup = new Map<number, HudReadout>();
    const equityByMs = new Map<number, { strategyEquity: number; holdEquity: number }>();

    for (const eq of result.equityCurve) {
      equityByMs.set(eq.time, {
        strategyEquity: eq.strategyEquity,
        holdEquity: eq.holdEquity,
      });
    }

    let lastSec = -1;
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const sec = Math.floor(c.time / 1000);
      if (sec <= lastSec) continue;
      lastSec = sec;

      const t = sec as UTCTimestamp;
      const isUp = c.close >= c.open;
      ohlc.push({
        time: t,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      });
      volume.push({
        time: t,
        value: c.volume,
        color: isUp ? "rgba(16, 185, 129, 0.24)" : "rgba(244, 63, 94, 0.24)",
      });

      const u = result.overlayUpper[i];
      if (Number.isFinite(u)) {
        upperLine.push({ time: t, value: u });
      }
      const l = result.overlayLower[i];
      if (Number.isFinite(l)) {
        lowerLine.push({ time: t, value: l });
      }

      const eqMatch = equityByMs.get(c.time) ?? result.equityCurve[i];
      const strategyEquity = eqMatch?.strategyEquity ?? result.config.capital;
      const holdEquity = eqMatch?.holdEquity ?? result.config.capital;
      equityLine.push({ time: t, value: strategyEquity });
      holdLine.push({ time: t, value: holdEquity });

      lookup.set(sec, {
        timeSec: sec,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        equity: strategyEquity,
        holdEquity,
        upper: Number.isFinite(u) ? u : null,
        lower: Number.isFinite(l) ? l : null,
      });
    }

    // Trade markers sorted ascending
    const candleMarkers: SeriesMarker<Time>[] = [];
    for (const tr of result.trades as TradeExecution[]) {
      const entrySec = Math.floor(tr.entryTime / 1000);
      if (lookup.has(entrySec)) {
        candleMarkers.push({
          time: entrySec as UTCTimestamp,
          position: tr.side === "LONG" ? "belowBar" : "aboveBar",
          shape: tr.side === "LONG" ? "arrowUp" : "arrowDown",
          color: tr.side === "LONG" ? "#10b981" : "#c084fc",
          text: tr.side === "LONG" ? "L" : "S",
        });
      }

      const exitSec = Math.floor(tr.exitTime / 1000);
      if (lookup.has(exitSec) && tr.exitReason !== "OPEN") {
        const exitColor =
          tr.exitReason === "TP"
            ? "#fbbf24"
            : tr.exitReason === "SL"
              ? "#f43f5e"
              : "#94a3b8";
        candleMarkers.push({
          time: exitSec as UTCTimestamp,
          position: tr.side === "LONG" ? "aboveBar" : "belowBar",
          shape: tr.exitReason === "SIGNAL" ? "square" : "circle",
          color: exitColor,
          text: tr.exitReason === "TP" ? "TP" : tr.exitReason === "SL" ? "SL" : "",
        });
      }
    }
    candleMarkers.sort((a, b) => Number(a.time) - Number(b.time));

    // OOS Split marker on Equity curve
    const eqMarkers: SeriesMarker<Time>[] = [];
    const oosCandle = candles[result.oosSplitIndex];
    if (oosCandle) {
      const oosSec = Math.floor(oosCandle.time / 1000);
      if (lookup.has(oosSec)) {
        eqMarkers.push({
          time: oosSec as UTCTimestamp,
          position: "belowBar",
          shape: "arrowUp",
          color: "#22d3ee",
          text: lang === "tr" ? "Kör OOS %30" : "Blind OOS 30%",
        });
      }
    }

    return {
      ohlc,
      volume,
      upperLine,
      lowerLine,
      equityLine,
      holdLine,
      lookup,
      candleMarkers,
      eqMarkers,
    };
  }, [candles, result, lang]);

  // Create chart instance once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#090C12" },
        textColor: "#94a3b8",
        fontSize: 11,
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        panes: {
          enableResize: true,
          separatorColor: "rgba(255, 255, 255, 0.08)",
          separatorHoverColor: "rgba(16, 185, 129, 0.45)",
        },
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.035)" },
        horzLines: { color: "rgba(255, 255, 255, 0.035)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(148, 163, 184, 0.45)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1E293B",
        },
        horzLine: {
          color: "rgba(148, 163, 184, 0.45)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1E293B",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        scaleMargins: { top: 0.08, bottom: 0.16 },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candleSeries = chart.addSeries(
      CandlestickSeries,
      {
        upColor: "#10b981",
        downColor: "#f43f5e",
        wickUpColor: "#10b981",
        wickDownColor: "#f43f5e",
        borderVisible: false,
      },
      0
    );

    const volumeSeries = chart.addSeries(
      HistogramSeries,
      {
        priceScaleId: "vol",
        priceFormat: { type: "volume" },
        lastValueVisible: false,
        priceLineVisible: false,
      },
      0
    );
    chart.priceScale("vol", 0).applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    const upperSeries = chart.addSeries(
      LineSeries,
      {
        color: "rgba(34, 211, 238, 0.65)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      },
      0
    );

    const lowerSeries = chart.addSeries(
      LineSeries,
      {
        color: "rgba(167, 139, 250, 0.65)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      },
      0
    );

    // Pane 1: Synchronized Strategy Equity Baseline + Buy & Hold Line
    const holdSeries = chart.addSeries(
      LineSeries,
      {
        color: "rgba(148, 163, 184, 0.45)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        lastValueVisible: false,
        priceLineVisible: false,
      },
      1
    );

    const equitySeries = chart.addSeries(
      BaselineSeries,
      {
        baseValue: { type: "price", price: 10000 },
        topLineColor: "#10b981",
        topFillColor1: "rgba(16, 185, 129, 0.28)",
        topFillColor2: "rgba(16, 185, 129, 0.02)",
        bottomLineColor: "#f43f5e",
        bottomFillColor1: "rgba(244, 63, 94, 0.02)",
        bottomFillColor2: "rgba(244, 63, 94, 0.28)",
        lineWidth: 2,
        priceFormat: { type: "price", precision: 0, minMove: 1 },
      },
      1
    );

    const panes = chart.panes();
    if (panes[0]) panes[0].setStretchFactor(0.73);
    if (panes[1]) panes[1].setStretchFactor(0.27);
    chart.priceScale("right", 1).applyOptions({
      scaleMargins: { top: 0.14, bottom: 0.12 },
    });

    const candleMarkers = createSeriesMarkers(candleSeries, []);
    const eqMarkers = createSeriesMarkers(equitySeries, []);

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || typeof param.time !== "number") {
        setHoveredHud(null);
        return;
      }
      const hit = hudLookupRef.current.get(param.time) ?? null;
      setHoveredHud(hit);
    });

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        chart.applyOptions({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    resizeObserver.observe(el);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    upperSeriesRef.current = upperSeries;
    lowerSeriesRef.current = lowerSeries;
    equitySeriesRef.current = equitySeries;
    holdSeriesRef.current = holdSeries;
    candleMarkersRef.current = candleMarkers;
    eqMarkersRef.current = eqMarkers;

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      upperSeriesRef.current = null;
      lowerSeriesRef.current = null;
      equitySeriesRef.current = null;
      holdSeriesRef.current = null;
      candleMarkersRef.current = null;
      eqMarkersRef.current = null;
      priceLinesRef.current = [];
    };
  }, []);

  // Push series data & price lines whenever candles or backtest result change
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const upperSeries = upperSeriesRef.current;
    const lowerSeries = lowerSeriesRef.current;
    const equitySeries = equitySeriesRef.current;
    const holdSeries = holdSeriesRef.current;

    if (
      !chart ||
      !candleSeries ||
      !volumeSeries ||
      !upperSeries ||
      !lowerSeries ||
      !equitySeries ||
      !holdSeries
    ) {
      return;
    }

    hudLookupRef.current = preparedData.lookup;

    const latestClose = preparedData.ohlc[preparedData.ohlc.length - 1]?.close ?? 100;
    const pf = getPricePrecision(latestClose);
    candleSeries.applyOptions({
      priceFormat: {
        type: "price",
        precision: pf.precision,
        minMove: pf.minMove,
      },
    });

    candleSeries.setData(preparedData.ohlc);
    volumeSeries.setData(preparedData.volume);
    upperSeries.setData(preparedData.upperLine);
    lowerSeries.setData(preparedData.lowerLine);

    equitySeries.applyOptions({
      baseValue: { type: "price", price: result.config.capital },
    });
    equitySeries.setData(preparedData.equityLine);
    holdSeries.setData(preparedData.holdLine);

    candleMarkersRef.current?.setMarkers(preparedData.candleMarkers);
    eqMarkersRef.current?.setMarkers(preparedData.eqMarkers);

    // Replace active SL / TP / Entry / Liq price lines
    for (const line of priceLinesRef.current) {
      candleSeries.removePriceLine(line);
    }
    priceLinesRef.current = [];

    if (preparedData.ohlc.length > 0) {
      if (result.activeEntryPrice && Number.isFinite(result.activeEntryPrice)) {
        priceLinesRef.current.push(
          candleSeries.createPriceLine({
            price: result.activeEntryPrice,
            color: "#38bdf8",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: "ENTRY",
          })
        );
      }
      if (Number.isFinite(result.suggestedTargetPrice) && result.suggestedTargetPrice > 0) {
        priceLinesRef.current.push(
          candleSeries.createPriceLine({
            price: result.suggestedTargetPrice,
            color: "#10b981",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: "TP",
          })
        );
      }
      if (Number.isFinite(result.suggestedStopPrice) && result.suggestedStopPrice > 0) {
        priceLinesRef.current.push(
          candleSeries.createPriceLine({
            price: result.suggestedStopPrice,
            color: "#f43f5e",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: "SL",
          })
        );
      }
      if (
        Number.isFinite(result.estimatedLiquidationPrice) &&
        result.estimatedLiquidationPrice > 0 &&
        result.config.leverage > 1
      ) {
        priceLinesRef.current.push(
          candleSeries.createPriceLine({
            price: result.estimatedLiquidationPrice,
            color: "#f59e0b",
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: "LIQ",
          })
        );
      }
    }

    const vpKey = `${symbol}|${timeframe}|${preparedData.ohlc.length}`;
    if (preparedData.ohlc.length > 0 && lastViewportKeyRef.current !== vpKey) {
      lastViewportKeyRef.current = vpKey;
      const total = preparedData.ohlc.length;
      const count = visibleCountRef.current;
      if (count >= total) {
        chart.timeScale().fitContent();
      } else {
        chart.timeScale().setVisibleLogicalRange({
          from: Math.max(0, total - count),
          to: total + 4,
        });
      }
    }
  }, [preparedData, result, symbol, timeframe]);

  const applyRangeCount = (count: number) => {
    setVisibleCount(count);
    visibleCountRef.current = count;
    const chart = chartRef.current;
    const total = preparedData.ohlc.length;
    if (!chart || total === 0) return;
    if (count >= total) {
      chart.timeScale().fitContent();
    } else {
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, total - count),
        to: total + 4,
      });
    }
  };

  const activeHud = useMemo<HudReadout | null>(() => {
    if (hoveredHud) return hoveredHud;
    const lastOhlc = preparedData.ohlc[preparedData.ohlc.length - 1];
    if (!lastOhlc) return null;
    return preparedData.lookup.get(Number(lastOhlc.time)) ?? null;
  }, [hoveredHud, preparedData]);

  const barPctChange =
    activeHud && activeHud.open > 0
      ? ((activeHud.close - activeHud.open) / activeHud.open) * 100
      : 0;
  const isUpBar = activeHud ? activeHud.close >= activeHud.open : true;

  return (
    <div className="flex flex-col bg-[#090C12]">
      {/* Compact OHLCV + Legend Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-white/[0.06] bg-[#0B0F17] px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-semibold text-white">{symbol.replace("USDT", "/USDT")}</span>
            <span className="mono-nums rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
              {timeframe.toUpperCase()}
            </span>
          </div>

          {activeHud ? (
            <div className="mono-nums flex flex-wrap items-center gap-x-2.5 text-[10.5px] text-slate-400">
              <span className="hidden sm:inline text-slate-500">
                {formatHudUtc(activeHud.timeSec * 1000)}
              </span>
              <span>
                O <strong className="text-slate-200">{formatAxisPrice(activeHud.open)}</strong>
              </span>
              <span>
                H <strong className="text-slate-200">{formatAxisPrice(activeHud.high)}</strong>
              </span>
              <span>
                L <strong className="text-slate-200">{formatAxisPrice(activeHud.low)}</strong>
              </span>
              <span>
                C{" "}
                <strong className={isUpBar ? "text-emerald-400" : "text-rose-400"}>
                  {formatAxisPrice(activeHud.close)}
                </strong>
              </span>
              <span className={isUpBar ? "text-emerald-400" : "text-rose-400"}>
                ({barPctChange >= 0 ? "+" : ""}
                {barPctChange.toFixed(2)}%)
              </span>
              <span className="hidden md:inline">
                Vol{" "}
                <strong className="text-slate-300">
                  {formatCompactVol(activeHud.volume)}
                </strong>
              </span>
              <span>
                Eq{" "}
                <strong
                  className={
                    activeHud.equity >= result.config.capital
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }
                >
                  ${Math.round(activeHud.equity).toLocaleString("en-US")}
                </strong>
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500">
              {lang === "tr" ? "Canlı veri akışı bekleniyor..." : "Awaiting live candle feed..."}
            </span>
          )}
        </div>

        {/* Marker Legend & Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden xl:flex items-center gap-2 border-r border-white/[0.08] pr-2.5 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="text-emerald-400">▲</span> L
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-purple-400">▼</span> S
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-amber-400">●</span> TP
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-rose-400">●</span> SL
            </span>
            <span className="text-cyan-400">
              {result.overlayLabel}
            </span>
          </div>

          <div className="flex items-center rounded border border-white/[0.08] bg-[#080B10] p-0.5 text-[10px] mono-nums">
            {[120, 300, 500, 1000].map((cnt) => {
              const active = visibleCount === cnt;
              return (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => applyRangeCount(cnt)}
                  className={`rounded-xs px-1.5 py-0.5 font-medium transition cursor-pointer ${
                    active
                      ? "bg-white/[0.12] text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cnt === 1000 ? (lang === "tr" ? "Tümü" : "All") : cnt}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => applyRangeCount(1000)}
              title={lang === "tr" ? "Tüm seriyi sığdır" : "Fit full series"}
              className="ml-0.5 rounded-xs p-0.5 text-slate-400 hover:bg-white/[0.08] hover:text-white cursor-pointer"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Dual-Pane Lightweight Chart Canvas */}
      <div className="relative h-[400px] sm:h-[465px] w-full bg-[#090C12]">
        <div ref={containerRef} className="h-full w-full" />

        {/* Sub-pane Equity Legend Pill anchored on bottom-left pane divider */}
        <div className="pointer-events-none absolute left-2.5 bottom-[25%] z-10 flex items-center gap-2.5 rounded border border-white/[0.07] bg-[#080B10]/85 px-2 py-0.5 text-[10px] text-slate-400">
          <span className="font-semibold text-slate-200">
            {lang === "tr" ? "KASA EĞRİSİ" : "EQUITY CURVE"}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-400">
            <span className="inline-block h-[2px] w-2.5 border-t border-dashed border-slate-400" />
            {lang === "tr" ? "Tut (B&H)" : "Hold"}
          </span>
          <span className="inline-flex items-center gap-1 text-cyan-300">
            ▲ {lang === "tr" ? "Kör OOS %30 Sınırı" : "Blind OOS 30% Split"}
          </span>
        </div>

        {/* Clean Sync Skeleton while initial 1,000 live bars arrive */}
        {(isLoading || candles.length === 0) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090C12]/90 backdrop-blur-[1px]">
            <div className="flex items-end gap-1.5 opacity-45">
              {[28, 44, 34, 58, 48, 66, 40, 52, 72, 60, 46, 68].map((h, idx) => (
                <div
                  key={idx}
                  style={{ height: `${h}px` }}
                  className={`w-2 rounded-xs animate-pulse ${
                    idx % 3 === 0 ? "bg-rose-500/50" : "bg-emerald-500/50"
                  }`}
                />
              ))}
            </div>
            <p className="mt-3 mono-nums text-xs font-medium tracking-wide text-slate-300">
              {lang === "tr"
                ? `${symbol} · Canlı 1.000 Mum ve Vadeli Veri Senkronize Ediliyor...`
                : `${symbol} · Syncing Live 1,000-Bar Book & Derivatives...`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
