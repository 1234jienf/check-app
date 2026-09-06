import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas", "jszip", "@xmldom/xmldom"],
};

export default nextConfig;
