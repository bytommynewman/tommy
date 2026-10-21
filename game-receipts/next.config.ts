import type { NextConfig } from "next";

// Cache Components is off: nearly every screen is per-user and reads the
// session cookie, so classic dynamic rendering is the simpler model here.
const nextConfig: NextConfig = {
  // The floating dev badge sits on top of the mobile tab bar.
  devIndicators: false,
  // Avatar uploads go through a Server Action (8 MB image cap, validated again server-side).
  experimental: { serverActions: { bodySizeLimit: "9mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
