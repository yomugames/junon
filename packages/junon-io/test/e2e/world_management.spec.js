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

  // a large map takes a few seconds, so the form shows the server's progress
  test('shows progress while a large map is generated', async ({ page }) => {
    await page.goto('/')
    await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 30_000 })
    await page.click('.local_new_btn')
    await page.fill('.world_name', 'Large World')
    await page.fill('.world_rows', '512')
    await page.fill('.world_cols', '512')
    await page.click('.create_world')

    await expect(page.locator('.create_world')).toBeDisabled()
    await expect(page.locator('.world_progress')).toBeVisible()
    await expect(page.locator('.world_progress_label')).toHaveText(/(Generating terrain|Mapping regions)… [1-9][0-9]?%/, { timeout: 30_000 })

    await page.waitForFunction(() => !!window.player, null, { timeout: 60_000 })
    expect(await page.evaluate(() => window.game.sector.getRowCount())).toBe(512)
  })

  // over 512 tiles, a map gets one pixel per tile and canvases bigger than
  // the 512-pixel mini map, which scrolls across it
  test('creates a map wider than the mini map', async ({ page }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/')
    await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 30_000 })
    await page.click('.local_new_btn')
    await page.fill('.world_name', 'Wide World')
    await page.fill('.world_rows', '64')
    await page.fill('.world_cols', '640')
    await page.click('.create_world')
    await page.waitForFunction(() => !!window.player, null, { timeout: 60_000 })

    const canvases = await page.evaluate(() => ['#map_terrain_canvas', '#mini_map_terrain_canvas'].map((selector) => {
      const canvas = document.querySelector(selector)
      return [canvas.width, canvas.height]
    }))
    expect(canvases).toEqual([[640, 64], [640, 512]])
    expect(errors).toEqual([])
  })
})
