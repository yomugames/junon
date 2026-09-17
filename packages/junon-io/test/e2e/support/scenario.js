const { evaluateInServer } = require('./server_console')

// Runs inside the game server process, via the V8 inspector - see
// server_console.js for why setup lives here rather than as a debug command in
// server/. It closes over nothing; `global.server` is put there by server.js.
//
// A melee scenario needs more than "a tile that exists". The player has to be
// able to actually *walk* to the mob, and the weapon's hit circle has to be
// able to reach it - getMeleeTargets() (server/entities/base_entity.js)
// discards any target the raycast in isObstructed() can't see. The fixed
// test-mode spawn (sector.js findNewTeamSpawn, {row: 96, col: 4}) and
// findRandomGround() both only guarantee a single solid tile, and terrain is
// regenerated per sector, so a mob dropped blindly a few tiles from either can
// land behind a rock, inside a plant patch (map_generator.js createPlants
// scatters FiberSeed buildings across every land) or across water - silently
// blocking the walk, the melee line of sight, or both, differently every run.
//
// This picks a run of plain obstacle-free ground and puts both fighters on it,
// so the scenario is the same every time even though the map isn't.
function setupMeleeArenaInServer({ sectorId, span, mobType }) {
  const game = global.server.getGame(sectorId)
  if (!game) return { error: `no game for sector ${sectorId}` }

  const sector = game.sector
  const player = sector.getFirstPlayer()
  if (!player) return { error: 'no player in sector' }

  // plain walkable ground: a tile that exists, isn't mineable (rocks block
  // both movement and line of sight) and has nothing built on it
  const isClearTile = (row, col) => {
    const ground = sector.groundMap.get(row, col)
    if (!ground) return false
    if (!ground.isGroundTile()) return false
    if (ground.isMineable()) return false
    if (sector.structureMap.get(row, col)) return false
    if (sector.platformMap.get(row, col)) return false
    return true
  }

  // the fight runs along +x; keep a tile of clearance above and below so the
  // player can't clip a corner on the way over
  const corridorStart = Object.values(sector.mapGenerator.grounds).find((tile) => {
    const row = tile.getRow()
    const col = tile.getCol()

    for (let c = col; c <= col + span; c++) {
      for (let r = row - 1; r <= row + 1; r++) {
        if (!isClearTile(r, c)) return false
      }
    }

    return true
  })

  if (!corridorStart) return { error: `no clear ${span}-tile corridor on this map` }

  // position off the tiles themselves, so this needs no tileSize arithmetic
  const mobTile = sector.groundMap.get(corridorStart.getRow(), corridorStart.getCol() + span)
  player.repositionTo(corridorStart.getX(), corridorStart.getY())

  const mob = sector.spawnMob({
    x: mobTile.getX(),
    y: mobTile.getY(),
    type: mobType,
    count: 1
  })[0]

  return {
    player: {
      row: corridorStart.getRow(),
      col: corridorStart.getCol(),
      x: player.getX(),
      y: player.getY()
    },
    mob: mob ? { id: mob.id, x: mob.getX(), y: mob.getY(), health: mob.health } : null,
    // reported so a test fails loudly on a bad arena instead of swinging at an
    // unreachable target for its whole timeout
    isObstructed: mob ? !!player.isObstructed(mob) : null
  }
}

async function setupMeleeArena(page, { span = 4, mobType = 'Brood' } = {}) {
  // sector.id is a local per-entity id (server/entities/sector.js:
  // metadata.id || game.generateEntityId()) - sector.uid is the actual
  // matchmaker-assigned sectorId that keys Server#games
  const sectorId = await page.evaluate(() => window.game.sector.uid)

  return evaluateInServer(setupMeleeArenaInServer, { sectorId, span, mobType })
}

// Reads server-authoritative state for a mob, so assertions don't depend on
// whatever the client has predicted or last been synced.
function readMobInServer({ sectorId, mobId }) {
  const game = global.server.getGame(sectorId)
  if (!game) return { error: `no game for sector ${sectorId}` }

  const mob = game.sector.mobs[mobId]
  if (!mob) return { alive: false }

  return { alive: true, health: mob.health, x: mob.getX(), y: mob.getY() }
}

async function readMob(page, mobId) {
  const sectorId = await page.evaluate(() => window.game.sector.uid)
  return evaluateInServer(readMobInServer, { sectorId, mobId })
}

module.exports = { setupMeleeArena, readMob }
