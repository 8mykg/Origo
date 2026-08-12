import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // 開発中(npm run dev)はキャッシュを無効化
  workboxOptions: {
    skipWaiting: true, // ★ workboxOptions の中に移動！
  },
});

const nextConfig: NextConfig = {
};
export default withPWA(nextConfig);