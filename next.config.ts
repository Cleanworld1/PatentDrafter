import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "xlsx"],
  // Windows dev: SegmentViewNode manifest 오류·.next 손상 완화
  experimental: {
    devtoolSegmentExplorer: false
  }
};

export default nextConfig;
