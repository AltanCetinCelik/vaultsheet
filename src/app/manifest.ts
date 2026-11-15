import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VaultSheet — Local PDF Bank Statement Converter",
    short_name: "VaultSheet",
    description:
      "Convert PDF bank statements to Excel, CSV, QuickBooks (.qbo), Xero CSV, and OFX strictly inside browser RAM with zero server uploads.",
    start_url: "/",
    display: "standalone",
    background_color: "#070a0f",
    theme_color: "#10b981",
  };
}
