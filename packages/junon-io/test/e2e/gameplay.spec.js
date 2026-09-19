const { test, expect } = require('@playwright/test')
const { createNewColonyAndJoin } = require('./support/join')
const { setupMeleeArena, readMob } = require('./support/scenario')
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

  test('walks up to a hostile mob and kills it in melee', async ({ page }) => {
    await createNewColonyAndJoin(page)

    // every new player spawns holding a SurvivalTool (server/entities/
    // player.js initInventory -> storeAt(0, new Item(this, "SurvivalTool")))
    // which doubles as a melee weapon (extends MeleeEquipment), so no extra
    // setup is needed to fight

    // Brood (common/constants.json Mobs.Brood: health 10, damage 2, speed 2)
    // is deliberately weak and slow - the starting SurvivalTool deals 2 damage
    // a hit on a 200ms cooldown, so the fight is ~5 swings, and a tankier or
    // faster hostile could kill the player or simply outrun it.
    //
    // Both fighters are placed on a verified obstacle-free strip of ground a
    // few tiles apart rather than at the raw spawn point: terrain is random
    // per sector, and a mob dropped blindly near spawn can end up behind a
    // rock, in a plant patch or across water, which blocks the walk and the
    // melee line of sight. See support/scenario.js.
    const arena = await setupMeleeArena(page, { span: 4, mobType: 'Brood' })

    expect(arena.error).toBeUndefined()
    expect(arena.mob).toBeTruthy()
    // a mob the melee raycast can't see can never be hit, so fail on that
    // directly instead of swinging at it for the whole timeout
    expect(arena.isObstructed).toBe(false)

    const mobId = arena.mob.id

    // wait for the server to broadcast the new mob into the client's synced
    // entity registry (client/src/entities/sector.js: this.mobs)
    await page.waitForFunction(
      (id) => !!window.game.sector.mobs[id],
      mobId,
      { timeout: 10_000 }
    )

    const killed = await moveTowardAndAttack(page, mobId, { timeoutMs: 20_000 })

    expect(killed).toBe(true)
    // the fight loop reads the client's synced view of the mob, so confirm the
    // kill against the server's own state rather than trusting that
    expect(await readMob(page, mobId)).toEqual({ alive: false })
  })
})
