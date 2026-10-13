const { test, expect } = require('@playwright/test')
const { createNewColonyAndJoin } = require('./support/join')

// The Tutorial menu entry asks the server for a throwaway tutorial world
// (Server#activateTutorialWorld) and joins it. The tutorial is never saved, so
// it must not appear in the player's world list afterwards.
//
// The client recognises the tutorial by its map's sector name, so this also
// checks that the bundled map (common/tutorial.sav.gz) loaded.
test.describe('tutorial', () => {
  test('starts the tutorial from the menu and keeps it out of the world list', async ({ page }) => {
    await page.goto('/')
    await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 30_000 })

    await page.click('.local_tutorial_btn')
    await page.waitForFunction(() => !!window.player, null, { timeout: 60_000 })

    const isTutorial = await page.evaluate(() => window.game.sector.isTutorial())
    expect(isTutorial).toBe(true)

    const worlds = await page.evaluate(async () => (await (await fetch('/local/worlds')).json()).worlds)
    expect(worlds.some((world) => world.id.startsWith('tutorial-'))).toBe(false)
  })

  test('opening a world after the tutorial replaces it', async ({ page }) => {
    await page.goto('/')
    await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 30_000 })
    await page.click('.local_tutorial_btn')
    await page.waitForFunction(() => !!window.player, null, { timeout: 60_000 })

    await createNewColonyAndJoin(page)

    const isTutorial = await page.evaluate(() => window.game.sector.isTutorial())
    expect(isTutorial).toBe(false)
  })
})
