const CDP = require('chrome-remote-interface')

// Scenario setup needs to reach into real server-side game state: find ground
// the player can actually walk on, reposition it there, drop a mob at a known
// spot. None of that is reachable from the browser - the client only knows
// what the server has synced to it, and it has no authority to change any of
// it.
//
// The obvious way to get it is a debug command in the server (Game#runCommand
// + the GET /debug/:message hook), but that means shipping test-only branches
// inside the game itself, where they're dead weight in production and one
// refactor away from being silently wrong.
//
// The game server already runs under the V8 inspector - that's what
// `--inspect` in the package.json `start` script is for - and the e2e harness
// spawns it the same way (see global-setup.js). Attaching over the Chrome
// DevTools Protocol gives the harness the same access a debugger REPL has:
// Runtime.evaluate runs arbitrary code *inside the server process*, in a
// global scope where server.js has already put `global.server` (and
// `global.require`). So the setup code can live here, in the test suite, and
// the game server ships with no knowledge that a test suite exists.
//
// chrome-remote-interface is already a dependency (it predates this harness).
let client = null

async function connect({ port, timeoutMs = 30_000 } = {}) {
  if (client) return client

  const inspectPort = port || parseInt(process.env.JUNON_E2E_INSPECT_PORT, 10)
  if (!inspectPort) {
    throw new Error('JUNON_E2E_INSPECT_PORT not set - did global-setup run?')
  }

  const deadline = Date.now() + timeoutMs
  let lastError

  // the inspector's HTTP target list can lag slightly behind the port opening
  while (Date.now() < deadline) {
    try {
      client = await CDP({ port: inspectPort, host: '127.0.0.1' })
      await client.Runtime.enable()
      return client
    } catch (err) {
      lastError = err
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  throw new Error(`Could not attach to game server inspector on ${inspectPort}: ${lastError && lastError.message}`)
}

// Runs `fn` inside the game server process and returns its value. `fn` is
// serialised, so it closes over nothing - everything it needs comes in through
// `arg` or off the server's own globals.
async function evaluateInServer(fn, arg) {
  const cdp = await connect()
  const expression = `(${fn.toString()})(${JSON.stringify(arg === undefined ? null : arg)})`

  const { result, exceptionDetails } = await cdp.Runtime.evaluate({
    expression,
    awaitPromise: true,
    returnByValue: true
  })

  if (exceptionDetails) {
    const description = (exceptionDetails.exception && exceptionDetails.exception.description) ||
                        exceptionDetails.text
    throw new Error(`game server evaluate failed: ${description}`)
  }

  return result.value
}

async function disconnect() {
  if (!client) return
  await client.close()
  client = null
}

module.exports = { connect, evaluateInServer, disconnect }
