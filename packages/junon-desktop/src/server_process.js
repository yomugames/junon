const { utilityProcess } = require("electron")
const path = require("path")
const getPort = require("get-port")

const JUNON_IO_ROOT = path.dirname(require.resolve("junon-io/package.json"))
const SERVER_PATH = path.join(JUNON_IO_ROOT, "server", "server.js")

// how long a quitting app waits for the world to be saved
const SHUTDOWN_TIMEOUT_MS = 30 * 1000

// The game server is the ordinary standalone junon-io server, run in an
// Electron utility process: it relies on process globals and init order, and a
// server crash must not take the window down with it. Requests from the local
// world menu are relayed over the process's parent port
// (Server#initDesktopChannel).
class ServerProcess {
  constructor(options) {
    this.savesDir = options.savesDir
    this.onUnexpectedExit = options.onUnexpectedExit
    // other messages from the server (Steam co-op relay; see steam_host.js)
    this.onMessage = options.onMessage || (() => {})
    this.pending = new Map()
    this.nextRequestId = 1
  }

  async start() {
    let port = await getPort({ host: "127.0.0.1" })

    let env = Object.assign({}, process.env, {
      NODE_ENV: "standalone",
      JUNON_SAVES_DIR: this.savesDir,
      PORT: String(port)
    })
    // the menu picks the world and the socket stays on loopback until co-op
    // hosting opens it; don't inherit launcher settings meant for `npm run server`
    delete env.JUNON_WORLD_ID
    delete env.JUNON_OWNER_UID
    delete env.JUNON_HOST
    delete env.ELECTRON_RUN_AS_NODE

    this.child = utilityProcess.fork(SERVER_PATH, [], {
      cwd: JUNON_IO_ROOT,
      env: env,
      stdio: "inherit",
      serviceName: "Junon game server"
    })

    this.exited = new Promise((resolve) => {
      this.child.once("exit", (code) => {
        this.child = null
        this.rejectPending(new Error("The game server stopped"))
        if (!this.isStopping) this.onUnexpectedExit(code)
        resolve(code)
      })
    })

    return new Promise((resolve, reject) => {
      this.exited.then((code) => reject(new Error("The game server exited during startup (code " + code + ")")))
      this.child.on("message", (message) => {
        if (message.type === "ready") return resolve(message.port)
        if (message.type === "localApiResult") return this.onLocalApiResult(message)
        this.onMessage(message)
      })
    })
  }

  request(method, args) {
    if (!this.child) return Promise.reject(new Error("The game server is not running"))

    let id = this.nextRequestId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.child.postMessage({ type: "localApi", id: id, method: method, args: args })
    })
  }

  onLocalApiResult(message) {
    let request = this.pending.get(message.id)
    if (!request) return

    this.pending.delete(message.id)
    if (message.error) {
      request.reject(new Error(message.error))
    } else {
      request.resolve(message.result)
    }
  }

  // a message for the server outside the request/response local API
  post(message) {
    if (this.child) this.child.postMessage(message)
  }

  rejectPending(error) {
    this.pending.forEach((request) => request.reject(error))
    this.pending.clear()
  }

  // saves the open world, then exits; killing the process instead would skip
  // the save on Windows, where there is no SIGTERM handler to run
  async stop() {
    if (!this.child) return
    this.isStopping = true

    let child = this.child
    child.postMessage({ type: "shutdown" })

    let timeout
    let timedOut = new Promise((resolve) => {
      timeout = setTimeout(() => resolve("timeout"), SHUTDOWN_TIMEOUT_MS)
    })

    let result = await Promise.race([this.exited, timedOut])
    clearTimeout(timeout)
    if (result === "timeout") child.kill()
  }
}

module.exports = ServerProcess
