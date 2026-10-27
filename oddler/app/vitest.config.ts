import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  // Only the game's own suites: the vendored packages/** carry their own DOM tests.
  test: { include: ["tests/**/*.test.ts"] },
});
