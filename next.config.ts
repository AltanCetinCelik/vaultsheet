import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "@polar-sh/sdk"],
};

export default nextConfig;
