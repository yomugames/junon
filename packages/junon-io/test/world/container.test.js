/*
  Container - shared "world grid" logic mixed into Sector/Ship: owns every
  per-tile Grid (structures, armor, platforms, units...), the generic
  register/unregisterComponent bookkeeping used by most buildable entities,
  grid-snapping math for placement, and raycasting across collidable layers.
*/

const Container = require('../../common/interfaces/container')
const Constants = require('../../common/constants.json')

const TILE = Constants.tileSize // 32

class World {
  constructor({ rowCount = 5, colCount = 5, x = 0, y = 0 } = {}) {
    this.rowCount = rowCount
    this.colCount = colCount
    this.x = x
    this.y = y
    this.componentAdded = []
    this.componentRemoved = []
    this.initGrids()
  }

  getRowCount() { return this.rowCount }
  getColCount() { return this.colCount }
  getX() { return this.x }
  getY() { return this.y }
}

// Container.prototype.onComponentAdded/onComponentRemoved are empty stub
// callbacks, so our tracking overrides must be applied after the mixin.
Object.assign(World.prototype, Container.prototype, {
  onComponentAdded(entity) { this.componentAdded.push(entity) },
  onComponentRemoved(entity) { this.componentRemoved.push(entity) }
})

function makeEntity(id, { box, owner } = {}) {
  return {
    id,
    getRelativeBox: () => box || { pos: { x: 0, y: 0 }, w: TILE, h: TILE },
    hasOwner: () => !!owner,
    getOwner: () => owner
  }
}

describe('initGrids', () => {
  test('builds every named grid sized to the row/col count', () => {
    const world = new World({ rowCount: 4, colCount: 6 })

    expect(world.structureMap.getRowCount()).toEqual(4)
    expect(world.structureMap.getColCount()).toEqual(6)
    expect(world.platformMap.getRowCount()).toEqual(4)
    expect(world.unitMap.getColCount()).toEqual(6)
  })

  test('resets the plain-object collections', () => {
    const world = new World()
    expect(world.structures).toEqual({})
    expect(world.units).toEqual({})
    expect(world.pickups).toEqual({})
  })
})

describe('registerComponent / unregisterComponent', () => {
  test('registers into both the collection and the tile map, and fires onComponentAdded', () => {
    const world = new World()
    const entity = makeEntity('e1', { box: { pos: { x: 0, y: 0 }, w: TILE, h: TILE } })

    world.registerComponent('structures', 'structureMap', entity)

    expect(world.structures['e1']).toBe(entity)
    expect(world.structureMap.get(0, 0)).toBe(entity)
    expect(world.componentAdded).toEqual([entity])
  })

  test('unregisterComponent clears both, fires onComponentRemoved, and skips ownership when unowned', () => {
    const world = new World()
    const entity = makeEntity('e1')
    world.registerComponent('structures', 'structureMap', entity)

    world.unregisterComponent('structures', 'structureMap', entity)

    expect(world.structures['e1']).toBeUndefined()
    expect(world.structureMap.get(0, 0)).toEqual(0)
    expect(world.componentRemoved).toEqual([entity])
  })

  test('unregisterComponent also unregisters ownership when the entity has an owner', () => {
    const world = new World()
    const unregisterOwnership = jest.fn()
    const owner = { unregisterOwnership }
    const entity = makeEntity('e1', { owner })

    world.registerComponent('structures', 'structureMap', entity)
    world.unregisterComponent('structures', 'structureMap', entity)

    expect(unregisterOwnership).toHaveBeenCalledWith('structures', entity)
  })

  test('registering a new entity on an occupied tile evicts the previous occupant', () => {
    const world = new World()
    const evicted = makeEntity('evicted')
    evicted.remove = jest.fn()
    const box = { pos: { x: 0, y: 0 }, w: TILE, h: TILE }
    world.structureMap.register(box, evicted)

    const incoming = makeEntity('incoming', { box })
    world.registerComponent('structures', 'structureMap', incoming)

    expect(evicted.remove).toHaveBeenCalledTimes(1)
    expect(world.structureMap.get(0, 0)).toBe(incoming)
  })
})

describe('breaking/crop/processor/pickup bookkeeping', () => {
  test('add/remove keep a plain id-keyed dictionary', () => {
    const world = new World()
    const entity = { id: 'b1' }

    world.addBreaking(entity)
    expect(world.breakings['b1']).toBe(entity)
    world.removeBreaking(entity)
    expect(world.breakings['b1']).toBeUndefined()

    world.addCrop(entity)
    expect(world.crops['b1']).toBe(entity)

    world.addProcessor(entity)
    expect(world.processors['b1']).toBe(entity)
    world.removeProcessor(entity)
    expect(world.processors['b1']).toBeUndefined()

    world.addPickup(entity)
    expect(world.pickups['b1']).toBe(entity)
    world.removePickup(entity)
    expect(world.pickups['b1']).toBeUndefined()
  })
})

describe('grid geometry helpers', () => {
  test('getGridWidth/Height scale tile count by tileSize', () => {
    const world = new World({ rowCount: 3, colCount: 4 })
    expect(world.getGridWidth()).toEqual(4 * TILE)
    expect(world.getGridHeight()).toEqual(3 * TILE)
  })

  test('getGridRulerTopLeft centers the grid on the container position', () => {
    const world = new World({ rowCount: 2, colCount: 2, x: 100, y: 200 })
    expect(world.getGridRulerTopLeft()).toEqual({
      x: 100 - TILE, // half of 2*TILE
      y: 200 - TILE
    })
  })

  test('getGridCoord returns position relative to the grid top-left', () => {
    const world = new World({ rowCount: 2, colCount: 2, x: 0, y: 0 })
    const topLeft = world.getGridRulerTopLeft()
    expect(world.getGridCoord(topLeft.x + 5, topLeft.y + 10)).toEqual({ x: 5, y: 10 })
  })

  test('isOutOfBounds mirrors the grid dimensions', () => {
    const world = new World({ rowCount: 3, colCount: 3 })
    expect(world.isOutOfBounds(0, 0)).toEqual(false)
    expect(world.isOutOfBounds(3, 0)).toEqual(true)
    expect(world.isOutOfBounds(0, -1)).toEqual(true)
  })

  test('testBoxPoint checks whether a point falls within a box', () => {
    const world = new World()
    expect(world.testBoxPoint(0, 0, 10, 10, 5, 5)).toEqual(true)
    expect(world.testBoxPoint(0, 0, 10, 10, 11, 5)).toEqual(false)
  })
})

describe('getSnappedPosX / getSnappedPosY', () => {
  test('snaps a raw coordinate to the nearest tile-aligned position for a 1-tile object', () => {
    const world = new World({ rowCount: 4, colCount: 4, x: 0, y: 0 })
    const topLeft = world.getGridRulerTopLeft()

    // a point comfortably inside tile col 1 snaps to that tile's center-aligned x
    const snappedX = world.getSnappedPosX(topLeft.x + TILE + 5, TILE)
    expect(snappedX).toEqual(TILE + TILE / 2)
  })
})

describe('getPathFindingGrid', () => {
  test('layers structure > armor > platform, falling back to platform when both are empty', () => {
    const world = new World({ rowCount: 1, colCount: 3 })

    const structureTile = { getType: () => 1 }
    const armorTile = { getType: () => 2 }
    const platformTile = { getType: () => 3 }

    world.structureMap.set({ row: 0, col: 0, value: structureTile })
    world.armorMap.set({ row: 0, col: 1, value: armorTile })
    world.platformMap.set({ row: 0, col: 2, value: platformTile })

    const grid = world.getPathFindingGrid()

    expect(grid[0][0]).toEqual(1) // structure wins even though nothing else is set there
    expect(grid[0][1]).toEqual(2) // armor wins over the (empty) platform
    expect(grid[0][2]).toEqual(3) // falls back to platform
  })
})

describe('raycast / getRaycastObstacles', () => {
  test('delegates to getCollidableGrids and returns the nearest blocking hit', () => {
    const world = new World({ rowCount: 5, colCount: 5 })
    const near = { id: 'near', isBuilding: () => false, isCollidable: () => true }
    const far = { id: 'far', isBuilding: () => false, isCollidable: () => true }

    world.structureMap.set({ row: 0, col: 1, value: near })
    world.structureMap.set({ row: 0, col: 3, value: far })

    world.getCollidableGrids = () => [world.structureMap]

    const nearest = world.raycast(TILE / 2, TILE / 2, TILE * 4 + TILE / 2, TILE / 2)
    expect(nearest.entity).toBe(near)
  })

  test('a penetrable building is excluded from obstacles but a solid one is not', () => {
    const world = new World({ rowCount: 5, colCount: 5 })
    const glass = { id: 'glass', isBuilding: () => true, isPenetrable: () => true, isCollidable: () => true }
    const solid = { id: 'solid', isBuilding: () => true, isPenetrable: () => false, isPathFindBlocker: () => true, isCollidable: () => true }

    world.structureMap.set({ row: 0, col: 1, value: glass })
    world.structureMap.set({ row: 0, col: 3, value: solid })
    world.getCollidableGrids = () => [world.structureMap]

    const obstacles = world.getRaycastObstacles(TILE / 2, TILE / 2, TILE * 4 + TILE / 2, TILE / 2)
    const entities = obstacles.map((o) => o.entity)

    expect(entities).not.toContain(glass)
    expect(entities).toContain(solid)
  })
})
