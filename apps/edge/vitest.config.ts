import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Node-based unit tests cannot import Cloudflare's runtime-only module.
    alias: {
      'cloudflare:workers': fileURLToPath(
        new URL('./src/testing/durable-object.ts', import.meta.url),
      ),
    },
  },
  test: { environment: 'node' },
});
