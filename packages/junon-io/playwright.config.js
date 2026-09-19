const { defineConfig } = require('@playwright/test')

// Artifacts (videos, traces, screenshots) are scratch output from a test run,
// not part of the repo, so they land in /tmp rather than
// packages/junon-io/test-results. Deliberately literal /tmp and not
// os.tmpdir(), which on macOS resolves to a per-user
// /var/folders/.../T path that's awkward to type or paste.
// Override with JUNON_E2E_OUTPUT_DIR; global-setup.js prints the resolved
// path at the start and end of every run.
const OUTPUT_DIR = process.env.JUNON_E2E_OUTPUT_DIR || '/tmp/junon-io-e2e'

module.exports = defineConfig({
  testDir: './test/e2e',
  outputDir: OUTPUT_DIR,
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: require.resolve('./test/e2e/global-setup.js'),
  use: {
    baseURL: 'http://localhost:8001',
    trace: 'retain-on-failure',

    // Video is the quickest way to confirm a *passing* run really did what it
    // claims - that the player actually walked over and fought, rather than
    // the assertions going green vacuously. The gameplay is drawn to a canvas,
    // so a recording is the only artifact that shows the world itself; DOM
    // snapshots just show an empty <canvas>.
    //
    // 'retain-on-failure' is the wrong default for that, because it throws the
    // video away in exactly the case worth eyeballing, and Playwright has no
    // --video CLI flag to override it per run. So it's an env opt-in:
    //
    //   JUNON_E2E_VIDEO=on npx playwright test
    //
    // which keeps a .webm per test under test-results/ (~370KB each).
    video: process.env.JUNON_E2E_VIDEO || 'retain-on-failure'
  },
  reporter: [['list']]
})
