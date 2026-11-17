import HomeLandingClient, { type FaqEntry } from "@/components/HomeLandingClient";
import { CHECKOUT_URLS } from "@/lib/licensing";

const HOME_FAQS_EN: FaqEntry[] = [
  {
    question: "Does this backtester use real market OHLCV candles?",
    answer:
      "Yes. It pulls the latest 300 real historical OHLCV candles (15m, 1H, 4H, 1D) from Binance market data, with a deterministic seeded fallback when offline.",
  },
  {
    question: "Why use VaultSheet Quant instead of ChatGPT or TradingView?",
    answer:
      "ChatGPT cannot fetch 300 OHLCV bars and simulate intrabar High/Low Stop-Loss & Take-Profit execution deterministically. VaultSheet runs 6 proven algorithms side-by-side and sweeps 36 SL/TP combinations in under 25ms without writing Pine Script.",
  },
  {
    question: "Are exchange trading fees and intrabar SL/TP checks included?",
    answer:
      "Yes. Every simulated trade deducts round-trip exchange fees (0.08% per side x leverage) and checks each subsequent candle's low against Stop-Loss before checking high against Take-Profit.",
  },
  {
    question: "Do I need to enter my exchange API keys?",
    answer:
      "Never. All candle fetches are read-only public market feeds and 100% of indicator math and equity curve calculations run inside local browser memory.",
  },
  {
    question: "What is included Free vs. 7-Day Pass & Annual Pro?",
    answer:
      "Full 6-strategy backtests on BTC, ETH, SOL, BNB, and PAXG Gold (1H & 4H) plus 1 free 36-setup Auto-Optimize sweep are free. Upgrading to the $12 7-Day Pass or $29/year Annual Pro unlocks all 12 Alpha Radar assets, 15m/1D bars, unlimited optimizations, and CSV trade exports.",
  },
  {
    question: "Are there any recurring auto-renewal charges?",
    answer:
      "No. Both the $12 7-Day Pass and $29 Annual Pro license are strictly one-time payments powered by Polar.",
  },
];

export default function HomePage() {
  const passCheckout =
    CHECKOUT_URLS.pass7Day === "#pricing" ? "#workbench" : CHECKOUT_URLS.pass7Day;
  const proCheckout =
    CHECKOUT_URLS.proMonthly === "#pricing" ? "#workbench" : CHECKOUT_URLS.proMonthly;

  const homeSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: HOME_FAQS_EN.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to Backtest & Auto-Optimize Crypto & Gold Trading Strategies on Live Candles",
      description:
        "Simulate 6 quantitative algorithms across 300 real OHLCV candles with intrabar Stop-Loss/Take-Profit execution, fee deduction, and 36-setup parameter sweeps.",
      step: [
        {
          "@type": "HowToStep",
          name: "Pick an asset from the 12-Asset Alpha Radar",
          text: "Scan BTC, ETH, SOL, BNB, PAXG Gold, and Pro altcoins across 15m, 1H, 4H, or 1D real candle feeds.",
        },
        {
          "@type": "HowToStep",
          name: "Inspect the OHLC candlestick chart and 6-strategy tournament",
          text: "Hover any candle for exact Buy/TP/SL markers and compare Net Profit %, Win Rate, Profit Factor, and Max Drawdown across all 6 algorithms.",
        },
        {
          "@type": "HowToStep",
          name: "Run the 36-setup Auto-Optimizer",
          text: "Sweep 36 SL/TP and strategy pairings in under 25ms to surface optimal risk-adjusted parameters and actionable order levels.",
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchemas) }}
      />
      <HomeLandingClient
        passCheckout={passCheckout}
        proCheckout={proCheckout}
        faqsEn={HOME_FAQS_EN}
      />
    </>
  );
}
