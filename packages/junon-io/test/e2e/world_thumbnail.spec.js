const { test, expect } = require('@playwright/test')
const { createNewColonyAndJoin } = require('./support/join')

// The camera button in the colony menu's Preview tab stores a thumbnail for the
// world (Sector#addScreenshot). After leaving the world, its card in the local
// world menu should show that thumbnail instead of the placeholder.
test.describe('world thumbnail', () => {
  test('shows a preview taken in-game on the world card', async ({ page }) => {
    await createNewColonyAndJoin(page)

    await page.evaluate(() => window.game.teamMenu.open())
    await page.click('#manage_team_menu .colony_screenshot_tab')
    await page.click('#manage_team_menu .add_screenshot_btn')
    await page.waitForFunction(() => Object.keys(window.game.sector.screenshots).length > 0, null, { timeout: 15_000 })

    await page.goto('/')
    const thumbnail = page.locator('.local_world_entry .local_world_thumbnail')
    await expect(thumbnail).toHaveCount(1, { timeout: 15_000 })
    await expect.poll(() => thumbnail.evaluate((img) => img.complete && img.naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0)
  })
})
