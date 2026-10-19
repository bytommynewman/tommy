import { configDefaults, defineConfig } from 'vitest/config';

// game-receipts/ is a separate Next.js app with its own vitest setup.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, 'game-receipts/**'] },
});
