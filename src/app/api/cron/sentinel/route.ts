import { NextResponse } from "next/server";
import { dispatchQuantAlert, type AlertChannel } from "@/lib/alertDispatch";
import {
  decryptCloudSecret,
  getServerSigningSecret,
  verifySentinelToken,
} from "@/lib/cryptoSettings";
import {
  fetchCandlesWithFallback,
  fetchDerivativesPulseWithFallback,
  QUANT_ASSETS,
} from "@/lib/marketData";
import {
  assessDerivativesSqueeze,
  optimizeStrategyConfig,
  type BacktestResult,
  type DerivativesPulse,
  type TimeframeId,
  type TradeDirectionMode,
} from "@/lib/quantBacktester";

export const dynamic = "force-dynamic";

interface PolarCustomer {
  id: string;
  email: string;
  name?: string | null;
  metadata?: Record<string, string | number | boolean> | null;
}

function getPolarApiBase(): string {
  const configured =
    process.env.POLAR_SERVER?.trim().toLowerCase() ??
    process.env.POLAR_ENVIRONMENT?.trim().toLowerCase();
  return configured === "sandbox"
    ? "https://sandbox-api.polar.sh"
    : "https://api.polar.sh";
}

function formatPriceStr(val: number): string {
  if (!Number.isFinite(val)) return "$0.00";
  const decimals = val >= 100 ? 2 : val >= 5 ? 2 : 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

async function polarFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(`${getPolarApiBase()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function runSentinelHandler(request: Request) {
  const url = new URL(request.url);
  const uid = url.searchParams.get("uid")?.trim() ?? "";
  const sig = url.searchParams.get("sig")?.trim() ?? "";
  const force = url.searchParams.get("force") === "1";

  const token = process.env.POLAR_ACCESS_TOKEN?.trim();
  const cryptoSecret = getServerSigningSecret() || token || "";
  if (!token || !cryptoSecret) {
    return NextResponse.json(
      { ok: false, message: "Server configuration missing Polar credentials." },
      { status: 500 }
    );
  }

  let customersToScan: PolarCustomer[] = [];

  if (uid && sig) {
    if (!verifySentinelToken(uid, sig, cryptoSecret)) {
      return NextResponse.json(
        { ok: false, message: "Invalid personal sentinel signature." },
        { status: 401 }
      );
    }
    const cust = await polarFetch<PolarCustomer>(
      `/v1/customers/${encodeURIComponent(uid)}`,
      token
    );
    if (!cust) {
      return NextResponse.json(
        { ok: false, message: "Customer profile not found." },
        { status: 404 }
      );
    }
    customersToScan = [cust];
  } else {
    const authHeader = request.headers.get("authorization") ?? "";
    const cronHeader = request.headers.get("x-vercel-cron");
    const expectedSecret =
      process.env.CRON_SECRET?.trim() || process.env.POLAR_WEBHOOK_SECRET?.trim() || "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!cronHeader && (!expectedSecret || bearerToken !== expectedSecret)) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized cron invocation." },
        { status: 401 }
      );
    }

    const listRes = await polarFetch<{ items: PolarCustomer[] }>(
      `/v1/customers/?limit=100`,
      token
    );
    customersToScan = (listRes?.items ?? []).filter(
      (c) => c.metadata?.vs_sentinel_active === "1"
    );
  }

  const evalCache = new Map<
    string,
    { best: BacktestResult; derivatives: DerivativesPulse; lastBarTime: number }
  >();

  let dispatchedCount = 0;
  let evaluatedPairs = 0;
  const reports: {
    customerEmail: string;
    scannedSymbols: string[];
    triggered: string[];
    dispatched: string[];
    errors: string[];
  }[] = [];

  for (const cust of customersToScan) {
    const meta = cust.metadata ?? {};
    const channelRaw = meta.vs_alert_channel;
    const channel: AlertChannel =
      channelRaw === "telegram" || channelRaw === "webhook" ? channelRaw : "discord";
    const webhookUrl = typeof meta.vs_webhook_url === "string" ? meta.vs_webhook_url : "";
    const telegramChatId = typeof meta.vs_tg_chat_id === "string" ? meta.vs_tg_chat_id : "";
    const encryptedTgToken =
      typeof meta.vs_tg_token_enc === "string" ? meta.vs_tg_token_enc : "";
    const telegramBotToken = encryptedTgToken
      ? decryptCloudSecret(encryptedTgToken, cryptoSecret)
      : "";

    const rawTf = meta.vs_sentinel_tf;
    const tf: TimeframeId =
      rawTf === "15m" || rawTf === "1h" || rawTf === "4h" || rawTf === "1d" ? rawTf : "4h";
    const rawDir = meta.vs_sentinel_dir;
    const dir: TradeDirectionMode =
      rawDir === "long" || rawDir === "short" ? rawDir : "both";

    const allowedSet = new Set(QUANT_ASSETS.map((a) => a.symbol));
    const requestedSymbols =
      typeof meta.vs_sentinel_symbols === "string" && meta.vs_sentinel_symbols.trim()
        ? meta.vs_sentinel_symbols
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter((s) => allowedSet.has(s))
        : ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

    const sentKeysSet = new Set(
      (typeof meta.vs_sentinel_last_keys === "string" ? meta.vs_sentinel_last_keys : "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );

    const triggered: string[] = [];
    const dispatched: string[] = [];
    const errors: string[] = [];
    let metadataChanged = false;

    for (const sym of requestedSymbols.slice(0, 12)) {
      const cacheKey = `${sym}:${tf}:${dir}`;
      let entry = evalCache.get(cacheKey);
      if (!entry) {
        evaluatedPairs += 1;
        const { candles } = await fetchCandlesWithFallback(sym, tf, 400);
        const { pulse } = await fetchDerivativesPulseWithFallback(sym, tf, candles, "FLAT");
        const { best } = optimizeStrategyConfig(
          candles,
          10000,
          2,
          dir,
          pulse.fundingRatePct,
          tf
        );
        entry = {
          best,
          derivatives: pulse,
          lastBarTime: candles[candles.length - 1]?.time ?? 0,
        };
        evalCache.set(cacheKey, entry);
      }

      const { best, derivatives, lastBarTime } = entry;
      const isFresh =
        best.currentSignal === "ENTRY_NOW" || best.currentSignal === "SHORT_NOW";
      const shouldFire = force ? best.currentSignal !== "FLAT" : isFresh;

      if (!shouldFire) continue;
      triggered.push(`${sym}:${best.currentSignal}`);

      const dedupKey = `${sym}:${tf}:${best.currentSignal}:${lastBarTime}`;
      if (!force && sentKeysSet.has(dedupKey)) {
        continue;
      }

      const sq = assessDerivativesSqueeze(
        derivatives.fundingRatePct,
        derivatives.whaleLongPct,
        derivatives.takerBuySellRatio,
        best.currentSignal
      );

      const entryPrice = best.activeEntryPrice ?? derivatives.markPrice;
      const sendRes = await dispatchQuantAlert({
        channel,
        webhookUrl,
        telegramBotToken,
        telegramChatId,
        signal: {
          symbol: sym,
          timeframe: tf,
          strategyName: best.nameEn,
          signal: best.currentSignal,
          side: best.activeSide,
          entryPrice: formatPriceStr(entryPrice),
          stopLoss: formatPriceStr(best.suggestedStopPrice),
          takeProfit: formatPriceStr(best.suggestedTargetPrice),
          liquidationPrice:
            best.estimatedLiquidationPrice > 0
              ? formatPriceStr(best.estimatedLiquidationPrice)
              : undefined,
          leverage: 2,
          positionUsd: "$20,000",
          netReturnPct: best.netProfitPct,
          outOfSampleReturnPct: best.outOfSampleReturnPct,
          winRatePct: best.winRatePct,
          fundingRatePct: derivatives.fundingRatePct,
          squeezeLabel: sq.squeezeLabelEn,
        },
      });

      if (sendRes.ok) {
        dispatchedCount += 1;
        dispatched.push(`${sym}:${best.currentSignal}`);
        sentKeysSet.add(dedupKey);
        metadataChanged = true;
      } else {
        errors.push(`${sym}: ${sendRes.message}`);
      }
    }

    if (metadataChanged) {
      const nextKeys = Array.from(sentKeysSet).slice(-14).join(",");
      await polarFetch(`/v1/customers/${encodeURIComponent(cust.id)}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          metadata: {
            ...meta,
            vs_sentinel_last_keys: nextKeys,
            vs_sentinel_last_run: new Date().toISOString(),
          },
        }),
      });
    }

    reports.push({
      customerEmail: cust.email.replace(/(^.).*(@.*$)/, "$1***$2"),
      scannedSymbols: requestedSymbols.slice(0, 12),
      triggered,
      dispatched,
      errors,
    });
  }

  return NextResponse.json({
    ok: true,
    scannedCustomers: customersToScan.length,
    evaluatedPairs,
    dispatchedCount,
    reports,
    ranAt: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  return runSentinelHandler(request);
}

export async function POST(request: Request) {
  return runSentinelHandler(request);
}
