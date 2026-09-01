import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs 는 서버(라우트 핸들러·서버 액션)에서만 쓴다. 번들링 대신 외부 모듈로 처리.
  serverExternalPackages: ["exceljs"],
  experimental: {
    // 고객 Excel 불러오기: 서버 액션으로 .xlsx 업로드를 받는다.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
