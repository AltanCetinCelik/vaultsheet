import HomeLandingClient, { type FaqEntry } from "@/components/HomeLandingClient";
import { CHECKOUT_URLS } from "@/lib/licensing";
import { SEO_BANKS } from "@/lib/seoCatalog";

const HOME_FAQS_EN: FaqEntry[] = [
  {
    question: "Are my PDF bank statements ever uploaded to a server?",
    answer:
      "Never. VaultSheet runs pdfjs-dist extraction, local Tesseract OCR, balance reconciliation, and tax/leak forensics strictly inside your local browser memory (RAM). You can disconnect Wi-Fi or inspect Chrome DevTools -> Network tab to confirm zero bytes leave your computer.",
  },
  {
    question: "How do the Live Market Terminal and Statement Leak Studio connect?",
    answer:
      "Any recurring subscriptions or hidden bank fees you flag or cut in the Leaks, Tax & Legal Audit Studio automatically boost your 12-month / 20-trade portfolio curve inside the Live Market & Risk Terminal.",
  },
  {
    question: "What is included Free vs. Paid 7-Day Pass & Annual Pro?",
    answer:
      "The Live Market & Risk Terminal, Spend Leak & Tax Shield calculators, legal notice generator, and 1st full uploaded statement Excel (.xlsx) export (up to 100 rows) are free. Upgrading to the $12 7-Day Pass or $29/year Pro License unlocks unlimited rows, multi-PDF merging, unlimited Excel (.xlsx), QuickBooks (.qbo), and CPA Audit Certificate PDFs.",
  },
  {
    question: "How does VaultSheet prevent missing transactions or OCR math errors?",
    answer:
      "Every parsed statement runs through deterministic cent-level reconciliation: Opening Balance + Deposits - Withdrawals = Closing Balance. Multi-line wrapped descriptions are stitched automatically and any cent discrepancy is highlighted inline.",
  },
  {
    question: "Which accounting software formats and banks are supported?",
    answer:
      "VaultSheet supports 64+ bank and format profiles including Chase, Bank of America, Wells Fargo, Mercury, Wise, Revolut, Monzo, HSBC, RBC, and Garanti BBVA (TRY)—exporting 3-sheet .XLSX, QuickBooks .QBO (without OL-222 errors), QuickBooks CSV, Xero CSV, OFX, JSON, and Audit Certificate PDFs.",
  },
  {
    question: "What if a statement is scanned or password-protected?",
    answer:
      "Password-protected PDFs trigger a local unlock modal cleanly in browser RAM, while image/scanned PDFs run browser-local Tesseract OCR without sending pages to external servers.",
  },
];

const FEATURED_SLUGS = [
  "chase-pdf-to-excel",
  "wise-pdf-to-excel",
  "mercury-pdf-to-excel",
  "revolut-pdf-to-excel",
  "bank-of-america-pdf-to-excel",
  "hsbc-pdf-to-excel",
  "monzo-pdf-to-excel",
  "n26-pdf-to-excel",
  "rbc-royal-bank-pdf-to-excel",
  "commbank-pdf-to-excel",
  "payoneer-pdf-to-excel",
  "pdf-bank-statement-to-qbo",
];

const REGION_COUNTS = (["US", "UK", "EU", "Canada", "Australia", "Global", "Format"] as const).map(
  (region) => ({
    region,
    count: SEO_BANKS.filter((b) => b.region === region).length,
  })
);

export default function HomePage() {
  const featuredBanks = FEATURED_SLUGS.map((slug) =>
    SEO_BANKS.find((entry) => entry.slug === slug)
  ).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

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
      name: "How to Manage Risk, Cut Spend Leaks, and Convert Bank PDFs Locally",
      description:
        "Size market positions with live anomaly scanning, uncover subscription leaks & tax write-offs, and convert PDF bank statements to Excel (.xlsx) & QuickBooks (.qbo) strictly in browser RAM.",
      step: [
        {
          "@type": "HowToStep",
          name: "Scan live market pairs or upload your bank PDF",
          text: "Monitor 24h market range momentum in the Risk Terminal or drop digital, scanned OCR, and encrypted bank PDFs locally in browser RAM.",
        },
        {
          "@type": "HowToStep",
          name: "Verify cent-level math and audit leaks & tax shields",
          text: "Confirm Opening + Deposits - Withdrawals = Closing balance with 0.00 diff, cut recurring subscriptions, and calculate KDV & income tax shields.",
        },
        {
          "@type": "HowToStep",
          name: "Download Excel (.xlsx), QuickBooks (.qbo), or Legal Notices",
          text: "Export clean spreadsheets (1st full file free), Web Connect (.qbo), Xero CSV, CPA Audit PDFs, or formal 6502/BDDK notices in one click.",
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
        totalBanks={SEO_BANKS.length}
        featuredBanks={featuredBanks}
        regionCounts={REGION_COUNTS}
        passCheckout={passCheckout}
        proCheckout={proCheckout}
        faqsEn={HOME_FAQS_EN}
      />
    </>
  );
}
