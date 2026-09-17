// Real chat-typed admin commands (e.g. /spawnmob) are rejected for anyone
// but a hardcoded dev account unless the colony's gameMode is "peaceful"
// (server/commands/base_command.js: canExecute() checks
// `!this.game.isPeaceful()` before even checking sector-owner status), so
// they can't be used to script scenarios in a normal survival colony.
//
// The debug-mode-only HTTP hook (server/server.js: GET /debug/:message ->
// Game#runCommand) exists precisely for this kind of test/dev scripting and
// bypasses player permissions entirely, so scenario setup uses that instead.
async function runDebugCommand(page, message, extraParams = {}) {
  // getMainGame() (the debug endpoint's default target) assumes a single
  // active game on the process, which doesn't hold once a test harness has
  // created more than one colony on the same long-lived dev server - pass
  // the joined sector's id explicitly to disambiguate (see server.js's
  // GET /debug/:message).
  // sector.id is a local per-entity id (server/entities/sector.js:
  // metadata.id || game.generateEntityId()) - sector.uid is the actual
  // matchmaker-assigned sectorId that keys Server#games
  const sectorId = await page.evaluate(() => window.game.sector.uid)

  const params = new URLSearchParams({ sectorId, ...extraParams })
  const response = await page.request.get(`/debug/${message}?${params.toString()}`)
  const { result } = await response.json()
  return result
}

// The fixed test-mode spawn point (server/entities/sector.js:
// findNewTeamSpawn, {row: 96, col: 4}) is only guaranteed to exist, not to
// be dry land - terrain is still randomly generated per sector, so spawn can
// land right at a coastline. Walking blind from there risks open water,
// which turned out to both damage the player and disrupt movement in ways
// that made an already-flaky test worse. This moves the player onto a tile
// the map generator itself classifies as solid ground.
async function teleportToSafeGround(page) {
  return runDebugCommand(page, 'teleportToSafeGround')
}

async function spawnMob(page, { row, col, type } = {}) {
  const params = {}
  if (row !== undefined) params.row = row
  if (col !== undefined) params.col = col
  if (type !== undefined) params.type = type

  return runDebugCommand(page, 'spawnMob', params)
}

module.exports = { teleportToSafeGround, spawnMob }
