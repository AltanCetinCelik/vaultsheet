import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VaultSheet — 100% Local PDF Bank Statement to Excel & QBO";
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
          backgroundColor: "#070a0f",
          backgroundImage:
            "radial-gradient(circle at 80% 15%, rgba(16,185,129,0.22), transparent 55%)",
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
          <span>VAULTSHEET</span>
          <span style={{ color: "#475569" }}>•</span>
          <span style={{ color: "#94a3b8", fontWeight: 500 }}>LOCAL RAM PARSER</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: "58px", fontWeight: 800, lineHeight: 1.08 }}>
            PDF Bank Statements to Reconciled Excel, QBO &amp; Xero
          </div>
          <div style={{ fontSize: "26px", color: "#94a3b8", lineHeight: 1.35 }}>
            0 KB uploaded to any server. Multi-line memo stitching &amp; cent-by-cent balance
            verification for 64+ global banks.
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
          <span>✓ Browser PDF.js Worker</span>
          <span>✓ Opening + Credits - Debits = Closing</span>
          <span>✓ XLSX · CSV · QBO · OFX · Xero</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
