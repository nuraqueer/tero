import { defineConfig } from 'vitest/config';

// Test workspaces must not load the root TanStack Start application plugin.
export default defineConfig({ test: { environment: 'node' } });
