/*
  BoundingBox - shared AABB math mixed into every positioned entity (players,
  buildings, mobs, items). getBox/getBoxWithRadius/updateRbushCoords back the
  rbush spatial index and hit-testing used throughout collision and pathfinding,
  so a mistake here has a very wide blast radius despite the tiny surface area.
*/

const BoundingBox = require('../../common/interfaces/bounding_box')

class Entity {
  constructor({ x = 0, y = 0, width = 10, height = 20 } = {}) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }
}

// BoundingBox.prototype.getX/getY are just throwing stubs demanding an
// override, so our concrete implementations must be applied after the mixin.
Object.assign(Entity.prototype, BoundingBox.prototype, {
  getX() { return this.x },
  getY() { return this.y },
  getWidth() { return this.width },
  getHeight() { return this.height }
})

describe('unimplemented getX/getY', () => {
  test('throw by default so a concrete entity is forced to override them', () => {
    const bare = Object.create(BoundingBox.prototype)
    expect(() => bare.getX()).toThrow()
    expect(() => bare.getY()).toThrow()
  })
})

describe('getBox', () => {
  test('centers a box of width/height on the given x, y', () => {
    const entity = new Entity({ x: 100, y: 50, width: 10, height: 20 })
    expect(entity.getBox()).toEqual({
      pos: { x: 95, y: 40 },
      w: 10,
      h: 20
    })
  })

  test('accepts explicit x, y, w, h overriding the entity defaults', () => {
    const entity = new Entity({ x: 100, y: 50, width: 10, height: 20 })
    expect(entity.getBox(0, 0, 4, 4)).toEqual({
      pos: { x: -2, y: -2 },
      w: 4,
      h: 4
    })
  })
})

describe('getBoxWithRadius', () => {
  test('produces a square box of side radius*2 centered on the entity', () => {
    const entity = new Entity({ x: 100, y: 50 })
    expect(entity.getBoxWithRadius(5)).toEqual({
      pos: { x: 95, y: 45 },
      w: 10,
      h: 10
    })
  })
})

describe('updateRbushCoords', () => {
  test('derives minX/minY/maxX/maxY from the current position and size', () => {
    const entity = new Entity({ x: 100, y: 50, width: 10, height: 20 })
    entity.updateRbushCoords()

    expect(entity.minX).toEqual(95)
    expect(entity.minY).toEqual(40)
    expect(entity.maxX).toEqual(105)
    expect(entity.maxY).toEqual(60)
  })

  test('getBoundingBox reflects the coords computed by updateRbushCoords', () => {
    const entity = new Entity({ x: 0, y: 0, width: 32, height: 32 })
    entity.updateRbushCoords()

    expect(entity.getBoundingBox()).toEqual({
      minX: -16, minY: -16, maxX: 16, maxY: 16
    })
  })
})

describe('getNeighborBoundingBox', () => {
  test('pads the stored min/max coords, defaulting to 100', () => {
    const entity = new Entity({ x: 0, y: 0, width: 32, height: 32 })
    entity.updateRbushCoords()

    expect(entity.getNeighborBoundingBox()).toEqual({
      minX: -116, minY: -116, maxX: 116, maxY: 116
    })
  })

  test('accepts a custom padding', () => {
    const entity = new Entity({ x: 0, y: 0, width: 32, height: 32 })
    entity.updateRbushCoords()

    expect(entity.getNeighborBoundingBox(10)).toEqual({
      minX: -26, minY: -26, maxX: 26, maxY: 26
    })
  })
})
