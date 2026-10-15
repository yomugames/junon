// electron-builder settings for `npm run package` (docs/development.md#packaging)
module.exports = {
  appId: "io.junon.desktop",
  productName: "Junon",
  directories: { output: "release" },
  // the hoisted workspace install, since package.json gives a range
  electronVersion: require("electron/package.json").version,

  files: [
    "src/**",
    "package.json",
    // Steam is off in itch.io builds (src/steam.js); its binding and FFI
    // library are large and native
    "!**/node_modules/steamworks-ffi-node/**",
    "!**/node_modules/koffi/**",
    "!**/node_modules/@koromix/**",
    // the desktop app serves junon-io's standalone build (dist/); the client
    // sources, tests and build tooling stay behind
    "!**/node_modules/junon-io/{client,test,sourcemaps}/**",
    "!**/node_modules/junon-io/{gulpfile,babel.config,jest.config,playwright.config}.js",
    "!**/node_modules/junon-io/{.dockerignore,.nvmrc,.sourcemapignore}",
    "!**/node_modules/junon-io/dist/**/*.map"
  ],

  // the game server runs from junon-io's directory and the native modules are
  // swapped per platform after packing (scripts/after_pack.js); both need
  // plain files
  asar: false,
  npmRebuild: false,
  afterPack: "./scripts/after_pack.js",

  // a plain folder: itch.io's butler uploads it as is (docs/development.md#packaging)
  win: { target: "dir" },
  mac: { target: "dir" },
  linux: { target: "dir" }
}
