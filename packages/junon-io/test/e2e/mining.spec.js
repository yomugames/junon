const { test, expect } = require('@playwright/test')
const { createNewColonyAndJoin } = require('./support/join')
const {
  createTerrain,
  findClearArea,
  readInventory,
  readTerrain
} = require('./support/scenario')
const { hoverWorld, tileCenter } = require('./support/screen')

// Mining is the one action driven entirely by where the cursor is resting:
// hovering a foreground tile inside Helper.ENTITY_INTERACT_RANGE sets it as the
// player's mineTarget (client/src/entities/terrains/base_terrain.js#onMouseOver),
// a click toggles mining mode, and from then on the client's own frame loop
// re-sends MineResource every time the 200ms action cooldown expires
// (game.js#applyMyInputs -> player.mine()). Moving the cursor off the tile
// clears mineTarget again, so the cursor has to stay put for the whole dig.
//
// Every new player is holding a SurvivalTool in hotbar slot 0, which is a
// mining tool (survival_tool.js#isMiningEquipment) dealing 1 damage per swing,
// and the server pays out every 5 damage: 5 items of the tile's getDropType()
// (survival_tool.js#mineResource).
//
// A plain Asteroid has 25 health (constants Terrains.Asteroid), so digging one
// out costs 25 swings and pays out 5 times for 25 items. That takes on the
// order of 15 seconds of wall clock, not the 5 the client's own 200ms cooldown
// suggests: the server gates each swing on its own cooldown *and* charges
// stamina for it (player.js#mine -> consumeStamina("mine")), so the real rate
// is set by stamina regen. Hence test.slow() below.
//
// Each payout rolls its own drop: Math.random() <= 0.37 gives Sand, otherwise
// IronOre (asteroid.js#getDropType).
const ASTEROID_HEALTH = 25
const DROP_INTERVAL_IN_DAMAGE = 5
const DROP_COUNT = 5
const DROPS_PER_ASTEROID = ASTEROID_HEALTH / DROP_INTERVAL_IN_DAMAGE
const ITEMS_PER_ASTEROID = DROPS_PER_ASTEROID * DROP_COUNT

// Puts an asteroid on a tile and digs it out completely.
async function mineOutAsteroid(page, area) {
  const asteroid = await createTerrain(page, { type: 'Asteroid', row: area.row, col: area.col })
  expect(asteroid.error).toBeUndefined()
  expect(asteroid).toMatchObject({ type: 'Asteroid', health: ASTEROID_HEALTH, isMineable: true })

  // The tile is pushed to the client as part of its chunk, so wait for the
  // client to actually know about it before aiming at it.
  //
  // The two sides file terrain differently: the server keeps every terrain on
  // sector.groundMap, while the client splits it, sending foreground tiles
  // (asteroids, rocks) to sector.map and walkable ground to sector.groundMap
  // (client/src/entities/terrains/base_terrain.js#getTileMap). The client also
  // has no isMineable() at all - what it keys mining off is isForegroundTile().
  await page.waitForFunction(
    ({ row, col }) => {
      const terrain = window.game.sector.map.get(row, col)
      return !!terrain && !!terrain.isForegroundTile && terrain.isForegroundTile()
    },
    { row: area.row, col: area.col },
    { timeout: 15_000 }
  )

  const center = tileCenter(area.row, area.col)
  await hoverWorld(page, center.x, center.y)

  await page.waitForFunction(
    ({ row, col }) => {
      const target = window.player.mineTarget
      return !!target && target.getRow() === row && target.getCol() === col
    },
    { row: area.row, col: area.col },
    { timeout: 10_000 }
  )

  // a mouse-down while there is a mine target toggles mining mode on
  // (input_controller.js#globalMouseDownHandler); mining then continues by
  // itself, so the button is released straight away like a real click
  await page.mouse.down()
  await page.mouse.up()
  expect(await page.evaluate(() => window.player.isMining())).toBe(true)

  // once the tile's health hits zero it is replaced by plain rock
  // (base_foreground.js#onHealthZero -> remove -> sector.createRock)
  await expect
    .poll(async () => (await readTerrain(page, area.row, area.col)).type,
      // a fixed short interval rather than the default backoff, which would
      // otherwise sit on a 1s+ poll and add seconds per asteroid
      { timeout: 30_000, intervals: [250] })
    .toEqual('Rock')

  // Digging does *not* stop when the tile runs out: player.mineTarget still
  // points at the entity that was just removed, so the client keeps firing
  // MineResource at an empty tile until the cursor moves off it and
  // onMouseOut clears the target (base_terrain.js#onMouseOut), at which point
  // player.mine() flips mining mode back off.
  //
  // Parking the cursor back on the player matters for more than tidiness: a
  // mouse-down *toggles* mining mode (input_controller.js
  // globalMouseDownHandler -> toggleMiningMode), so starting a second dig while
  // the first is still notionally running would switch mining off instead of on.
  const player = await page.evaluate(() => ({ x: window.player.getX(), y: window.player.getY() }))
  await hoverWorld(page, player.x, player.y)

  await expect
    .poll(async () => page.evaluate(() => window.player.isMining()),
      { timeout: 10_000, intervals: [250] })
    .toBe(false)
}

test.describe('mining', () => {
  test('mines asteroids with the starting tool, gaining iron ore and sometimes sand', async ({ page }) => {
    // two full digs at 25 stamina-limited swings each, on top of creating and
    // joining a colony
    test.slow()

    await createNewColonyAndJoin(page)

    // One tile, close enough for both the client's hover range check and the
    // server's own range check in player.js#mine, and neither under the player
    // nor under the escape pod.
    const area = await findClearArea(page, { minTileDistance: 2, maxTileDistance: 3 })
    expect(area.error).toBeUndefined()

    const before = await readInventory(page)
    expect(before.error).toBeUndefined()
    const startingTypes = before.items.map((item) => item.type)

    // Two asteroids, on the same tile one after the other - the first leaves
    // plain rock behind, which is buildable ground again.
    //
    // Two rather than one purely to take the randomness out of the assertion
    // below. Each asteroid pays out 5 times and each payout independently has a
    // 37% chance of sand, so a single asteroid produces no iron ore at all
    // roughly once in 145 runs; over ten payouts that drops to about one run in
    // twenty thousand.
    const asteroidCount = 2

    for (let i = 0; i < asteroidCount; i++) {
      await mineOutAsteroid(page, area)
    }

    const after = await readInventory(page)
    const mined = after.items.filter((item) => !startingTypes.includes(item.type))

    // the asteroid yields iron ore, and nothing but iron ore or sand
    expect(mined.map((item) => item.type)).toContain('IronOre')
    expect(mined.every((item) => item.type === 'IronOre' || item.type === 'Sand')).toBe(true)

    // 5 items a payout, 5 payouts an asteroid, and the server never hands out a
    // partial lump
    expect(mined.reduce((total, item) => total + item.count, 0))
      .toEqual(ITEMS_PER_ASTEROID * asteroidCount)

    // ore and sand are routed to the regular inventory rather than the hotbar
    // (inventory.js#craft/store use Constants.regularInventoryBaseIndex), so
    // the starting kit is untouched
    expect(mined.every((item) => item.index >= 8)).toBe(true)
    expect(after.items.filter((item) => startingTypes.includes(item.type)))
      .toEqual(before.items)
  })

  test('will not mine a tile the player is too far from', async ({ page }) => {
    await createNewColonyAndJoin(page)

    // Both sides gate mining on range - the client only sets a mineTarget for a
    // tile within Helper.ENTITY_INTERACT_RANGE (224px, 7 tiles)
    // (base_terrain.js#onMouseOver) and the server re-checks it in
    // player.js#mine. An asteroid on screen but out of reach must stay intact.
    // 8 tiles out is past the 7-tile reach but still comfortably on a 1280x720
    // screen, so the cursor can actually be put on it
    const area = await findClearArea(page, { minTileDistance: 8, maxTileDistance: 9 })
    expect(area.error).toBeUndefined()

    const asteroid = await createTerrain(page, { type: 'Asteroid', row: area.row, col: area.col })
    expect(asteroid.error).toBeUndefined()

    await page.waitForFunction(
      ({ row, col }) => !!window.game.sector.map.get(row, col),
      { row: area.row, col: area.col },
      { timeout: 15_000 }
    )

    const center = tileCenter(area.row, area.col)
    await hoverWorld(page, center.x, center.y)
    await page.waitForTimeout(500)

    expect(await page.evaluate(() => !!window.player.mineTarget)).toBe(false)

    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(2000)

    expect(await readTerrain(page, area.row, area.col))
      .toMatchObject({ type: 'Asteroid', health: ASTEROID_HEALTH })
  })
})
