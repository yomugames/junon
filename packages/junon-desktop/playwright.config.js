const { defineConfig } = require('@playwright/test')

// Scratch output goes to /tmp, as in packages/junon-io/playwright.config.js
const OUTPUT_DIR = process.env.JUNON_E2E_OUTPUT_DIR || '/tmp/junon-desktop-e2e'

module.exports = defineConfig({
  testDir: './test',
  outputDir: OUTPUT_DIR,
  timeout: 180_000,
  workers: 1,
  retries: 0,
  reporter: [['list']]
})
