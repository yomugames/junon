/*
  BaseBuilding - pure placement/repair helpers that don't require a live game/sector.
  Full construction (BaseBuilding.build) needs a real container/sector/game graph, so
  here we unit test the standalone geometry, neighbor-bitmask and break-progress logic
  by instantiating the prototype directly and stubbing only what each method touches.
  Room/network allocation on placement is covered separately in test/rooms/partition.test.js.
*/

// BaseBuilding pulls in Team -> firebase_admin_helper -> firebase-admin/auth,
// which transitively depends on the ESM-only `jose` package and can't load
// under Jest's CJS runtime. None of the logic under test here touches Team,
// so we stub it out to keep this a hermetic unit test of BaseBuilding itself.
jest.mock('../../server/entities/team', () => ({
  MemberRoleType: 0,
  AdminRoleType: 1,
  SlaveRoleType: 2
}))

const BaseBuilding = require('../../server/entities/buildings/base_building')

function createBuilding(overrides = {}) {
  const building = Object.create(BaseBuilding.prototype)
  Object.assign(building, { w: 32, h: 32, origAngle: 0 }, overrides)
  return building
}

describe('normalizeAngle', () => {
  test('leaves ordinary angles untouched', () => {
    const building = createBuilding()
    expect(building.normalizeAngle(90)).toEqual(90)
    expect(building.normalizeAngle(0)).toEqual(0)
  })

  test('wraps angles past 360', () => {
    const building = createBuilding()
    expect(building.normalizeAngle(450)).toEqual(90)
  })

  test('special-cases 270 to -90', () => {
    const building = createBuilding()
    expect(building.normalizeAngle(270)).toEqual(-90)
  })
})

describe('getRotatedWidth / getRotatedHeight', () => {
  test('returns the same dimensions for a square building regardless of angle', () => {
    const building = createBuilding({ w: 32, h: 32, origAngle: 90 })
    expect(building.getRotatedWidth()).toEqual(32)
    expect(building.getRotatedHeight()).toEqual(32)
  })

  test('swaps width/height for a non-square building rotated 90 degrees', () => {
    const building = createBuilding({ w: 32, h: 64, origAngle: 90 })
    expect(building.getRotatedWidth()).toEqual(64)
    expect(building.getRotatedHeight()).toEqual(32)
  })

  test('keeps original dimensions at 0 degrees', () => {
    const building = createBuilding({ w: 32, h: 64, origAngle: 0 })
    expect(building.getRotatedWidth()).toEqual(32)
    expect(building.getRotatedHeight()).toEqual(64)
  })
})

describe('neighbor bitmask', () => {
  test('setNeighbors packs left/top/right/down/diagonal presence into a single bitmask', () => {
    const building = createBuilding()
    building.onStateChanged = () => {} // side-effecting chunk/network bookkeeping not under test

    // indices: 0 left, 1 top, 2 right, 3 down, 4 topleft, 5 topright, 6 bottomleft, 7 bottomright
    building.setNeighbors([
      { entity: {} },  // left
      { entity: null }, // top
      { entity: {} },  // right
      { entity: null }, // down
      { entity: null }, // topleft
      { entity: {} },  // topright
      { entity: null }, // bottomleft
      { entity: null }, // bottomright
    ])

    const expectedBits = (1 << 3) /* left */ | (1 << 1) /* right */ | (1 << 5) /* topright */
    expect(building.neighbors).toEqual(expectedBits)
  })

  test('treats missing diagonal entries as absent (optional chaining)', () => {
    const building = createBuilding()
    building.onStateChanged = () => {}

    building.setNeighbors([
      { entity: null },
      { entity: null },
      { entity: null },
      { entity: null },
    ])

    expect(building.neighbors).toEqual(0)
  })

  test('getOppositeNeighborDirection maps a side-hit index to the direction back towards self', () => {
    const building = createBuilding()
    // hit order from NetworkManager#getSideHitsFor: left, up, right, down, then corners
    const expected = ['right', 'down', 'left', 'up', 'bottomright', 'bottomleft', 'topright', 'topleft']

    expected.forEach((direction, index) => {
      expect(building.getOppositeNeighborDirection(index)).toEqual(direction)
    })
  })

  test('getShiftValueByDirection matches the bit layout used by setNeighbors', () => {
    const building = createBuilding()

    expect(building.getShiftValueByDirection('down')).toEqual(0)
    expect(building.getShiftValueByDirection('right')).toEqual(1)
    expect(building.getShiftValueByDirection('up')).toEqual(2)
    expect(building.getShiftValueByDirection('left')).toEqual(3)
    expect(building.getShiftValueByDirection('topleft')).toEqual(4)
    expect(building.getShiftValueByDirection('topright')).toEqual(5)
    expect(building.getShiftValueByDirection('bottomleft')).toEqual(6)
    expect(building.getShiftValueByDirection('bottomright')).toEqual(7)
  })

  test('setNeighborBit enables and disables individual bits without touching others', () => {
    const building = createBuilding({ neighbors: 0 })
    building.onStateChanged = () => {}

    building.setNeighborBit('left', 1)
    building.setNeighborBit('down', 1)
    expect(building.neighbors).toEqual((1 << 3) | (1 << 0))

    building.setNeighborBit('left', 0)
    expect(building.neighbors).toEqual(1 << 0)
  })
})

describe('break progress / dismantle threshold', () => {
  function createBreakableBuilding() {
    const building = createBuilding()
    building.onBreakProgressChanged = jest.fn()
    return building
  }

  test('clamps break progress between 0 and getMaxBreak()', () => {
    const building = createBreakableBuilding()

    building.setBreakProgress(-5)
    expect(building.breakProgress).toEqual(0)

    building.setBreakProgress(999)
    expect(building.breakProgress).toEqual(building.getMaxBreak())
  })

  test('only notifies onBreakProgressChanged when the value actually changes', () => {
    const building = createBreakableBuilding()

    building.setBreakProgress(1)
    expect(building.onBreakProgressChanged).toHaveBeenCalledTimes(1)

    building.setBreakProgress(1)
    expect(building.onBreakProgressChanged).toHaveBeenCalledTimes(1)

    building.setBreakProgress(0)
    expect(building.onBreakProgressChanged).toHaveBeenCalledTimes(2)
  })

  test('getBreakProgress floors fractional progress and defaults to 0', () => {
    const building = createBuilding()
    expect(building.getBreakProgress()).toEqual(0)

    building.breakProgress = 1.9
    expect(building.getBreakProgress()).toEqual(1)
  })
})

describe('isRepairable', () => {
  test('is true when damaged and not a crop', () => {
    const building = createBuilding()
    building.isCrop = () => false
    building.getHealth = () => 5
    building.getMaxHealth = () => 10

    expect(building.isRepairable()).toEqual(true)
  })

  test('is false at full health', () => {
    const building = createBuilding()
    building.isCrop = () => false
    building.getHealth = () => 10
    building.getMaxHealth = () => 10

    expect(building.isRepairable()).toEqual(false)
  })

  test('is false for crops regardless of health', () => {
    const building = createBuilding()
    building.isCrop = () => true
    building.getHealth = () => 1
    building.getMaxHealth = () => 10

    expect(building.isRepairable()).toEqual(false)
  })
})
