import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AlertChannel = "discord" | "telegram" | "webhook";

interface AlertSignalPayload {
  symbol: string;
  timeframe: string;
  strategyName: string;
  signal: string;
  side: "LONG" | "SHORT";
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  liquidationPrice?: string;
  leverage: number;
  positionUsd: string;
  netReturnPct: number;
  outOfSampleReturnPct: number;
  winRatePct: number;
  fundingRatePct?: number;
  squeezeLabel?: string;
}

interface AlertRequestBody {
  channel?: AlertChannel;
  webhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  signal?: AlertSignalPayload;
}

function isPrivateIpv4OrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower === "0.0.0.0" ||
    lower === "127.0.0.1" ||
    lower === "::1" ||
    lower === "[::1]" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return true;
  }

  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) return false;

  const a = Number(ipv4Match[1]);
  const b = Number(ipv4Match[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isSafeExternalHttpsUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:") return null;
    if (isPrivateIpv4OrLocalHost(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AlertRequestBody;
    const channel = body.channel ?? "discord";
    const sig = body.signal;

    if (!sig?.symbol || !sig?.strategyName) {
      return NextResponse.json(
        { ok: false, message: "Missing active trading signal payload." },
        { status: 400 }
      );
    }

    const fundingLine =
      typeof sig.fundingRatePct === "number"
        ? `${sig.fundingRatePct >= 0 ? "+" : ""}${sig.fundingRatePct.toFixed(4)}%${sig.squeezeLabel ? ` (${sig.squeezeLabel})` : ""}`
        : "N/A";

    const liqLine =
      sig.liquidationPrice && sig.leverage > 1
        ? `${sig.liquidationPrice} (${sig.leverage}x)`
        : "No Liq (1x Spot)";

    if (channel === "discord") {
      const parsed = isSafeExternalHttpsUrl(body.webhookUrl ?? "");
      if (
        !parsed ||
        (!parsed.hostname.endsWith("discord.com") &&
          !parsed.hostname.endsWith("discordapp.com")) ||
        !parsed.pathname.includes("/api/webhooks/")
      ) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Enter a valid https://discord.com/api/webhooks/... URL.",
          },
          { status: 400 }
        );
      }

      const isLong = sig.side === "LONG";
      const discordRes = await fetch(parsed.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "VaultSheet Quant Terminal",
          embeds: [
            {
              title: `${sig.symbol} · ${sig.timeframe.toUpperCase()} — ${sig.signal} (${sig.side})`,
              description: `Strategy: **${sig.strategyName}**`,
              color: isLong ? 0x10b981 : 0xc084fc,
              fields: [
                { name: "Entry Price", value: sig.entryPrice, inline: true },
                { name: "Stop-Loss", value: sig.stopLoss, inline: true },
                { name: "Take-Profit", value: sig.takeProfit, inline: true },
                { name: "Position Size", value: sig.positionUsd, inline: true },
                { name: "Est. Liquidation", value: liqLine, inline: true },
                { name: "Funding & Squeeze", value: fundingLine, inline: true },
                {
                  name: "Walk-Forward Validation",
                  value: `Net ${sig.netReturnPct >= 0 ? "+" : ""}${sig.netReturnPct}% | Unseen OOS ${sig.outOfSampleReturnPct >= 0 ? "+" : ""}${sig.outOfSampleReturnPct}% | Win ${sig.winRatePct}%`,
                  inline: false,
                },
              ],
              footer: { text: "VaultSheet Quant · https://vaultsheet.tech" },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      if (!discordRes.ok) {
        return NextResponse.json(
          {
            ok: false,
            message: `Discord webhook rejected request (HTTP ${discordRes.status}). Check webhook URL.`,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: `Delivered ${sig.symbol} ${sig.side} signal to Discord!`,
      });
    }

    if (channel === "telegram") {
      const botToken = (body.telegramBotToken ?? "").trim();
      const chatId = (body.telegramChatId ?? "").trim();
      if (!/^[0-9]{6,14}:[A-Za-z0-9_-]{20,64}$/.test(botToken) || !chatId) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Enter a valid Telegram Bot Token (123456:ABC...) and numeric/channel Chat ID.",
          },
          { status: 400 }
        );
      }

      const textLines = [
        `*VaultSheet Quant Alert — ${sig.symbol} (${sig.timeframe.toUpperCase()})*`,
        `Signal: *${sig.signal}* (${sig.side})`,
        `Strategy: _${sig.strategyName}_`,
        ``,
        `Entry: \`${sig.entryPrice}\``,
        `Stop-Loss: \`${sig.stopLoss}\``,
        `Take-Profit: \`${sig.takeProfit}\``,
        `Position (${sig.leverage}x): \`${sig.positionUsd}\``,
        `Est. Liq: \`${liqLine}\``,
        `Funding / Squeeze: ${fundingLine}`,
        `Backtest: ${sig.netReturnPct >= 0 ? "+" : ""}${sig.netReturnPct}% | OOS 30%: ${sig.outOfSampleReturnPct >= 0 ? "+" : ""}${sig.outOfSampleReturnPct}% | Win: ${sig.winRatePct}%`,
      ].join("\n");

      const tgRes = await fetch(
        `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: textLines,
            parse_mode: "Markdown",
          }),
        }
      );

      if (!tgRes.ok) {
        return NextResponse.json(
          {
            ok: false,
            message: `Telegram API rejected message (HTTP ${tgRes.status}). Check Bot Token & Chat ID (bot must be started/added first).`,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: `Delivered ${sig.symbol} ${sig.side} signal to Telegram!`,
      });
    }

    // Custom JSON Webhook (3Commas / n8n / Zapier / Own Bot)
    const parsedWebhook = isSafeExternalHttpsUrl(body.webhookUrl ?? "");
    if (!parsedWebhook) {
      return NextResponse.json(
        {
          ok: false,
          message: "Enter a valid external HTTPS webhook URL.",
        },
        { status: 400 }
      );
    }

    const hookRes = await fetch(parsedWebhook.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "VAULTSHEET_QUANT_SIGNAL",
        dispatchedAt: new Date().toISOString(),
        source: "https://vaultsheet.tech",
        signal: sig,
      }),
    });

    if (!hookRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: `Webhook endpoint returned HTTP ${hookRes.status}.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `JSON signal payload delivered to ${parsedWebhook.hostname}!`,
    });
  } catch (error) {
    console.error("Alert dispatch error:", error);
    return NextResponse.json(
      { ok: false, message: "Could not dispatch signal webhook. Retry shortly." },
      { status: 500 }
    );
  }
}
