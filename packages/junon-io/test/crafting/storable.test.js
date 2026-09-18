/*
  Storable - shared inventory/storage container logic used by player inventories,
  workshops, chests, etc. Covers stacking, overflow splitting across slots,
  startIndex-scoped lookups (used e.g. to prefer the "regular" inventory range
  before falling back to the full range), and slot bookkeeping.
*/

const Storable = require('../../common/interfaces/storable')

class Container {
  constructor(length) {
    this.initStorable(length)
    this.changes = []
  }
}

Object.assign(Container.prototype, Storable.prototype, {
  onStorageChanged(item, index, previousItem) {
    this.changes.push({ item, index, previousItem })
  }
})

class MockItem {
  constructor(type, count = 1, maxStack = 99) {
    this.type = type
    this.count = count
    this.maxStack = maxStack
    this.removed = false
  }

  getMaxStack() {
    return this.maxStack
  }

  isStackableType() {
    return true
  }

  isFullyStacked() {
    return this.count >= this.maxStack
  }

  onStorageChanged() {}

  setStorage(storage, index) {
    this.storage = storage
    this.index = index
  }

  remove() {
    this.removed = true
    if (this.storage) this.storage.removeItem(this)
  }
}

describe('store', () => {
  test('places an item in the first empty slot when nothing to stack onto', () => {
    const container = new Container(5)
    const wood = new MockItem('Wood', 3)

    expect(container.store(wood)).toEqual(true)
    expect(container.get(0)).toBe(wood)
  })

  test('stacks onto an existing item of the same type instead of using a new slot', () => {
    const container = new Container(5)
    container.storeAt(0, new MockItem('Wood', 10))

    const moreWood = new MockItem('Wood', 5)
    container.store(moreWood)

    expect(container.get(0).count).toEqual(15)
    expect(moreWood.removed).toEqual(true) // fully absorbed into the stack
    expect(container.getStorageOccupancyCount()).toEqual(1)
  })

  test('splits overflow into a new slot when a stack would exceed maxStack', () => {
    const container = new Container(5)
    container.storeAt(0, new MockItem('Wood', 90, 99))

    const incoming = new MockItem('Wood', 20, 99)
    container.store(incoming)

    expect(container.get(0).count).toEqual(99) // topped off
    expect(container.get(1)).toBe(incoming)
    expect(container.get(1).count).toEqual(11) // 90 + 20 - 99 leftover
  })

  test('returns false when the container is full and nothing can be stacked', () => {
    const container = new Container(1)
    container.storeAt(0, new MockItem('Stone', 99, 99))

    const wood = new MockItem('Wood', 1)
    expect(container.store(wood)).toEqual(false)
  })

  test('respects startIndex, skipping earlier slots entirely', () => {
    const container = new Container(3)
    const wood = new MockItem('Wood', 1)

    container.store(wood, 1)

    expect(container.get(0)).toBeUndefined()
    expect(container.get(1)).toBe(wood)
  })

  test('does nothing for a falsy item or an item without a type', () => {
    const container = new Container(3)
    expect(container.store(null)).toBeUndefined()
    expect(container.store({})).toBeUndefined()
    expect(container.isEmpty()).toEqual(true)
  })
})

describe('isFull / isEmpty', () => {
  test('isFull(type) is false when an existing stack of that type still has room', () => {
    const container = new Container(1)
    container.storeAt(0, new MockItem('Wood', 50, 99))

    expect(container.isFull()).toEqual(true) // no empty slots
    expect(container.isFull('Wood')).toEqual(false) // but Wood can still stack
  })

  test('isEmpty reflects whether any slot is occupied', () => {
    const container = new Container(3)
    expect(container.isEmpty()).toEqual(true)

    container.storeAt(0, new MockItem('Wood', 1))
    expect(container.isEmpty()).toEqual(false)
  })

  test('getEmptySpaceCount / isFullyStored track occupancy against storage length', () => {
    const container = new Container(3)
    container.storeAt(0, new MockItem('Wood', 1))

    expect(container.getEmptySpaceCount()).toEqual(2)
    expect(container.isFullyStored()).toEqual(false)

    container.storeAt(1, new MockItem('Stone', 1))
    container.storeAt(2, new MockItem('Metal', 1))
    expect(container.isFullyStored()).toEqual(true)
  })
})

describe('getEmptySpaceIndex / getStackableSpaceIndex startIndex', () => {
  test('getEmptySpaceIndex skips indices before startIndex', () => {
    const container = new Container(3)
    expect(container.getEmptySpaceIndex(1)).toEqual(1)
  })

  test('getStackableSpaceIndex only considers a matching, non-full stack at/after startIndex', () => {
    const container = new Container(3)
    container.storeAt(0, new MockItem('Wood', 5, 99))
    container.storeAt(1, new MockItem('Wood', 5, 99))

    expect(container.getStackableSpaceIndex('Wood', 0)).toEqual(0)
    expect(container.getStackableSpaceIndex('Wood', 1)).toEqual(1)
    expect(container.getStackableSpaceIndex('Wood', 2)).toEqual(-1)
  })
})

describe('retrieval and removal', () => {
  test('retrieve removes and returns the item at an index', () => {
    const container = new Container(3)
    const wood = new MockItem('Wood', 1)
    container.storeAt(0, wood)

    const retrieved = container.retrieve(0)

    expect(retrieved).toBe(wood)
    expect(container.get(0)).toBeUndefined()
  })

  test('findItemIndex / removeItem locate and remove by reference', () => {
    const container = new Container(3)
    const wood = new MockItem('Wood', 1)
    container.storeAt(1, wood)

    expect(container.findItemIndex(wood)).toEqual(1)

    container.removeItem(wood)
    expect(container.get(1)).toBeUndefined()
  })

  test('search / filter / getItemCount / hasItem locate items by type', () => {
    const container = new Container(3)
    const woodA = new MockItem('Wood', 3)
    const woodB = new MockItem('Wood', 4)
    container.storeAt(0, woodA)
    container.storeAt(1, woodB)

    expect(container.search('Wood')).toBe(woodA)
    expect(container.filter('Wood')).toEqual([woodA, woodB])
    expect(container.getItemCount('Wood')).toEqual(7)
  })

  test('clearStorage removes everything by default', () => {
    const container = new Container(2)
    container.storeAt(0, new MockItem('Wood', 1))
    container.storeAt(1, new MockItem('Stone', 1))

    container.clearStorage()

    expect(container.getStorageItems()).toEqual([])
  })
})

describe('storeAt', () => {
  test('overwrites a mismatched-type slot and reports the previous item via onStorageChanged', () => {
    const container = new Container(2)
    const stone = new MockItem('Stone', 1)
    container.storeAt(0, stone)

    const wood = new MockItem('Wood', 1)
    container.storeAt(0, wood)

    expect(container.get(0)).toBe(wood)
    const lastChange = container.changes[container.changes.length - 1]
    expect(lastChange.previousItem).toBe(stone)
  })
})
