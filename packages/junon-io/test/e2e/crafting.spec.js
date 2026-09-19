const { test, expect } = require('@playwright/test')
const { createNewColonyAndJoin } = require('./support/join')
const { giveItems, readInventory } = require('./support/scenario')

// The crafting menu is opened with C (input_controller.js keyBindings.craft ->
// game.toggleBlueprintMenu) and is built once, at construction, from the
// client's own klass registries: a tab per building group plus one for
// equipments, each holding a .template_row per craftable klass
// (client/src/menus/blueprint_menu.js#getCraftingListContainer).
//
// Picking a row shows the ingredients and enables or disables the craft button
// from what the player is carrying (base_menu.js#showRequirements), and the
// button emits Craft on mousedown (base_menu.js#onCraftBtnHold -> craftItem).
const BLUEPRINT_MENU = '#blueprint_menu'
const CRAFT_BTN = `${BLUEPRINT_MENU} .craft_btn`

// A plain Floor costs one IronBar (constants Floors.Floor requirements), which
// makes it the cheapest thing in the menu to prove the whole flow with.
const PRODUCT = 'Floor'
const INGREDIENT = 'IronBar'
// the ingredient panel labels rows with the spaced-out display name
// (base_menu.js#createRequirementRow), not the klass name
const INGREDIENT_LABEL = 'Iron Bar'

async function openCraftMenu(page) {
  await page.keyboard.press('KeyC')
  await expect(page.locator(BLUEPRINT_MENU)).toBeVisible()
}

// Selects a group tab and then the row for one product inside it.
//
// Rows are matched on the name the menu itself renders, rather than on a
// hard-coded protobuf id: createTemplateRow labels each row with
// i18n.t(klass.getCraftTypeName()), which inserts a space before every capital
// ("SteelFloor" -> "Steel Floor"), so an exact match on "Floor" is unambiguous.
// Reading the row's data-type back out also checks that mapping still holds.
async function selectProduct(page, tab, productName) {
  await page.click(`${BLUEPRINT_MENU} .construction_tab[data-tab='${tab}']`)

  const type = await page.evaluate(({ tab, productName }) => {
    const rows = Array.from(
      document.querySelectorAll(`#blueprint_menu .template_row[data-construction-type='${tab}']`)
    )
    const row = rows.find((el) => el.querySelector('.template_name').innerText === productName)
    return row && row.dataset.type
  }, { tab, productName })

  expect(type).toBeTruthy()

  await page.click(`${BLUEPRINT_MENU} .template_row[data-type='${type}']`)
  await expect(page.locator(`${BLUEPRINT_MENU} .blueprint_name`)).toHaveText(productName)

  return type
}

function requirementRow(page, name) {
  return page
    .locator(`${BLUEPRINT_MENU} .requirement_row`)
    .filter({ hasText: name })
}

test.describe('crafting', () => {
  test('crafts a floor from iron bars through the craft menu', async ({ page }) => {
    await createNewColonyAndJoin(page)

    // No game mode is selected, so this is not a peaceful colony - which
    // matters, because in a peaceful one the owner's crafts succeed whether or
    // not the ingredients are there (server/entities/inventory.js#craft:
    // isSandboxMode() && isSectorOwner()). Leaving it unset is what makes the
    // ingredient bookkeeping below meaningful.
    expect(await page.evaluate(() => window.game.isPeaceful())).toBe(false)

    // Two bars, one more than the floor costs, so the "one was spent" assertion
    // can tell a deduction apart from the stack simply vanishing. Bars come
    // from smelting ore in a furnace, a chain that has nothing to do with the
    // craft menu, so they are granted directly.
    const granted = await giveItems(page, [{ type: INGREDIENT, count: 2, index: 8 }])
    expect(granted.error).toBeUndefined()

    await openCraftMenu(page)
    await selectProduct(page, 'Floors', PRODUCT)

    // the ingredient panel reports what is carried against what is needed
    await expect(requirementRow(page, INGREDIENT_LABEL).locator('.supply_count')).toHaveText('2')
    await expect(requirementRow(page, INGREDIENT_LABEL).locator('.requirement_count')).toHaveText('1')
    await expect(requirementRow(page, INGREDIENT_LABEL).locator('.requirement_supply'))
      .not.toHaveClass(/unmet/)

    // data-disabled is cleared to "" when the requirements are met
    await expect(page.locator(CRAFT_BTN)).toHaveAttribute('data-disabled', '')

    await page.click(CRAFT_BTN)

    await expect
      .poll(async () => (await readInventory(page)).items.find((item) => item.type === PRODUCT),
        { timeout: 10_000 })
      .toBeTruthy()

    const after = await readInventory(page)
    expect(after.items.find((item) => item.type === PRODUCT)).toMatchObject({ count: 1 })
    // exactly one bar was consumed
    expect(after.items.find((item) => item.type === INGREDIENT)).toMatchObject({ count: 1 })

    // and the menu re-reads the player's supply as the inventory changes
    // (craft_menu.js#onInventoryChanged -> showProductInfo)
    await expect(requirementRow(page, INGREDIENT_LABEL).locator('.supply_count')).toHaveText('1')
  })

  test('crafts several at once when a count is given', async ({ page }) => {
    await createNewColonyAndJoin(page)

    const granted = await giveItems(page, [{ type: INGREDIENT, count: 5, index: 8 }])
    expect(granted.error).toBeUndefined()

    await openCraftMenu(page)
    await selectProduct(page, 'Floors', PRODUCT)

    // .craft_count is sent as the Craft message's `count`, and the server
    // builds a single Item with that count (player.js#craft)
    await page.fill(`${BLUEPRINT_MENU} .craft_count`, '3')
    await page.click(CRAFT_BTN)

    await expect
      .poll(async () => (await readInventory(page)).items.find((item) => item.type === PRODUCT),
        { timeout: 10_000 })
      .toMatchObject({ count: 3 })

    const after = await readInventory(page)
    expect(after.items.find((item) => item.type === INGREDIENT)).toMatchObject({ count: 2 })
  })

  test('will not craft without the ingredients', async ({ page }) => {
    await createNewColonyAndJoin(page)

    await openCraftMenu(page)
    await selectProduct(page, 'Floors', PRODUCT)

    // nothing was granted, so the supply is short and the panel marks it
    await expect(requirementRow(page, INGREDIENT_LABEL).locator('.supply_count')).toHaveText('0')
    await expect(requirementRow(page, INGREDIENT_LABEL).locator('.requirement_supply'))
      .toHaveClass(/unmet/)
    await expect(page.locator(CRAFT_BTN)).toHaveAttribute('data-disabled', 'true')

    await page.click(CRAFT_BTN)
    await page.waitForTimeout(2000)

    const after = await readInventory(page)
    expect(after.items.find((item) => item.type === PRODUCT)).toBeUndefined()
  })
})
