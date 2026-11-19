import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration suites share one emulator; run files sequentially.
    fileParallelism: false,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['packages/*/src/**/*.test.ts', 'functions/src/**/*.test.ts', 'apps/web/src/**/*.test.{ts,tsx}'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          testTimeout: 30000,
          hookTimeout: 60000,
        },
      },
    ],
  },
});
