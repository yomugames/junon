module.exports = {
  // By default Jest never transforms anything under node_modules (for speed,
  // and because most published packages are already plain CommonJS). firebase-
  // admin's auth submodule pulls in jwks-rsa -> jose, and jose ships ESM-only
  // (`import`/`export`) with no CJS build, which Jest's CJS runtime can't
  // execute as-is - it fails with "Cannot use import statement outside a
  // module". Node itself works around this natively (require(esm)), but
  // Jest's isolated module system doesn't, so we explicitly let babel-jest
  // (see babel.config.js) transform jose down to CommonJS instead.
  transformIgnorePatterns: ['node_modules/(?!(jose)/)'],

  // test/e2e/*.spec.js files use @playwright/test's own test()/expect(),
  // which Jest's default testMatch (`*.spec.js`) would otherwise also pick
  // up and try to run directly, failing since there's no browser fixture.
  // Playwright tests run separately via `npm run test:e2e`.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/test/e2e/']
}
