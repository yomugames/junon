const { test, expect } = require('@playwright/test')

// The New world form's map size, and deleting a world from its card in the
// world list (client/src/components/local_world_menu.js).
test.describe('world management', () => {
  test('creates a world with a chosen map size, then deletes it', async ({ page }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/')
    await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 30_000 })

    await page.click('.local_new_btn')
    await expect(page.locator('.world_rows')).toHaveValue('128')
    await expect(page.locator('.world_cols')).toHaveValue('128')

    // a size that isn't whole chunks is refused with a message
    await page.fill('.world_name', 'Sized World')
    await page.fill('.world_rows', '100')
    await page.click('.create_world')
    await expect(page.locator('.local_menu_message')).toContainText('multiples of 16')

    await page.fill('.world_rows', '64')
    await page.fill('.world_cols', '96')
    await page.click('.create_world')
    await page.waitForFunction(() => !!window.player, null, { timeout: 60_000 })

    const size = await page.evaluate(() => [window.game.sector.getRowCount(), window.game.sector.getColCount()])
    expect(size).toEqual([64, 96])
    const mapCanvas = await page.evaluate(() => {
      const canvas = document.querySelector('#map_terrain_canvas')
      return [canvas.width, canvas.height]
    })
    expect(mapCanvas).toEqual([96 * 5, 64 * 5])

    await page.goto('/')
    const card = page.locator('.local_world_card', { hasText: 'Sized World' })
    await expect(card).toHaveCount(1, { timeout: 15_000 })

    // dismissing the confirmation keeps the world
    page.once('dialog', (dialog) => dialog.dismiss())
    await card.hover()
    await card.locator('.local_world_delete').click()
    await expect(card).toHaveCount(1)

    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('Sized World')
      dialog.accept()
    })
    await card.hover()
    await card.locator('.local_world_delete').click()
    await expect(card).toHaveCount(0, { timeout: 15_000 })
    await expect(page.locator('.local_menu_message')).toHaveText('')

    expect(errors).toEqual([])
  })
})
