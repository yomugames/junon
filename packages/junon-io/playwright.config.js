const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: require.resolve('./test/e2e/global-setup.js'),
  use: {
    baseURL: 'http://localhost:8001',
    trace: 'retain-on-failure'
  },
  reporter: [['list']]
})
