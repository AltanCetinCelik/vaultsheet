import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VaultSheet Quant — Live Futures Squeeze & OOS Strategy Backtester";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          backgroundColor: "#050811",
          backgroundImage:
            "radial-gradient(circle at 80% 15%, rgba(16,185,129,0.24), transparent 55%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: "24px",
            color: "#34d399",
            fontWeight: 700,
          }}
        >
          <span>VAULTSHEET QUANT</span>
          <span style={{ color: "#475569" }}>•</span>
          <span style={{ color: "#94a3b8", fontWeight: 500 }}>
            LIVE PERPETUAL &amp; SPOT ENGINE
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: "54px", fontWeight: 800, lineHeight: 1.08 }}>
            Bi-Directional Quant Backtester &amp; 12-Pair Futures Squeeze Radar
          </div>
          <div style={{ fontSize: "26px", color: "#94a3b8", lineHeight: 1.35 }}>
            70/30 Walk-Forward Out-of-Sample validation, live Binance Funding / Open Interest /
            Whale ratios &amp; instant Discord / Telegram webhook alerts.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
            fontSize: "20px",
            color: "#e2e8f0",
          }}
        >
          <span>✓ Long + Short + Liquidation</span>
          <span>✓ 30% Unseen OOS Validation</span>
          <span>✓ Funding · OI · Webhook Dispatch</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
