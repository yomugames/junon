const { execFileSync } = require('child_process')
const path = require('path')

test('local Firebase verifies identities and preserves SQL accounts and sectors', () => {
  execFileSync(process.execPath, [path.join(__dirname, 'support/firebase_emulator_smoke.js')], {
    cwd: path.resolve(__dirname, '../../../..'),
    // Prove emulator mode works even when inherited cloud credentials are invalid.
    env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: '/missing/junon-credentials.json' },
    timeout: 30000,
    stdio: 'inherit'
  })
}, 35000)
