import HomeLandingClient, { type FaqEntry } from "@/components/HomeLandingClient";
import { CHECKOUT_URLS } from "@/lib/licensing";

const HOME_FAQS_EN: FaqEntry[] = [
  {
    question: "Are all 12 Alpha Radar pairs and Futures data backed by live market feeds?",
    answer:
      "Yes. All 12 free and Pro pairs fetch real OHLCV candles from Binance Spot along with live Binance Perpetual Futures Funding Rates, Open Interest, Whale Long/Short ratios, and Taker flow.",
  },
  {
    question: "Why use VaultSheet Quant instead of TradingView or ChatGPT?",
    answer:
      "VaultSheet prevents curve-fitting by splitting every backtest into 70% In-Sample training and 30% unseen Out-of-Sample verification, tests bi-directional Long/Short intrabar SL/TP with liquidation levels, and dispatches alerts directly to Discord, Telegram, or custom bots without writing Pine Script.",
  },
  {
    question: "Are exchange fees, Short positions, and liquidation prices modeled?",
    answer:
      "Yes. Every trade deducts round-trip exchange fees (0.08% per side x leverage), evaluates both Long and Short intrabar Stop-Loss and Take-Profit levels chronologically, and computes your estimated leveraged liquidation price.",
  },
  {
    question: "Do I need to connect exchange API keys for Discord or Telegram webhooks?",
    answer:
      "Never. All price and futures derivatives calls are public read-only market streams. Your optional Discord Webhook URL or Telegram Bot Token only dispatches non-custodial signal setups (Entry, SL, TP, Liq) to your own channel.",
  },
  {
    question: "What is included Free vs. $12 7-Day Pass & $29/yr Annual Pro?",
    answer:
      "Bi-directional Long/Short backtests across BTC, ETH, SOL, BNB, and PAXG Gold (1H/4H), live Perpetual Futures squeeze intelligence, 1 free 36-setup Auto-Optimize sweep, and webhook test dispatch are free. Upgrading unlocks all 12 pairs, 15m/1D bars, unlimited optimization sweeps, and CSV exports.",
  },
  {
    question: "Are there any recurring auto-renewal charges?",
    answer:
      "No. Both the $12 7-Day Pass and $29 Annual Pro license are one-time payments powered by Polar, with optional cloud account sync for your webhook setup.",
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
      name: "How to Backtest Long/Short Futures Strategies with Walk-Forward OOS & Webhook Alerts",
      description:
        "Simulate 6 bi-directional quantitative algorithms across 12 live Spot and Perpetual Futures pairs with 70/30 Walk-Forward Out-of-Sample validation, live funding squeeze detection, and Discord/Telegram alert dispatch.",
      step: [
        {
          "@type": "HowToStep",
          name: "Scan 12 pairs & live Perpetual Futures derivatives",
          text: "Inspect real OHLCV klines, 8h Funding Rates, Open Interest, Whale Long/Short ratios, and Squeeze risk across all 12 crypto and gold pairs.",
        },
        {
          "@type": "HowToStep",
          name: "Verify 70% Train / 30% Unseen Out-of-Sample performance",
          text: "Switch between Long+Short, Long-Only, or Short-Only modes and inspect unseen OOS returns plus intrabar Buy/Short/TP/SL and Liquidation levels on the OHLC candlestick chart.",
        },
        {
          "@type": "HowToStep",
          name: "Dispatch live setups to Discord, Telegram, or Webhook",
          text: "Enable the 60s Live Sentinel or click Dispatch Signal Now to send verified Entry, SL, TP, Liquidation, and Funding context straight to your trading chat.",
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
