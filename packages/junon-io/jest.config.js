module.exports = {
  // test/e2e/*.spec.js files use @playwright/test's own test()/expect(),
  // which Jest's default testMatch (`*.spec.js`) would otherwise also pick
  // up and try to run directly, failing since there's no browser fixture.
  // Playwright tests run separately via `npm run test:e2e`.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/test/e2e/']
}
