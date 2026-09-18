/*
  Item.getRequiredOperations / Item.canMeetRequirements - the core crafting-cost
  matching logic used by Inventory#craft and Workshop#craft: given a recipe's
  requirements and the items currently in an inventory, figure out whether the
  recipe can be paid for and which items/counts should be deducted.
*/

// Item.js's module graph pulls in Buildings/index -> BaseBuilding -> Team ->
// firebase_admin_helper -> firebase-admin/auth, which transitively depends on
// the ESM-only `jose` package and can't load under Jest's CJS runtime. Nothing
// under test here touches Team, so stub it out to keep this hermetic.
jest.mock('../../server/entities/team', () => ({
  MemberRoleType: 0,
  AdminRoleType: 1,
  SlaveRoleType: 2
}))

const Item = require('../../server/entities/item')

function mockItem(typeName, count) {
  return {
    getTypeName: () => typeName,
    count
  }
}

describe('getRequiredOperations', () => {
  test('deducts from a single matching item up to the required amount', () => {
    const requirements = { Wood: 5 }
    const wood = mockItem('Wood', 10)

    const operations = Item.getRequiredOperations(requirements, [wood])

    expect(operations).toEqual([{ item: wood, count: 5 }])
    expect(requirements.Wood).toEqual(0)
  })

  test('spreads deduction across multiple stacks of the same type', () => {
    const requirements = { Wood: 12 }
    const woodA = mockItem('Wood', 5)
    const woodB = mockItem('Wood', 10)

    const operations = Item.getRequiredOperations(requirements, [woodA, woodB])

    expect(operations).toEqual([
      { item: woodA, count: 5 },
      { item: woodB, count: 7 }
    ])
    expect(requirements.Wood).toEqual(0)
  })

  test('leaves requirement partially unmet when inventory is insufficient', () => {
    const requirements = { Wood: 12 }
    const wood = mockItem('Wood', 5)

    Item.getRequiredOperations(requirements, [wood])

    expect(requirements.Wood).toEqual(7)
  })

  test('ignores items that are not part of the requirements', () => {
    const requirements = { Wood: 5 }
    const stone = mockItem('Stone', 10)

    const operations = Item.getRequiredOperations(requirements, [stone])

    expect(operations).toEqual([])
    expect(requirements.Wood).toEqual(5)
  })

  test('skips empty inventory slots', () => {
    const requirements = { Wood: 5 }
    const wood = mockItem('Wood', 5)

    const operations = Item.getRequiredOperations(requirements, [null, wood, undefined])

    expect(operations).toEqual([{ item: wood, count: 5 }])
  })

  test('BloodBottle requirement only counts a bottle that is full', () => {
    const requirements = { BloodBottle: 1 }
    const emptyBottle = { getTypeName: () => 'BloodBottle', count: 1, instance: { isFull: () => false } }
    const fullBottle = { getTypeName: () => 'BloodBottle', count: 1, instance: { isFull: () => true } }

    const operations = Item.getRequiredOperations(requirements, [emptyBottle, fullBottle])

    expect(operations).toEqual([{ item: fullBottle, count: 1 }])
    expect(requirements.BloodBottle).toEqual(0)
  })
})

describe('canMeetRequirements', () => {
  test('returns true when inventory fully covers every requirement', () => {
    const requirements = { Wood: 5, Metal: 2 }
    const inventory = [mockItem('Wood', 5), mockItem('Metal', 2)]

    expect(Item.canMeetRequirements(requirements, inventory)).toEqual(true)
  })

  test('returns false when any requirement is not fully met', () => {
    const requirements = { Wood: 5, Metal: 2 }
    const inventory = [mockItem('Wood', 5), mockItem('Metal', 1)]

    expect(Item.canMeetRequirements(requirements, inventory)).toEqual(false)
  })

  test('returns true for an empty requirements set regardless of inventory', () => {
    expect(Item.canMeetRequirements({}, [])).toEqual(true)
  })

  test('mutates the requirements object it is given, so callers must pass a fresh copy per attempt', () => {
    const requirements = { Wood: 5 }
    const inventory = [mockItem('Wood', 5)]

    expect(Item.canMeetRequirements(requirements, inventory)).toEqual(true)
    // the first call depletes requirements.Wood to 0 in place; a depleted (falsy)
    // requirement is then skipped entirely on subsequent calls rather than
    // re-validated, so reusing the same object always reports success afterwards.
    expect(requirements.Wood).toEqual(0)
    expect(Item.canMeetRequirements(requirements, [])).toEqual(true)
  })
})
