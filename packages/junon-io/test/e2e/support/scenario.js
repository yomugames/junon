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

// Every helper below runs `fn` inside the game server against the sector the
// browser is currently in.
//
// sector.id is a local per-entity id (server/entities/sector.js: metadata.id ||
// game.generateEntityId()) - sector.uid is the actual matchmaker-assigned
// sectorId that keys Server#games, so that is what has to be looked up.
//
// `fn` is serialised across the DevTools Protocol (see server_console.js), so
// each one closes over nothing and repeats its own `getGame(sectorId).sector`
// preamble. That is inherent to the transport, not an oversight.
async function inSector(page, fn, arg = {}) {
  const sectorId = await page.evaluate(() => window.game.sector.uid)

  return evaluateInServer(fn, { ...arg, sectorId })
}

async function setupMeleeArena(page, { span = 4, mobType = 'Brood' } = {}) {
  return inSector(page, setupMeleeArenaInServer, { span, mobType })
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
  return inSector(page, readMobInServer, { mobId })
}

// Finds a block of plain obstacle-free ground near the player.
//
// This is the same problem setupMeleeArenaInServer solves, for the actions that
// are aimed with the mouse instead of walked to: placing a building needs every
// tile it covers to be buildable *and* its centre within
// Helper.ENTITY_INTERACT_RANGE (224px) of the player
// (client/src/entities/buildings/base_building.js: isWithinInteractDistance),
// and mining needs its target inside the same range on both sides
// (server/entities/player.js#mine). Terrain is regenerated per sector and plant
// patches are scattered over every land (map_generator.js createPlants), so
// "two tiles to the right of spawn" is clear on some runs and not others.
//
// Candidates are ordered by distance from the player and then by row/col, so a
// given map always yields the same answer.
function findClearAreaInServer({ sectorId, widthInTiles, heightInTiles, minTileDistance, maxTileDistance }) {
  const game = global.server.getGame(sectorId)
  if (!game) return { error: `no game for sector ${sectorId}` }

  const sector = game.sector
  const player = sector.getFirstPlayer()
  if (!player) return { error: 'no player in sector' }

  const tileSize = 32 // common/constants.json tileSize
  const playerRow = player.getRow()
  const playerCol = player.getCol()

  // plain buildable ground: a tile that exists, isn't mineable (rocks and
  // asteroids block movement and line of sight) and has nothing already built
  // or floored on it
  const isClearTile = (row, col) => {
    const ground = sector.groundMap.get(row, col)
    if (!ground) return false
    if (!ground.isGroundTile()) return false
    if (ground.isMineable()) return false
    if (sector.structureMap.get(row, col)) return false
    if (sector.platformMap.get(row, col)) return false
    // the player's own tile is left out: a scenario that drops an obstacle or a
    // building on top of the player is not one a human could set up
    if (row === playerRow && col === playerCol) return false
    return true
  }

  const isClearArea = (row, col) => {
    for (let r = row; r < row + heightInTiles; r++) {
      for (let c = col; c < col + widthInTiles; c++) {
        if (!isClearTile(r, c)) return false
      }
    }

    return true
  }

  const candidates = []

  for (let row = playerRow - maxTileDistance; row <= playerRow + maxTileDistance; row++) {
    for (let col = playerCol - maxTileDistance; col <= playerCol + maxTileDistance; col++) {
      // measured from the area's centre, because that is the point the range
      // checks and the mouse both use
      const centerX = (col + widthInTiles / 2) * tileSize
      const centerY = (row + heightInTiles / 2) * tileSize
      const tileDistance = Math.max(
        Math.abs(centerX / tileSize - (playerCol + 0.5)),
        Math.abs(centerY / tileSize - (playerRow + 0.5))
      )

      if (tileDistance < minTileDistance) continue
      if (tileDistance > maxTileDistance) continue
      if (!isClearArea(row, col)) continue

      candidates.push({ row, col, centerX, centerY, tileDistance })
    }
  }

  candidates.sort((a, b) => {
    if (a.tileDistance !== b.tileDistance) return a.tileDistance - b.tileDistance
    if (a.row !== b.row) return a.row - b.row
    return a.col - b.col
  })

  if (candidates.length === 0) {
    return { error: `no clear ${widthInTiles}x${heightInTiles} area within ${maxTileDistance} tiles of the player` }
  }

  const area = candidates[0]

  return {
    row: area.row,
    col: area.col,
    widthInTiles: widthInTiles,
    heightInTiles: heightInTiles,
    centerX: area.centerX,
    centerY: area.centerY,
    playerRow: playerRow,
    playerCol: playerCol
  }
}

async function findClearArea(page, { widthInTiles = 1, heightInTiles = 1, minTileDistance = 2, maxTileDistance = 4 } = {}) {
  return inSector(page, findClearAreaInServer, { widthInTiles, heightInTiles, minTileDistance, maxTileDistance })
}

// Puts a terrain tile on the map, the way the /fill command does
// (server/commands/fill.js): drop whatever ground is there first, then create
// the new one, so the tile is registered on the groundMap and synced to the
// client like any other terrain change. Creating without removing would leave
// the old tile's registrations behind.
//
// Asteroids are what the mining tests need, and the map only scatters them at
// random, so waiting for one to turn up beside spawn is not an option.
function createTerrainInServer({ sectorId, type, row, col }) {
  const game = global.server.getGame(sectorId)
  if (!game) return { error: `no game for sector ${sectorId}` }

  const sector = game.sector

  const existing = sector.groundMap.get(row, col)
  if (existing) {
    existing.remove({ removeAll: true })
  }

  sector.createTerrain(type, row, col)

  const terrain = sector.groundMap.get(row, col)
  if (!terrain) return { error: `could not create terrain ${type} at ${row},${col}` }

  return {
    type: terrain.getTypeName(),
    row: terrain.getRow(),
    col: terrain.getCol(),
    x: terrain.getX(),
    y: terrain.getY(),
    health: terrain.health,
    isMineable: terrain.isMineable()
  }
}

async function createTerrain(page, { type, row, col }) {
  return inSector(page, createTerrainInServer, { type, row, col })
}

function readTerrainInServer({ sectorId, row, col }) {
  const game = global.server.getGame(sectorId)
  if (!game) return { error: `no game for sector ${sectorId}` }

  const terrain = game.sector.groundMap.get(row, col)
  if (!terrain) return { exists: false }

  return {
    exists: true,
    type: terrain.getTypeName(),
    health: terrain.health,
    isMineable: terrain.isMineable()
  }
}

async function readTerrain(page, row, col) {
  return inSector(page, readTerrainInServer, { row, col })
}

// Drops items straight into the player's inventory.
//
// Some flows need materials the starting kit doesn't include - crafting a floor
// needs iron bars, which a human gets by mining ore and smelting it in a
// furnace. Reproducing that whole chain inside a test that is only about the
// craft menu would make the test fail for reasons that have nothing to do with
// crafting, so the materials are granted here and the test drives the real
// menu. This is scenario setup, exactly like spawning the mob the melee test
// fights.
//
// `index` picks the slot. 0..7 is the hotbar (Constants.quickInventoryBaseIndex
// up to regularInventoryBaseIndex) and only those slots can be equipped
// (server/entities/player.js#setEquipIndex), so anything that has to be held
// belongs there.
function giveItemsInServer({ sectorId, items }) {
  const game = global.server.getGame(sectorId)
  if (!game) return { error: `no game for sector ${sectorId}` }

  const sector = game.sector
  const player = sector.getFirstPlayer()
  if (!player) return { error: 'no player in sector' }

  const stored = []

  for (const spec of items) {
    const item = sector.createItem(spec.type, { count: spec.count || 1 })

    if (typeof spec.index === 'number') {
      // storeAt returns nothing (common/interfaces/storable.js), so the slot is
      // read back instead of trusting a return value
      player.inventory.storeAt(spec.index, item)
    } else if (!player.inventory.store(item)) {
      return { error: `inventory had no room for ${spec.type}` }
    }

    const slot = player.inventory.storage[item.index]
    if (!slot) return { error: `could not store ${spec.type} in inventory` }

    stored.push({ type: slot.getTypeName(), count: slot.count, index: slot.index })
  }

  return { stored: stored }
}

async function giveItems(page, items) {
  return inSector(page, giveItemsInServer, { items })
}

// The player's inventory as the server sees it. Assertions read this rather
// than window.player.inventory, so a passing test means the server really
// granted or consumed the item instead of the client having guessed.
function readInventoryInServer({ sectorId }) {
  const game = global.server.getGame(sectorId)
  if (!game) return { error: `no game for sector ${sectorId}` }

  const player = game.sector.getFirstPlayer()
  if (!player) return { error: 'no player in sector' }

  const items = []
  for (const index in player.inventory.storage) {
    const item = player.inventory.storage[index]
    if (item) {
      items.push({ index: parseInt(index, 10), type: item.getTypeName(), count: item.count })
    }
  }

  return { items: items, equipIndex: player.equipIndex }
}

async function readInventory(page) {
  return inSector(page, readInventoryInServer)
}

// The contents of a building that holds items (an escape pod, a crate).
function readStorageInServer({ sectorId, entityId }) {
  const game = global.server.getGame(sectorId)
  if (!game) return { error: `no game for sector ${sectorId}` }

  const entity = game.getEntity(entityId)
  if (!entity) return { error: `no entity ${entityId}` }

  const items = []
  for (const index in entity.storage) {
    const item = entity.storage[index]
    if (item) {
      items.push({ index: parseInt(index, 10), type: item.getTypeName(), count: item.count })
    }
  }

  return { items: items }
}

async function readStorage(page, entityId) {
  return inSector(page, readStorageInServer, { entityId })
}

// The escape pod the sector drops beside a new colony's first player
// (server/entities/survival_sector.js#initEscapePod), preloaded with
// EscapePod#getInitialItems.
function readInitialEscapePodInServer({ sectorId }) {
  const game = global.server.getGame(sectorId)
  if (!game) return { error: `no game for sector ${sectorId}` }

  const player = game.sector.getFirstPlayer()
  if (!player) return { error: 'no player in sector' }

  const pod = player.initialEscapePod
  if (!pod) return { error: 'player has no initial escape pod' }

  const items = []
  for (const index in pod.storage) {
    const item = pod.storage[index]
    if (item) {
      items.push({ index: parseInt(index, 10), type: item.getTypeName(), count: item.count })
    }
  }

  return {
    id: pod.id,
    x: pod.getX(),
    y: pod.getY(),
    row: pod.getRow(),
    col: pod.getCol(),
    storageCount: pod.getStorageCount(),
    items: items
  }
}

async function readInitialEscapePod(page) {
  return inSector(page, readInitialEscapePodInServer)
}

// Whatever the server has standing on a tile. A multi-tile building registers
// on every tile it covers, so this is how a 2x2 placement is checked.
function readStructureInServer({ sectorId, row, col }) {
  const game = global.server.getGame(sectorId)
  if (!game) return { error: `no game for sector ${sectorId}` }

  const structure = game.sector.structureMap.get(row, col)
  if (!structure) return { exists: false }

  return {
    exists: true,
    id: structure.id,
    type: structure.getTypeName(),
    health: structure.health,
    x: structure.getX(),
    y: structure.getY(),
    ownerName: structure.getOwnerName()
  }
}

async function readStructure(page, row, col) {
  return inSector(page, readStructureInServer, { row, col })
}

module.exports = {
  setupMeleeArena,
  readMob,
  findClearArea,
  createTerrain,
  readTerrain,
  giveItems,
  readInventory,
  readStorage,
  readInitialEscapePod,
  readStructure
}
