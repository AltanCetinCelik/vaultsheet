import { NextResponse } from "next/server";
import {
  fetchCandlesWithFallback,
  fetchDerivativesPulseWithFallback,
  fetchMtfConfluenceServer,
  fetchRadarSnapshotServer,
} from "@/lib/marketData";
import type { TimeframeId, TradeDirectionMode } from "@/lib/quantBacktester";

export const dynamic = "force-dynamic";

const ALLOWED_TFS = new Set<TimeframeId>(["15m", "1h", "4h", "1d"]);
const ALLOWED_DIRS = new Set<TradeDirectionMode>(["both", "long", "short"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "detail";
  const rawTf = (url.searchParams.get("tf") || "4h") as TimeframeId;
  const tf: TimeframeId = ALLOWED_TFS.has(rawTf) ? rawTf : "4h";
  const rawDir = (url.searchParams.get("dir") || "both") as TradeDirectionMode;
  const dir: TradeDirectionMode = ALLOWED_DIRS.has(rawDir) ? rawDir : "both";

  if (mode === "radar") {
    const radar = await fetchRadarSnapshotServer(tf, dir);
    return NextResponse.json(
      {
        ok: true,
        rows: radar.rows,
        source: radar.source,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      }
    );
  }

  const rawSymbol = (url.searchParams.get("symbol") || "BTCUSDT").trim().toUpperCase();
  const symbol = /^[A-Z0-9]{4,16}$/.test(rawSymbol) ? rawSymbol : "BTCUSDT";
  const limitRaw = Number(url.searchParams.get("limit") || "1000");
  const limit = Number.isFinite(limitRaw)
    ? Math.max(100, Math.min(1000, Math.round(limitRaw)))
    : 1000;
  const levRaw = Number(url.searchParams.get("leverage") || "2");
  const leverage = Number.isFinite(levRaw) ? Math.max(1, Math.min(20, levRaw)) : 2;
  const includeMtf = url.searchParams.get("mtf") !== "0";

  const { candles, source } = await fetchCandlesWithFallback(symbol, tf, limit);
  const deriv = await fetchDerivativesPulseWithFallback(symbol, tf, candles, "FLAT");
  const mtf = includeMtf
    ? await fetchMtfConfluenceServer(symbol, dir, leverage, deriv.pulse.fundingRatePct)
    : [];

  return NextResponse.json(
    {
      ok: true,
      symbol,
      timeframe: tf,
      candles,
      source,
      derivatives: deriv.pulse,
      derivativesSource: deriv.source,
      mtf,
      fetchedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    }
  );
}
