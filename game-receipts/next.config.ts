import type { NextConfig } from "next";

// Cache Components is off: nearly every screen is per-user and reads the
// session cookie, so classic dynamic rendering is the simpler model here.
const nextConfig: NextConfig = {
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
