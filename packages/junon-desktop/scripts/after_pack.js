// electron-builder afterPack hook (electron-builder.config.js): puts the target
// platform's native binaries into the packaged app, so a Windows build can be
// made on Linux and the other way round.
//
// The workspace's node_modules holds this machine's binaries only, and
// electron-builder's own rebuild would overwrite them there with the target's.
// Instead it's off, and this replaces them in the packaged copy:
// - sqlite3 is N-API, so its prebuilt binary for the target platform works in
//   any Electron; prebuild-install downloads it.
// - sharp loads @img/sharp-<platform>-<arch> (and, outside Windows, the libvips
//   package that one depends on), fetched with `npm pack`.
const { execFileSync } = require("child_process")
const fs = require("fs")
const os = require("os")
const path = require("path")
const { Arch } = require("builder-util")

const NPM = process.platform === "win32" ? "npm.cmd" : "npm"

module.exports = async function afterPack(context) {
  let platform = context.electronPlatformName
  let arch = Arch[context.arch]
  let nodeModules = path.join(context.packager.getResourcesDir(context.appOutDir), "app", "node_modules")

  installSqlite(nodeModules, platform, arch)
  installSharp(nodeModules, platform, arch)
}

function installSqlite(nodeModules, platform, arch) {
  let sqliteDir = path.join(nodeModules, "sqlite3")
  fs.rmSync(path.join(sqliteDir, "build"), { recursive: true, force: true })

  let napiVersion = Math.max(...require(path.join(sqliteDir, "package.json")).binary.napi_versions)
  let prebuildInstall = require.resolve("prebuild-install/bin.js")
  execFileSync(process.execPath, [prebuildInstall, "--platform", platform, "--arch", arch, "--runtime", "napi", "--target", String(napiVersion), "--verbose"], { cwd: sqliteDir, stdio: "inherit" })

  if (!fs.existsSync(path.join(sqliteDir, "build", "Release", "node_sqlite3.node"))) {
    throw new Error("sqlite3: no prebuilt binary for " + platform + "-" + arch)
  }
}

function installSharp(nodeModules, platform, arch) {
  let imgDir = path.join(nodeModules, "@img")
  // drop this machine's binaries; @img/colour is plain JavaScript
  for (let name of fs.readdirSync(imgDir)) {
    if (name.startsWith("sharp-")) fs.rmSync(path.join(imgDir, name), { recursive: true, force: true })
  }

  let sharpVersion = require(path.join(nodeModules, "sharp", "package.json")).version
  let tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "junon-pack-"))
  try {
    let binary = fetchPackage("@img/sharp-" + platform + "-" + arch, sharpVersion, nodeModules, tempDir)
    let dependencies = Object.assign({}, binary.dependencies, binary.optionalDependencies)
    for (let name in dependencies) fetchPackage(name, dependencies[name], nodeModules, tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

// unpacks name@version into nodeModules and returns its package.json
function fetchPackage(name, version, nodeModules, tempDir) {
  let tarball = execFileSync(NPM, ["pack", name + "@" + version, "--silent", "--pack-destination", tempDir], { encoding: "utf8", shell: process.platform === "win32" }).trim().split("\n").pop()
  let target = path.join(nodeModules, name)
  fs.mkdirSync(target, { recursive: true })
  execFileSync("tar", ["-xzf", path.join(tempDir, tarball), "-C", target, "--strip-components=1"])
  console.log("  • packed native module  " + name + "@" + version)
  return JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8"))
}
