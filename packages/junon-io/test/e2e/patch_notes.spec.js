const { test, expect } = require('@playwright/test')

// The version in the home menu's left rail opens the Patch notes panel, which
// lists the latest releases newest first (rendered from changelogs/ when the
// page is built).
test.describe('patch notes', () => {
  test('opens from the version and starts with the current release', async ({ page }) => {
    await page.goto('/')
    await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 30_000 })

    const version = (await page.textContent('.local_changelog_btn .game_version')).trim()
    await page.click('.local_changelog_btn')

    await expect(page.locator('.local_menu_panel h2')).toHaveText('Patch notes')
    await expect(page.locator('.local_changelog_entry').first().locator('.local_changelog_version')).toHaveText(version)
  })
})
