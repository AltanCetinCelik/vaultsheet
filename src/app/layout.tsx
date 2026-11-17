import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vaultsheet.tech";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  title: {
    default: "VaultSheet Quant — Live Crypto & Futures Backtester, OOS Scanner & Webhook Alerts",
    template: "%s | VaultSheet Quant",
  },
  description:
    "Backtest bi-directional Long/Short quant strategies on live Binance Spot & Futures OHLCV candles. Verify with 70/30 Walk-Forward Out-of-Sample validation, live funding squeeze intelligence, and Discord/Telegram webhook alerts.",
  keywords: [
    "crypto strategy backtester",
    "binance futures squeeze scanner",
    "walk forward out of sample backtest",
    "funding rate open interest radar",
    "discord telegram trading webhook alerts",
    "no code quantitative backtesting",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "VaultSheet Quant — Bi-Directional Backtester & Live Futures Squeeze Radar",
    description:
      "Test 6 algorithms across 12 live crypto & gold pairs with 70/30 Walk-Forward OOS verification, Binance funding/OI squeeze detection, and instant Discord/Telegram webhook alerts.",
    siteName: "VaultSheet Quant",
  },
  twitter: {
    card: "summary_large_image",
    title: "VaultSheet Quant — Live Futures Backtester & Squeeze Radar",
    description:
      "6 algorithms, bi-directional Long/Short execution, 70/30 Walk-Forward OOS validation, live Binance Futures funding & instant Discord/Telegram alerts.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const softwareSchema = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "VaultSheet Quant",
      url: SITE_URL,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any (Web Browser)",
      description:
        "Institutional crypto & gold quantitative backtester, 12-pair perpetual futures funding squeeze scanner, 70/30 Walk-Forward OOS optimizer, and Discord/Telegram webhook alert dispatcher.",
      featureList: [
        "12-Asset Live Binance Spot & Perpetual Futures Scanner",
        "Bi-directional Long & Short intrabar SL/TP backtesting with fees",
        "70% In-Sample / 30% Out-of-Sample Walk-Forward anti-overfit validation",
        "Live Binance Futures Funding Rate, Open Interest, Whale Long/Short & Squeeze detection",
        "Instant Discord, Telegram & JSON Webhook signal dispatcher",
      ],
      offers: [
        { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free Quant Starter Account" },
        { "@type": "Offer", price: "12", priceCurrency: "USD", name: "7-Day Quant Pro Pass" },
        { "@type": "Offer", price: "29", priceCurrency: "USD", name: "Annual Quant Pro Pass" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "VaultSheet Quant",
      url: SITE_URL,
      email: "support@vaultsheet.tech",
    },
  ];

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
        {children}
      </body>
    </html>
  );
}
