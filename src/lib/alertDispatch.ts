export type AlertChannel = "discord" | "telegram" | "webhook";

export interface AlertSignalPayload {
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

export interface DispatchAlertParams {
  channel: AlertChannel;
  webhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  signal: AlertSignalPayload;
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

export function isSafeExternalHttpsUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:") return null;
    if (isPrivateIpv4OrLocalHost(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function dispatchQuantAlert(
  params: DispatchAlertParams
): Promise<{ ok: boolean; status: number; message: string }> {
  const { channel, webhookUrl, telegramBotToken, telegramChatId, signal } = params;

  if (!signal?.symbol || !signal?.strategyName) {
    return { ok: false, status: 400, message: "Missing active trading signal payload." };
  }

  const fundingLine =
    typeof signal.fundingRatePct === "number"
      ? `${signal.fundingRatePct >= 0 ? "+" : ""}${signal.fundingRatePct.toFixed(4)}%${signal.squeezeLabel ? ` (${signal.squeezeLabel})` : ""}`
      : "N/A";

  const liqLine =
    signal.liquidationPrice && signal.leverage > 1
      ? `${signal.liquidationPrice} (${signal.leverage}x)`
      : "No Liq (1x Spot)";

  if (channel === "discord") {
    const parsed = isSafeExternalHttpsUrl(webhookUrl ?? "");
    if (
      !parsed ||
      (!parsed.hostname.endsWith("discord.com") &&
        !parsed.hostname.endsWith("discordapp.com")) ||
      !parsed.pathname.includes("/api/webhooks/")
    ) {
      return {
        ok: false,
        status: 400,
        message: "Enter a valid https://discord.com/api/webhooks/... URL.",
      };
    }

    const isLong = signal.side === "LONG";
    const discordRes = await fetch(parsed.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "VaultSheet Quant Terminal",
        embeds: [
          {
            title: `${signal.symbol} · ${signal.timeframe.toUpperCase()} — ${signal.signal} (${signal.side})`,
            description: `Strategy: **${signal.strategyName}**`,
            color: isLong ? 0x10b981 : 0xc084fc,
            fields: [
              { name: "Entry Price", value: signal.entryPrice, inline: true },
              { name: "Stop-Loss", value: signal.stopLoss, inline: true },
              { name: "Take-Profit", value: signal.takeProfit, inline: true },
              { name: "Position Size", value: signal.positionUsd, inline: true },
              { name: "Est. Liquidation", value: liqLine, inline: true },
              { name: "Funding & Squeeze", value: fundingLine, inline: true },
              {
                name: "Zero-Leakage Walk-Forward 70/30 OOS",
                value: `Net ${signal.netReturnPct >= 0 ? "+" : ""}${signal.netReturnPct}% | Unseen OOS ${signal.outOfSampleReturnPct >= 0 ? "+" : ""}${signal.outOfSampleReturnPct}% | Win ${signal.winRatePct}%`,
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
      return {
        ok: false,
        status: 502,
        message: `Discord webhook rejected request (HTTP ${discordRes.status}). Check webhook URL.`,
      };
    }

    return {
      ok: true,
      status: 200,
      message: `Delivered ${signal.symbol} ${signal.side} signal to Discord!`,
    };
  }

  if (channel === "telegram") {
    const botToken = (telegramBotToken ?? "").trim();
    const chatId = (telegramChatId ?? "").trim();
    if (!/^[0-9]{6,14}:[A-Za-z0-9_-]{20,64}$/.test(botToken) || !chatId) {
      return {
        ok: false,
        status: 400,
        message:
          "Enter a valid Telegram Bot Token (123456:ABC...) and numeric/channel Chat ID.",
      };
    }

    const textLines = [
      `*VaultSheet Quant Alert — ${signal.symbol} (${signal.timeframe.toUpperCase()})*`,
      `Signal: *${signal.signal}* (${signal.side})`,
      `Strategy: _${signal.strategyName}_`,
      ``,
      `Entry: \`${signal.entryPrice}\``,
      `Stop-Loss: \`${signal.stopLoss}\``,
      `Take-Profit: \`${signal.takeProfit}\``,
      `Position (${signal.leverage}x): \`${signal.positionUsd}\``,
      `Est. Liq: \`${liqLine}\``,
      `Funding / Squeeze: ${fundingLine}`,
      `Zero-Leakage Net: ${signal.netReturnPct >= 0 ? "+" : ""}${signal.netReturnPct}% | Unseen 30% OOS: ${signal.outOfSampleReturnPct >= 0 ? "+" : ""}${signal.outOfSampleReturnPct}% | Win: ${signal.winRatePct}%`,
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
      return {
        ok: false,
        status: 502,
        message: `Telegram API rejected message (HTTP ${tgRes.status}). Check Bot Token & Chat ID.`,
      };
    }

    return {
      ok: true,
      status: 200,
      message: `Delivered ${signal.symbol} ${signal.side} signal to Telegram!`,
    };
  }

  const parsedWebhook = isSafeExternalHttpsUrl(webhookUrl ?? "");
  if (!parsedWebhook) {
    return {
      ok: false,
      status: 400,
      message: "Enter a valid external HTTPS webhook URL.",
    };
  }

  const hookRes = await fetch(parsedWebhook.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "VAULTSHEET_QUANT_SIGNAL",
      dispatchedAt: new Date().toISOString(),
      source: "https://vaultsheet.tech",
      signal,
    }),
  });

  if (!hookRes.ok) {
    return {
      ok: false,
      status: 502,
      message: `Webhook endpoint returned HTTP ${hookRes.status}.`,
    };
  }

  return {
    ok: true,
    status: 200,
    message: `JSON signal payload delivered to ${parsedWebhook.hostname}!`,
  };
}
