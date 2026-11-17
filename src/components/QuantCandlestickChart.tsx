"use client";

import React, { useMemo, useRef, useState } from "react";
import { Activity, ZoomIn } from "lucide-react";
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
}

function formatAxisPrice(val: number): string {
  if (!Number.isFinite(val)) return "$0";
  if (val >= 1000) return `$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (val >= 10) return `$${val.toFixed(2)}`;
  return `$${val.toFixed(4)}`;
}

function formatHudDate(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

export default function QuantCandlestickChart({
  symbol,
  timeframe,
  candles,
  result,
  lang,
}: QuantCandlestickChartProps) {
  const [visibleCount, setVisibleCount] = useState<number>(100);
  const [hoveredLocalIdx, setHoveredLocalIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const W = 760;
  const H = 310;
  const padLeft = 10;
  const padRight = 72;
  const padTop = 18;
  const padBottom = 24;
  const plotW = W - padLeft - padRight;
  const totalPlotH = H - padTop - padBottom;
  const priceAreaH = totalPlotH * 0.8;
  const volAreaTop = padTop + priceAreaH + 6;
  const volAreaH = totalPlotH * 0.16;

  const chartModel = useMemo(() => {
    const total = candles.length;
    if (total === 0) {
      return null;
    }

    const sliceCount = Math.min(total, visibleCount);
    const startIdx = total - sliceCount;
    const slicedCandles = candles.slice(startIdx);
    const slicedUpper = result.overlayUpper.slice(startIdx);
    const slicedLower = result.overlayLower.slice(startIdx);
    const slicedCurve = result.equityCurve.slice(startIdx);

    let minP = Infinity;
    let maxP = -Infinity;
    let maxVol = 0;

    for (let i = 0; i < slicedCandles.length; i++) {
      const c = slicedCandles[i];
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
      const u = slicedUpper[i];
      const l = slicedLower[i];
      if (Number.isFinite(u) && u > 0) {
        if (u > maxP) maxP = u;
        if (u < minP) minP = u;
      }
      if (Number.isFinite(l) && l > 0) {
        if (l > maxP) maxP = l;
        if (l < minP) minP = l;
      }
    }

    if (result.suggestedStopPrice > 0) {
      minP = Math.min(minP, result.suggestedStopPrice * 0.995);
    }
    if (result.suggestedTargetPrice > 0) {
      maxP = Math.max(maxP, result.suggestedTargetPrice * 1.005);
    }

    const rawSpan = Math.max(0.0001, maxP - minP);
    minP = minP - rawSpan * 0.04;
    maxP = maxP + rawSpan * 0.04;
    const spanP = maxP - minP;

    const slotW = plotW / slicedCandles.length;
    const candleW = Math.max(1.8, Math.min(8, slotW * 0.66));

    const toX = (localIdx: number) =>
      Number((padLeft + (localIdx + 0.5) * slotW).toFixed(1));
    const toY = (price: number) =>
      Number((padTop + priceAreaH - ((price - minP) / spanP) * priceAreaH).toFixed(1));

    const upperPath = slicedUpper
      .map((val, idx) =>
        val > 0 ? `${idx === 0 ? "M" : "L"} ${toX(idx)} ${toY(val)}` : ""
      )
      .filter(Boolean)
      .join(" ");

    const lowerPath = slicedLower
      .map((val, idx) =>
        val > 0 ? `${idx === 0 ? "M" : "L"} ${toX(idx)} ${toY(val)}` : ""
      )
      .filter(Boolean)
      .join(" ");

    const priceTicks = [0.15, 0.4, 0.65, 0.9].map((ratio) => {
      const price = minP + spanP * (1 - ratio);
      return { price, y: toY(price) };
    });

    const xTicks = [0.1, 0.36, 0.63, 0.88]
      .map((ratio) => Math.min(slicedCandles.length - 1, Math.floor(slicedCandles.length * ratio)))
      .map((localIdx) => ({
        x: toX(localIdx),
        label: formatHudDate(slicedCandles[localIdx].time),
      }));

    // Map trades occurring inside [startIdx .. total - 1]
    const tradeMarkers: {
      x: number;
      y: number;
      kind: "buy" | "tp" | "sl" | "sig";
      trade: TradeExecution;
    }[] = [];

    const tradeByLocalIdx = new Map<
      number,
      { type: "ENTRY" | TradeExecution["exitReason"]; trade: TradeExecution }
    >();

    for (const t of result.trades) {
      if (t.entryIndex >= startIdx) {
        const localE = t.entryIndex - startIdx;
        const c = slicedCandles[localE];
        if (c) {
          tradeMarkers.push({
            x: toX(localE),
            y: Math.min(padTop + priceAreaH - 4, toY(c.low) + 12),
            kind: "buy",
            trade: t,
          });
          tradeByLocalIdx.set(localE, { type: "ENTRY", trade: t });
        }
      }
      if (t.exitReason !== "OPEN" && t.exitIndex >= startIdx) {
        const localX = t.exitIndex - startIdx;
        const c = slicedCandles[localX];
        if (c) {
          const kind =
            t.exitReason === "TP" ? "tp" : t.exitReason === "SL" ? "sl" : "sig";
          tradeMarkers.push({
            x: toX(localX),
            y: Math.max(padTop + 10, toY(c.high) - 10),
            kind,
            trade: t,
          });
          tradeByLocalIdx.set(localX, { type: t.exitReason, trade: t });
        }
      }
    }

    return {
      startIdx,
      slicedCandles,
      slicedCurve,
      candleW,
      maxVol: Math.max(1, maxVol),
      toX,
      toY,
      upperPath,
      lowerPath,
      priceTicks,
      xTicks,
      tradeMarkers,
      tradeByLocalIdx,
      stopY: result.suggestedStopPrice > 0 ? toY(result.suggestedStopPrice) : null,
      targetY: result.suggestedTargetPrice > 0 ? toY(result.suggestedTargetPrice) : null,
    };
  }, [candles, visibleCount, result, plotW, priceAreaH]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !chartModel) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const clampedX = Math.max(padLeft, Math.min(W - padRight, relX));
    const ratio = (clampedX - padLeft) / plotW;
    const localIdx = Math.max(
      0,
      Math.min(
        chartModel.slicedCandles.length - 1,
        Math.floor(ratio * chartModel.slicedCandles.length)
      )
    );
    setHoveredLocalIdx(localIdx);
  };

  if (!chartModel) return null;

  const inspectIdx =
    hoveredLocalIdx !== null && hoveredLocalIdx < chartModel.slicedCandles.length
      ? hoveredLocalIdx
      : chartModel.slicedCandles.length - 1;
  const activeCandle = chartModel.slicedCandles[inspectIdx];
  const activeCurvePt = chartModel.slicedCurve[inspectIdx];
  const activeTradeEvent = chartModel.tradeByLocalIdx.get(inspectIdx);
  const candleChangePct =
    activeCandle.open > 0
      ? ((activeCandle.close - activeCandle.open) / activeCandle.open) * 100
      : 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-[#050811] p-4 shadow-inner">
      {/* HUD Top Header */}
      <div className="flex flex-col gap-2.5 border-b border-slate-800/80 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Activity className="h-4 w-4 text-emerald-400" />
          <span className="font-bold text-white">
            {symbol} &middot; {timeframe.toUpperCase()}
          </span>
          <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
            {result.overlayLabel}
          </span>
          {activeTradeEvent && (
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                activeTradeEvent.type === "ENTRY"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : activeTradeEvent.type === "TP"
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {activeTradeEvent.type === "ENTRY"
                ? `BUY #${activeTradeEvent.trade.id} @ ${formatAxisPrice(activeTradeEvent.trade.entryPrice)}`
                : `${activeTradeEvent.type} #${activeTradeEvent.trade.id} (${activeTradeEvent.trade.netReturnPct >= 0 ? "+" : ""}${activeTradeEvent.trade.netReturnPct}%)`}
            </span>
          )}
        </div>

        {/* Zoom Bar Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <ZoomIn className="h-3.5 w-3.5 text-slate-400" />
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-[10px] font-bold">
            {[
              { n: 80, label: lang === "tr" ? "80 Mum" : "80 Bars" },
              { n: 150, label: lang === "tr" ? "150 Mum" : "150 Bars" },
              { n: 300, label: lang === "tr" ? "300 Mum" : "300 Bars" },
            ].map((opt) => (
              <button
                key={opt.n}
                type="button"
                onClick={() => {
                  setVisibleCount(opt.n);
                  setHoveredLocalIdx(null);
                }}
                className={`rounded-md px-2 py-1 transition cursor-pointer ${
                  (visibleCount === 100 && opt.n === 80) || visibleCount === opt.n
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live OHLCV + Equity Inspector Strip */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex flex-wrap items-center gap-3 text-slate-300">
          <span className="text-slate-400">{formatHudDate(activeCandle.time)}</span>
          <span>
            O:<strong className="text-white ml-0.5">{formatAxisPrice(activeCandle.open)}</strong>
          </span>
          <span>
            H:<strong className="text-white ml-0.5">{formatAxisPrice(activeCandle.high)}</strong>
          </span>
          <span>
            L:<strong className="text-white ml-0.5">{formatAxisPrice(activeCandle.low)}</strong>
          </span>
          <span>
            C:
            <strong
              className={`ml-0.5 ${
                activeCandle.close >= activeCandle.open ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatAxisPrice(activeCandle.close)}
            </strong>
          </span>
          <span
            className={`font-bold ${
              candleChangePct >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {candleChangePct >= 0 ? "+" : ""}
            {candleChangePct.toFixed(2)}%
          </span>
        </div>

        {activeCurvePt && (
          <span className="text-emerald-400 font-semibold">
            {lang === "tr" ? "Kasa:" : "Equity:"} $
            {Math.round(activeCurvePt.strategyEquity).toLocaleString("en-US")}
          </span>
        )}
      </div>

      {/* Interactive SVG Candlestick Canvas */}
      <div className="mt-2 w-full select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredLocalIdx(null)}
          className="h-64 w-full sm:h-72 cursor-crosshair"
          role="img"
          aria-label="Interactive OHLC candlestick backtest chart"
        >
          {/* Horizontal Price Gridlines + Right Y-Axis */}
          {chartModel.priceTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={W - padRight}
                y2={tick.y}
                stroke="#1e293b"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
              <text
                x={W - padRight + 6}
                y={tick.y + 3}
                fill="#64748b"
                fontSize="9.5"
                fontFamily="monospace"
              >
                {formatAxisPrice(tick.price)}
              </text>
            </g>
          ))}

          {/* X-Axis Timestamps */}
          {chartModel.xTicks.map((tick, idx) => (
            <text
              key={idx}
              x={tick.x}
              y={H - 6}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
              fontFamily="monospace"
            >
              {tick.label}
            </text>
          ))}

          {/* Dashed TP & SL Reference Lines + Price Tags */}
          {chartModel.targetY !== null && (
            <g>
              <line
                x1={padLeft}
                y1={chartModel.targetY}
                x2={W - padRight}
                y2={chartModel.targetY}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity="0.55"
              />
              <rect
                x={W - padRight + 2}
                y={chartModel.targetY - 7}
                width="68"
                height="14"
                rx="3"
                fill="#064e3b"
              />
              <text
                x={W - padRight + 6}
                y={chartModel.targetY + 3}
                fill="#6ee7b7"
                fontSize="8.5"
                fontWeight="bold"
                fontFamily="monospace"
              >
                TP {formatAxisPrice(result.suggestedTargetPrice)}
              </text>
            </g>
          )}

          {chartModel.stopY !== null && (
            <g>
              <line
                x1={padLeft}
                y1={chartModel.stopY}
                x2={W - padRight}
                y2={chartModel.stopY}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity="0.55"
              />
              <rect
                x={W - padRight + 2}
                y={chartModel.stopY - 7}
                width="68"
                height="14"
                rx="3"
                fill="#4c0519"
              />
              <text
                x={W - padRight + 6}
                y={chartModel.stopY + 3}
                fill="#fda4af"
                fontSize="8.5"
                fontWeight="bold"
                fontFamily="monospace"
              >
                SL {formatAxisPrice(result.suggestedStopPrice)}
              </text>
            </g>
          )}

          {/* Indicator Overlay Bands */}
          {chartModel.upperPath && (
            <path
              d={chartModel.upperPath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.25"
              opacity="0.7"
            />
          )}
          {chartModel.lowerPath && (
            <path
              d={chartModel.lowerPath}
              fill="none"
              stroke="#818cf8"
              strokeWidth="1.25"
              opacity="0.7"
            />
          )}

          {/* Volume Histogram + OHLC Candlesticks */}
          {chartModel.slicedCandles.map((c, idx) => {
            const cx = chartModel.toX(idx);
            const yHigh = chartModel.toY(c.high);
            const yLow = chartModel.toY(c.low);
            const yOpen = chartModel.toY(c.open);
            const yClose = chartModel.toY(c.close);
            const bullish = c.close >= c.open;
            const bodyY = Math.min(yOpen, yClose);
            const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));
            const color = bullish ? "#10b981" : "#f43f5e";

            const volBarH = Math.max(1.5, (c.volume / chartModel.maxVol) * volAreaH);
            const volBarY = volAreaTop + (volAreaH - volBarH);

            return (
              <g key={c.time}>
                <rect
                  x={cx - chartModel.candleW / 2}
                  y={volBarY}
                  width={chartModel.candleW}
                  height={volBarH}
                  fill={color}
                  opacity="0.22"
                />
                <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth="1.15" />
                <rect
                  x={cx - chartModel.candleW / 2}
                  y={bodyY}
                  width={chartModel.candleW}
                  height={bodyH}
                  rx="0.6"
                  fill={color}
                />
              </g>
            );
          })}

          {/* Executed BUY / TP / SL Markers */}
          {chartModel.tradeMarkers.map((m, idx) => {
            if (m.kind === "buy") {
              return (
                <g key={`m-${idx}`}>
                  <polygon
                    points={`${m.x},${m.y - 5} ${m.x - 4.5},${m.y + 3} ${m.x + 4.5},${m.y + 3}`}
                    fill="#10b981"
                    stroke="#020617"
                    strokeWidth="0.9"
                  />
                </g>
              );
            }
            const exitColor =
              m.kind === "tp" ? "#fbbf24" : m.kind === "sl" ? "#f43f5e" : "#94a3b8";
            return (
              <g key={`m-${idx}`}>
                <polygon
                  points={`${m.x},${m.y + 5} ${m.x - 4.5},${m.y - 3} ${m.x + 4.5},${m.y - 3}`}
                  fill={exitColor}
                  stroke="#020617"
                  strokeWidth="0.9"
                />
              </g>
            );
          })}

          {/* Interactive Hover Crosshair */}
          {hoveredLocalIdx !== null && (
            <g pointerEvents="none">
              <line
                x1={chartModel.toX(inspectIdx)}
                y1={padTop}
                x2={chartModel.toX(inspectIdx)}
                y2={H - padBottom}
                stroke="#64748b"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <line
                x1={padLeft}
                y1={chartModel.toY(activeCandle.close)}
                x2={W - padRight}
                y2={chartModel.toY(activeCandle.close)}
                stroke="#64748b"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle
                cx={chartModel.toX(inspectIdx)}
                cy={chartModel.toY(activeCandle.close)}
                r="3.5"
                fill="#ffffff"
                stroke="#020617"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
