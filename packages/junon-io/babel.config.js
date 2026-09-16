// Used only by Jest (via jest.config.js's transform), to let babel-jest
// convert ESM syntax to CommonJS in select node_modules packages - see
// jest.config.js's transformIgnorePatterns for why this is needed.
// The client/server source itself doesn't need transpiling; nothing else in
// this project runs a babel step (gulp's client bundling doesn't use babel).
module.exports = {
  // Default: leave first-party (and other) CommonJS files completely alone.
  // Babel's ES-module codegen is implicitly strict-mode, and some first-party
  // files (e.g. junon-common/logger.js) rely on sloppy-mode implicit globals
  // (`LOG = ...`), so we must not let babel treat everything as a module.
  sourceType: 'script',
  overrides: [
    {
      // jose (a transitive dep of firebase-admin/auth via jwks-rsa) ships
      // ESM-only, with no CJS build. Convert just that package to CommonJS.
      test: /node_modules[\\/]jose[\\/]/,
      sourceType: 'module',
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }]
      ]
    }
  ]
}
