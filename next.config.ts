import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["maplibre-gl"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "tong.visitkorea.or.kr",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "tong.visitkorea.or.kr",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.visitkorea.or.kr",
        pathname: "/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
