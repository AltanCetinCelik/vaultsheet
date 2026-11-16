import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "@polar-sh/sdk", "tesseract.js"],
};

export default nextConfig;
