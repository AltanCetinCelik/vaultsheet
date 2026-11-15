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
  title: {
    default: "VaultSheet — 100% Local PDF Bank Statement to Excel, CSV & QBO Converter",
    template: "%s | VaultSheet",
  },
  description:
    "Convert PDF bank statements from 60+ global banks to Excel (.xlsx), QuickBooks (.qbo), Xero CSV, and OFX strictly inside browser memory. Zero server uploads. Cent-reconciled balances.",
  keywords: [
    "pdf bank statement to excel",
    "bank statement converter",
    "pdf to csv bank statement",
    "pdf to qbo quickbooks",
    "pdf to xero csv",
    "local private bank statement parser",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "VaultSheet — Privacy-First PDF Bank Statement to Excel & QBO",
    description:
      "Process Chase, Wise, Revolut, Mercury, and 60+ bank PDFs strictly inside your browser RAM with cent-by-cent balance reconciliation.",
    siteName: "VaultSheet",
  },
  twitter: {
    card: "summary_large_image",
    title: "VaultSheet — Local PDF Bank Statement to Excel, CSV & QBO",
    description:
      "Zero server uploads. Browser-local PDF coordinate parser with multi-line stitching and cent-level audit verification.",
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
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "VaultSheet",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any (Web Browser, Chrome Extension)",
    description:
      "Privacy-first local PDF bank statement to Excel, QuickBooks (.qbo), Xero CSV, and OFX converter running 100% in browser memory.",
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free Preview" },
      { "@type": "Offer", price: "12", priceCurrency: "USD", name: "7-Day Tax & Audit Pass" },
      { "@type": "Offer", price: "29", priceCurrency: "USD", name: "Annual Pro Bookkeeper Pass" },
    ],
  };

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
