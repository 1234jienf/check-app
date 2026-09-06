import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "jszip", "@xmldom/xmldom"],
};

export default nextConfig;
