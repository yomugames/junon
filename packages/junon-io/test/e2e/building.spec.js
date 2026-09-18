const { test, expect } = require('@playwright/test')
const { createNewColonyAndJoin } = require('./support/join')
const {
  findClearArea,
  readInitialEscapePod,
  readInventory,
  readStructure
} = require('./support/scenario')
const { hoverWorld } = require('./support/screen')

// The Core is 2x2 tiles (common/constants.json Buildings.Core: width 64,
// height 64), and a 64px-wide building snaps its centre onto a tile *corner*
// rather than a tile centre (common/interfaces/container.js#getSnappedPosX:
// offset ((64/32) - 1) * 16 = 16, so the snapped x is col * 32). So the point
// to aim at for an area whose top-left tile is (row, col) is the corner shared
// by its four tiles - which is exactly the area's geometric centre, and what
// findClearArea reports.
const CORE_HOTBAR_INDEX = 2

test.describe('building', () => {
  test('equips the starting Core from the hotbar and places it on the ground', async ({ page }) => {
    await createNewColonyAndJoin(page)

    // A player who creates a colony is given the Admin role, and
    // server/entities/player.js#initStartingEquipment hands the admin a Core
    // (plus 150 gold) on top of the usual SurvivalTool and Bottle. So the Core
    // is already in the hotbar - nothing has to be crafted or granted to test
    // placement. Core has no `requirements` at all, which means the server
    // refuses to craft it (player.js#craft rejects requirement-less items);
    // this starting item is the only way to get one.
    const before = await readInventory(page)
    expect(before.error).toBeUndefined()
    expect(before.items).toEqual(
      expect.arrayContaining([{ index: CORE_HOTBAR_INDEX, type: 'Core', count: 1 }])
    )

    const area = await findClearArea(page, { widthInTiles: 2, heightInTiles: 2 })
    expect(area.error).toBeUndefined()

    // pressing a number key is the real way to equip a hotbar slot
    // (input_controller.js globalKeyUpHandler -> setEquipIndex). The server
    // acknowledges with EquipIndexChanged, and only then does the client build
    // the translucent "ghost" in player.building (player.js#enterBuildMode), so
    // wait for the ghost rather than for the keystroke.
    await page.keyboard.press(String(CORE_HOTBAR_INDEX + 1))
    await page.waitForFunction(
      () => !!(window.player.building && window.player.isBuilding()),
      null,
      { timeout: 10_000 }
    )

    // moving the mouse drags the ghost, snapping it to the grid
    await hoverWorld(page, area.centerX, area.centerY)

    const ghost = await page.evaluate(() => {
      const building = window.player.building
      const container = window.player.getActiveBuildingContainer()
      const gridCoord = container.getGridCoord(building.getX(), building.getY())

      return {
        type: building.getTypeName(),
        x: building.getX(),
        y: building.getY(),
        // the client refuses to even send a Build for a position it considers
        // invalid (player.js#placeBuilding), so a test that clicked at a bad
        // spot would otherwise just silently do nothing
        isPositionValid: window.player.isBuildingPositionValid(container, building, gridCoord)
      }
    })

    expect(ghost.type).toEqual('Core')
    expect({ x: ghost.x, y: ghost.y }).toEqual({ x: area.centerX, y: area.centerY })
    expect(ghost.isPositionValid).toBe(true)

    // a left click on the canvas holds the "space" control bit, which the
    // client's own frame loop turns into performAction() -> placeBuilding()
    // -> emit("Build") (game.js#applyMyInputs)
    await page.mouse.down()
    await page.mouse.up()

    // server/entities/player.js#build registers the building on the
    // structureMap and then consumes the inventory item
    await expect
      .poll(async () => (await readStructure(page, area.row, area.col)).type, { timeout: 10_000 })
      .toEqual('Core')

    // a 2x2 building registers on every tile it covers; checking all four is
    // what distinguishes a real placement from a one-tile stub
    for (let row = area.row; row < area.row + 2; row++) {
      for (let col = area.col; col < area.col + 2; col++) {
        expect(await readStructure(page, row, col)).toMatchObject({
          exists: true,
          type: 'Core'
        })
      }
    }

    const after = await readInventory(page)
    expect(after.items.find((item) => item.type === 'Core')).toBeUndefined()
  })

  test('refuses to place a building where the ground is not clear', async ({ page }) => {
    await createNewColonyAndJoin(page)

    // The escape pod the sector spawns beside the player
    // (server/entities/survival_sector.js#initEscapePod) already occupies the
    // structureMap, and both sides reject a build that overlaps it
    // (base_building.js#isPositionValid: !container.structureMap.isOccupied).
    const pod = await readInitialEscapePod(page)
    expect(pod.error).toBeUndefined()

    await page.keyboard.press(String(CORE_HOTBAR_INDEX + 1))
    await page.waitForFunction(() => !!window.player.building, null, { timeout: 10_000 })

    await hoverWorld(page, pod.x, pod.y)

    expect(await page.evaluate(() => {
      const building = window.player.building
      const container = window.player.getActiveBuildingContainer()
      const gridCoord = container.getGridCoord(building.getX(), building.getY())
      return window.player.isBuildingPositionValid(container, building, gridCoord)
    })).toBe(false)

    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(1000)

    // the pod is still there, and the Core is still in the inventory: the click
    // was rejected rather than half-applied
    expect(await readStructure(page, pod.row, pod.col)).toMatchObject({
      id: pod.id,
      type: 'EscapePod'
    })

    const inventory = await readInventory(page)
    expect(inventory.items).toEqual(
      expect.arrayContaining([{ index: CORE_HOTBAR_INDEX, type: 'Core', count: 1 }])
    )
  })
})
