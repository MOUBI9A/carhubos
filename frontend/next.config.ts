import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // Isolated local QA must not reuse the active application's build output.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Accept the loopback IP used by isolated Playwright tests. Dev-only origin.
  allowedDevOrigins: ["127.0.0.1"],
};

export default withNextIntl(nextConfig);
