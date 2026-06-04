import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
    "@napi-rs/canvas",
    "mammoth",
    "xlsx"
  ],
  // Windows dev: SegmentViewNode manifest 오류·.next 손상 완화
  experimental: {
    devtoolSegmentExplorer: false,
    /** multipart 업로드(발명 분석·전체 작성) — 파일 2개 이상 시 기본 1MB 제한에 걸리지 않도록 */
    serverActions: {
      bodySizeLimit: "50mb"
    }
  },
  webpack: (config, { dev, isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@napi-rs/canvas": false,
        "pdf-parse": false,
        "pdf-parse/worker": false
      };
      config.module.rules.push({
        test: /\.node$/,
        loader: "next/dist/build/webpack/loaders/empty-loader.js"
      });
    }

    // Windows(특히 경로에 공백이 있을 때) CSS/청크 감시 누락 완화
    if (dev && process.platform === "win32") {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300
      };
    }
    return config;
  }
};

export default nextConfig;
