const { test, expect } = require('@playwright/test')
const { createNewColonyAndJoin } = require('./support/join')
const { readInitialEscapePod, readInventory, readStorage } = require('./support/scenario')
const { hoverWorld } = require('./support/screen')

// The escape pod is the first container a new player meets: the sector drops it
// two tiles to the player's right and preloads it with
// EscapePod#getInitialItems ("Potato:5", "PotatoSeed:3"), and emptying it is
// step 0 of the tutorial (escape_pod.js#onStorageChanged).
const POD_SLOT = (index) => `#storage_menu #storage_inventory .inventory_slot[data-index='${index}']`
const PLAYER_SLOT = (index) => `#storage_menu .storage_player_inventory .inventory_slot[data-index='${index}']`

// Opens the pod's storage menu the way a player does: put the cursor on it so
// it becomes the highlighted entity (base_building.js#onMouseOver, which needs
// the player inside Helper.ENTITY_INTERACT_RANGE), then press the "interact"
// key. E asks the server to open the storage (ViewStorage), and the menu only
// fills in once the server answers with the contents, so this waits for the
// answer rather than for the keystroke.
async function openEscapePod(page, pod) {
  await hoverWorld(page, pod.x, pod.y)

  await page.waitForFunction(
    (id) => {
      const highlighted = window.game.getHighlightedEntity()
      return !!highlighted && highlighted.id === id
    },
    pod.id,
    { timeout: 10_000 }
  )

  await page.keyboard.press('KeyE')
  await page.waitForSelector(POD_SLOT(0), { state: 'visible', timeout: 10_000 })
  await expect(page.locator('#storage_menu #storage_inventory'))
    .toHaveAttribute('data-storage-id', String(pod.id))
}

test.describe('escape pod storage', () => {
  test('takes an item out of the escape pod and puts one back in', async ({ page }) => {
    await createNewColonyAndJoin(page)

    const pod = await readInitialEscapePod(page)
    expect(pod.error).toBeUndefined()
    expect(pod.items).toEqual([
      { index: 0, type: 'Potato', count: 5 },
      { index: 1, type: 'PotatoSeed', count: 3 }
    ])

    await openEscapePod(page, pod)

    // the menu renders the server's contents into the slots' data attributes
    // (game.js#renderInventorySlot); Potato is BuildingType 120 and
    // PotatoSeed 119 (junon-common/protocol/enum.proto)
    await expect(page.locator(POD_SLOT(0))).toHaveAttribute('data-content', '5')
    await expect(page.locator(POD_SLOT(1))).toHaveAttribute('data-content', '3')

    // --- take: clicking a slot on the container's side moves the stack into
    // the player's inventory (base_menu.js#retrieveInventorySlot -> emit
    // "SwapInventory")
    await page.click(POD_SLOT(0))

    await expect
      .poll(async () => (await readInventory(page)).items.find((item) => item.type === 'Potato'), { timeout: 10_000 })
      .toMatchObject({ count: 5 })

    expect((await readStorage(page, pod.id)).items).toEqual([
      { index: 1, type: 'PotatoSeed', count: 3 }
    ])

    // SwapInventory swaps rather than appends, so the potatoes land in the slot
    // that lines up with the pod slot they came from
    const potato = (await readInventory(page)).items.find((item) => item.type === 'Potato')

    // --- put back: the same click on the player's side of the same menu stores
    // it into the container instead (base_menu.js#storeInventorySlot)
    //
    // Deliberately a single click. storeInventorySlot() bails out when
    // game.isHoldItemDeletedRecently is set, and that flag used to be armed
    // before the player had touched anything, so the first store of a session
    // was swallowed and only a second click went through. Asserting on one
    // click is what keeps that from coming back.
    await page.click(PLAYER_SLOT(potato.index))

    await expect
      .poll(async () => (await readStorage(page, pod.id)).items, { timeout: 10_000 })
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'Potato', count: 5 }),
          expect.objectContaining({ type: 'PotatoSeed', count: 3 })
        ])
      )

    expect((await readInventory(page)).items.find((item) => item.type === 'Potato')).toBeUndefined()
  })
})
