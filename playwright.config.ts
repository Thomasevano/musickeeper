import { defineConfig } from '@playwright/test'

// When set, the suite runs against an already deployed target (a Coolify
// preview in CI) instead of booting a local dev server.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL
const builtServer = process.env.PLAYWRIGHT_BUILT_SERVER === 'true'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: externalBaseURL ?? 'http://127.0.0.1:63136',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: builtServer ? 'node bin/server.js' : 'node ace serve --hmr',
        cwd: builtServer ? 'build' : undefined,
        url: 'http://127.0.0.1:63136',
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
        env: {
          HOST: '127.0.0.1',
          PORT: '63136',
          NODE_ENV: builtServer ? 'production' : 'development',
          E2E_TEST_ROUTES: 'true',
          APP_KEY: 'applicationtestappkey',
          SESSION_DRIVER: 'memory',
          LOG_LEVEL: 'info',
          MB_APP_CONTACT_EMAIL: 'test@test.com',
        },
      },
})
