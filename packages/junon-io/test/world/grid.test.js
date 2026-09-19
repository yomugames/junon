/*
  Grid - the tile-indexed spatial map backing every room/structure/unit lookup
  (registration, hit-testing, occupancy, pathfinding neighbors, line-of-sight
  raycasts). A real self-contained class with no PIXI/socket/DB dependency, so
  it is tested directly rather than through a mixin fixture.
*/

const Grid = require('../../common/entities/grid')
const Constants = require('../../common/constants.json')

const TILE = Constants.tileSize // 32

function makeEntity(id, overrides = {}) {
  return Object.assign({
    id,
    getId: () => id,
    isCollidable: () => true,
    isBuilding: () => false,
    isPenetrable: () => false,
    getCollisionGroup: () => Constants.collisionGroup.Building
  }, overrides)
}

describe('construction', () => {
  test('init fills every cell with the empty value', () => {
    const grid = new Grid('structure', {}, 3, 4)
    expect(grid.getRowCount()).toEqual(3)
    expect(grid.getColCount()).toEqual(4)

    grid.forEach((row, col, value) => {
      expect(value).toEqual(0)
    })
  })

  test('reset clears previously set cells back to empty', () => {
    const grid = new Grid('structure', {}, 2, 2)
    grid.set({ row: 0, col: 0, value: 'x' })
    grid.reset()

    expect(grid.get(0, 0)).toEqual(0)
  })
})

describe('get/set', () => {
  test('set/get round-trips a literal value', () => {
    const grid = new Grid('structure', {}, 2, 2)
    grid.set({ row: 1, col: 0, value: 'wall' })
    expect(grid.get(1, 0)).toEqual('wall')
  })

  test('set accepts a thunk and stores its invocation result', () => {
    const grid = new Grid('structure', {}, 2, 2)
    grid.set({ row: 0, col: 1, value: () => 'lazy' })
    expect(grid.get(0, 1)).toEqual('lazy')
  })

  test('get returns null when out of bounds or given NaN coords', () => {
    const grid = new Grid('structure', {}, 2, 2)
    expect(grid.get(-1, 0)).toBeNull()
    expect(grid.get(0, 5)).toBeNull()
    expect(grid.get('x', 0)).toBeNull()
  })
})

describe('isOutOfBounds', () => {
  test('flags negative and >= COUNT coords in either axis', () => {
    const grid = new Grid('structure', {}, 3, 3)
    expect(grid.isOutOfBounds(0, 0)).toEqual(false)
    expect(grid.isOutOfBounds(2, 2)).toEqual(false)
    expect(grid.isOutOfBounds(-1, 0)).toEqual(true)
    expect(grid.isOutOfBounds(0, 3)).toEqual(true)
    expect(grid.isOutOfBounds(3, 0)).toEqual(true)
  })
})

describe('getTilePosition / getXY', () => {
  test('getTilePosition floors world coords down to a row/col', () => {
    const grid = new Grid('structure', {}, 5, 5)
    expect(grid.getTilePosition(TILE * 2 + 5, TILE * 3 + 5)).toEqual({ row: 3, col: 2 })
  })

  test('getXY returns the center point of a tile', () => {
    const grid = new Grid('structure', {}, 5, 5)
    expect(grid.getXY(0, 0)).toEqual({ x: TILE / 2, y: TILE / 2 })
    expect(grid.getXY(1, 2)).toEqual({ x: 2 * TILE + TILE / 2, y: 1 * TILE + TILE / 2 })
  })
})

describe('register / unregister / hitTest', () => {
  test('register places the tileable in every tile its box covers', () => {
    const grid = new Grid('structure', {}, 5, 5)
    const entity = makeEntity('e1')
    // 2x2 tile box starting at tile (1,1)
    const box = { pos: { x: TILE, y: TILE }, w: TILE * 2, h: TILE * 2 }

    grid.register(box, entity)

    expect(grid.get(1, 1)).toBe(entity)
    expect(grid.get(1, 2)).toBe(entity)
    expect(grid.get(2, 1)).toBe(entity)
    expect(grid.get(2, 2)).toBe(entity)
  })

  test('unregister only clears tiles that still hold the given tileable', () => {
    const grid = new Grid('structure', {}, 5, 5)
    const entity = makeEntity('e1')
    const box = { pos: { x: 0, y: 0 }, w: TILE, h: TILE }

    grid.register(box, entity)
    grid.set({ row: 0, col: 0, value: 'someone-else' })
    grid.unregister(box, entity)

    // was overwritten after register, so unregister must not clobber it
    expect(grid.get(0, 0)).toEqual('someone-else')
  })

  test('unregister without a tileable blanks every tile in the box', () => {
    const grid = new Grid('structure', {}, 5, 5)
    grid.set({ row: 0, col: 0, value: 'x' })
    grid.unregister({ pos: { x: 0, y: 0 }, w: TILE, h: TILE })
    expect(grid.get(0, 0)).toEqual(0)
  })

  test('hitTest resolves a world point to its containing tile', () => {
    const grid = new Grid('structure', {}, 5, 5)
    const entity = makeEntity('e1')
    grid.set({ row: 2, col: 3, value: entity })

    expect(grid.hitTest(3 * TILE + 5, 2 * TILE + 5)).toEqual({ row: 2, col: 3, entity })
  })

  test('rowColHitTest reports entity: null for out-of-bounds coords', () => {
    const grid = new Grid('structure', {}, 2, 2)
    expect(grid.rowColHitTest(-1, 0)).toEqual({ row: -1, col: 0, entity: null })
  })
})

describe('collections (addToCollection/registerToCollection)', () => {
  test('addToCollection accumulates multiple entities per tile keyed by id', () => {
    const grid = new Grid('unit', {}, 3, 3)
    const a = makeEntity('a')
    const b = makeEntity('b')

    grid.addToCollection(0, 0, a)
    grid.addToCollection(0, 0, b)

    expect(grid.get(0, 0)).toEqual({ a, b })
  })

  test('removeFromCollection clears the tile back to empty once the last entry is gone', () => {
    const grid = new Grid('unit', {}, 3, 3)
    const a = makeEntity('a')

    grid.addToCollection(0, 0, a)
    grid.removeFromCollection(0, 0, a)

    expect(grid.get(0, 0)).toEqual(0)
  })

  test('registerToCollection/unregisterToCollection span every tile the box covers', () => {
    const grid = new Grid('unit', {}, 3, 3)
    const a = makeEntity('a')
    const box = { pos: { x: 0, y: 0 }, w: TILE * 2, h: TILE }

    grid.registerToCollection(box, a)
    expect(grid.get(0, 0)).toEqual({ a })
    expect(grid.get(0, 1)).toEqual({ a })

    grid.unregisterFromCollection(box, a)
    expect(grid.get(0, 0)).toEqual(0)
    expect(grid.get(0, 1)).toEqual(0)
  })
})

describe('isTileEmptyRowCol / isOccupied', () => {
  test('isTileEmptyRowCol treats out-of-bounds as empty', () => {
    const grid = new Grid('structure', {}, 2, 2)
    expect(grid.isTileEmptyRowCol(5, 5)).toEqual(true)
    expect(grid.isTileEmptyRowCol(0, 0)).toEqual(true)

    grid.set({ row: 0, col: 0, value: 'x' })
    expect(grid.isTileEmptyRowCol(0, 0)).toEqual(false)
  })

  test('isOccupied for a single-tile box checks exactly that tile', () => {
    const grid = new Grid('structure', {}, 3, 3)
    grid.set({ row: 1, col: 1, value: 'x' })

    expect(grid.isOccupied(1 * TILE + 5, 1 * TILE + 5, TILE, TILE)).toEqual(true)
    expect(grid.isOccupied(0 * TILE + 5, 0 * TILE + 5, TILE, TILE)).toEqual(false)
  })

  test('isOccupied for a multi-tile box delegates to isBoxOccupied (any tile filled)', () => {
    const grid = new Grid('structure', {}, 3, 3)
    grid.set({ row: 0, col: 1, value: 'x' })

    const centerX = TILE // spans tiles (0,0)-(0,1) roughly
    const centerY = TILE / 2
    expect(grid.isOccupied(centerX, centerY, TILE * 2, TILE)).toEqual(true)
  })

  test('isFullyOccupied requires every tile in the box to be filled', () => {
    const grid = new Grid('structure', {}, 3, 3)
    grid.set({ row: 0, col: 0, value: 'x' })
    // (0,1) left empty

    const box = { x: TILE, y: TILE / 2, w: TILE * 2, h: TILE }
    expect(grid.isFullyOccupied(box.x, box.y, box.w, box.h)).toEqual(false)

    grid.set({ row: 0, col: 1, value: 'y' })
    expect(grid.isFullyOccupied(box.x, box.y, box.w, box.h)).toEqual(true)
  })
})

describe('getNeighbors / getNeighborsAllowEmpty', () => {
  test('getNeighbors only returns the orthogonal tiles that are occupied', () => {
    const grid = new Grid('structure', {}, 3, 3)
    const top = makeEntity('top')
    grid.set({ row: 0, col: 1, value: top })
    // left/right/down left empty

    const neighbors = grid.getNeighbors(1, 1)
    expect(neighbors).toEqual([{ row: 0, col: 1, entity: top }])
  })

  test('getNeighborsAllowEmpty always returns 4 (or 8 with walls) entries, empty or not', () => {
    const grid = new Grid('structure', {}, 3, 3)
    expect(grid.getNeighborsAllowEmpty(1, 1)).toHaveLength(4)
    expect(grid.getNeighborsAllowEmpty(1, 1, true)).toHaveLength(8)
  })
})

describe('count', () => {
  test('counts only truthy cells', () => {
    const grid = new Grid('structure', {}, 3, 3)
    grid.set({ row: 0, col: 0, value: 'a' })
    grid.set({ row: 2, col: 2, value: 'b' })
    expect(grid.count()).toEqual(2)
  })
})

describe('raycast', () => {
  test('a clear straight line reports no obstacles', () => {
    const grid = new Grid('structure', {}, 5, 5)
    const hits = grid.raycast(TILE / 2, TILE / 2, TILE * 4, TILE / 2)
    expect(hits).toEqual([])
  })

  test('stops at (and reports) the first collidable tile crossed', () => {
    const grid = new Grid('structure', {}, 5, 5)
    const wall = makeEntity('wall')
    grid.set({ row: 0, col: 2, value: wall })

    const hits = grid.raycast(TILE / 2, TILE / 2, TILE * 4 + TILE / 2, TILE / 2)
    const entities = hits.map((hit) => hit.entity)
    expect(entities).toContain(wall)
  })

  test('a penetrable building does not block the ray from continuing', () => {
    const grid = new Grid('structure', {}, 5, 5)
    const glassWall = makeEntity('glass', { isBuilding: () => true, isPenetrable: () => true })
    const solidWall = makeEntity('solid')

    grid.set({ row: 0, col: 1, value: glassWall })
    grid.set({ row: 0, col: 3, value: solidWall })

    const hits = grid.raycast(TILE / 2, TILE / 2, TILE * 4 + TILE / 2, TILE / 2)
    const entities = hits.map((hit) => hit.entity)

    expect(entities).toContain(glassWall)
    expect(entities).toContain(solidWall)
  })

  test('a non-collidable entity in the path is ignored entirely', () => {
    const grid = new Grid('structure', {}, 5, 5)
    const decoration = makeEntity('deco', { isCollidable: () => false })
    grid.set({ row: 0, col: 2, value: decoration })

    const hits = grid.raycast(TILE / 2, TILE / 2, TILE * 4 + TILE / 2, TILE / 2)
    expect(hits.map((hit) => hit.entity)).not.toContain(decoration)
  })
})
