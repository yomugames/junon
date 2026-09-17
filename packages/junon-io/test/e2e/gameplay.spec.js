const { test, expect } = require('@playwright/test')
const { createNewColonyAndJoin } = require('./support/join')
const { teleportToSafeGround, spawnMob } = require('./support/scenario')
const { moveTowardAndAttack } = require('./support/combat')

test.describe('gameplay', () => {
  test('creates a new colony through the real matchmaker flow and joins', async ({ page }) => {
    await createNewColonyAndJoin(page)

    const joined = await page.evaluate(() => ({
      hasPlayer: !!window.player,
      hasSector: !!(window.game && window.game.sector)
    }))

    expect(joined.hasPlayer).toBe(true)
    expect(joined.hasSector).toBe(true)
  })

  // Known flaky in CPU-constrained environments: a single page.evaluate()
  // round trip was measured at 2-3 real seconds on a 4-core sandbox running
  // the matchmaker, game server, gulp watcher and browser at once, and since
  // the server treats movement as "held until told otherwise"
  // (server/entities/player.js: updateInput()), that's enough time for the
  // player to overshoot the mob by hundreds of pixels between checks - even
  // with page.waitForFunction() polling inside the browser instead of from
  // Node. Likely reliable on a normal dev machine or a less contended CI
  // runner; needs either more headroom or a movement approach that doesn't
  // depend on real-time browser polling (e.g. small server-side position
  // nudges via the same debug hook used for teleportToSafeGround).
  test.fixme('walks up to a hostile mob and kills it in melee', async ({ page }) => {
    await createNewColonyAndJoin(page)

    // every new player spawns holding a SurvivalTool (server/entities/
    // player.js initInventory -> storeAt(0, new Item(this, "SurvivalTool")))
    // which doubles as a melee weapon (extends MeleeEquipment), so no extra
    // setup is needed to fight

    // the fixed test-mode spawn point can land right at a coastline (see
    // support/scenario.js), so move to a tile the map generator itself
    // classifies as solid ground before trying to walk anywhere
    const spawnPos = await teleportToSafeGround(page)
    await page.waitForFunction(
      ({ row, col }) => window.player.getRow() === row && window.player.getCol() === col,
      spawnPos,
      { timeout: 10_000 }
    )

    // Brood (common/constants.json Mobs.Brood: health 10, damage 2, speed 2)
    // is deliberately weak and slow - the starting SurvivalTool only deals 2
    // damage per hit (Equipments.SurvivalTool stats.damage) and moves much
    // slower than the player (Constants.Player speed 8), so a tankier/faster
    // hostile mob could kill the player or simply outrun it. Tamable mobs
    // like Chicken flee once approached, which defeats a "walk up and fight"
    // scenario entirely. Dropped a few tiles away so the player has to close
    // the distance, like a real encounter.
    const [mobId] = await spawnMob(page, {
      row: spawnPos.row,
      col: spawnPos.col + 3,
      type: 'brood'
    })
    expect(mobId).toBeTruthy()

    // wait for the server to broadcast the new mob into the client's synced
    // entity registry (client/src/entities/sector.js: this.mobs)
    await page.waitForFunction(
      (id) => !!window.game.sector.mobs[id],
      mobId,
      { timeout: 10_000 }
    )

    const killed = await moveTowardAndAttack(page, mobId, { timeoutMs: 20_000 })

    expect(killed).toBe(true)
  })
})
