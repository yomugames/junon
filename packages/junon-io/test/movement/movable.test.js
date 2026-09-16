/*
  Movable - steering/acceleration math shared by ships, mobs and other physics-driven entities.
  These are pure vector calculations, so we exercise them directly against a lightweight
  mock entity instead of spinning up a full physics body.
*/

const Movable = require('../../common/interfaces/movable')
const Constants = require('../../common/constants.json')

class Unit {
  constructor({ speed = 10, width = 20, turnSpeed = 5 } = {}) {
    this.speed = speed
    this.width = width
    this.turnSpeed = turnSpeed
    this.body = { position: [0, 0], velocity: [0, 0] }
    this.initMovable()
  }
}

// Movable.prototype declares abstract methods (e.g. getSpeed) that throw by
// default, so our concrete overrides must be applied after the mixin to win.
Object.assign(Unit.prototype, Movable.prototype, {
  getSpeed() {
    return this.speed
  },

  getWidth() {
    return this.width
  },

  getRadAngle() {
    return 0
  },

  getDirectionRadianModifier() {
    return 0
  }
})

describe('accelerate', () => {
  test('ramps velocity towards the desired direction incrementally', () => {
    const unit = new Unit()
    const body = { velocity: [0, 0] }

    unit.accelerate(body, [10, 0], 5)
    expect(body.velocity[0]).toBeCloseTo(1)
    expect(body.velocity[1]).toBeCloseTo(0)

    unit.accelerate(body, [10, 0], 5)
    expect(body.velocity[0]).toBeCloseTo(2)
  })

  test('clamps velocity length to maxSpeed once exceeded', () => {
    const unit = new Unit()
    const body = { velocity: [0, 0] }

    // 6 accelerations of +1 along x would overshoot maxSpeed of 5
    for (let i = 0; i < 6; i++) {
      unit.accelerate(body, [10, 0], 5)
    }

    const length = Math.sqrt(body.velocity[0] ** 2 + body.velocity[1] ** 2)
    expect(length).toBeCloseTo(5)
    expect(body.velocity[0]).toBeCloseTo(5)
    expect(body.velocity[1]).toBeCloseTo(0)
  })

  test('defaults maxSpeed to getMaxSpeed when not provided', () => {
    const unit = new Unit()
    unit.getMaxSpeed = () => 1
    const body = { velocity: [0, 0] }

    unit.accelerate(body, [10, 0])

    const length = Math.sqrt(body.velocity[0] ** 2 + body.velocity[1] ** 2)
    expect(length).toBeLessThanOrEqual(1.0001)
  })
})

describe('arrive', () => {
  test('steers towards a far away target at capped speed', () => {
    const unit = new Unit({ speed: 20 })
    unit.body.position = [0, 0]
    unit.body.velocity = [0, 0]

    const steer = unit.arrive([100, 0])

    expect(steer[0]).toBeCloseTo(20)
    expect(steer[1]).toBeCloseTo(0)
  })

  test('subtracts current velocity from the desired velocity', () => {
    const unit = new Unit({ speed: 20 })
    unit.body.position = [0, 0]
    unit.body.velocity = [5, 0]

    const steer = unit.arrive([100, 0])

    expect(steer[0]).toBeCloseTo(15)
  })

  test('returns zero vector once within close distance of target', () => {
    const unit = new Unit({ speed: 20 })
    unit.body.position = [0, 0]

    const steer = unit.arrive([5, 0]) // closeDistance defaults to 10

    expect(steer[0]).toBe(0)
    expect(steer[1]).toBe(0)
  })

  test('returns zero vector when no target is given', () => {
    const unit = new Unit()
    const steer = unit.arrive(null)

    expect(steer[0]).toBe(0)
    expect(steer[1]).toBe(0)
  })
})

describe('separate', () => {
  test('pushes away from a nearby neighbor proportional to width and speed', () => {
    const unit = new Unit({ speed: 10, width: 20 }) // radius = 10
    unit.body.position = [0, 0]

    const neighbor = { body: { position: [5, 0] } }

    const force = unit.separate([unit, neighbor])

    expect(force[0]).toBeCloseTo(-5)
    expect(force[1]).toBeCloseTo(0)
  })

  test('ignores neighbors outside the separation distance', () => {
    const unit = new Unit({ speed: 10, width: 20 })
    unit.body.position = [0, 0]

    const farNeighbor = { body: { position: [1000, 0] } }

    const force = unit.separate([unit, farNeighbor])

    expect(force[0]).toBe(0)
    expect(force[1]).toBe(0)
  })

  test('handles a neighbor stacked at the exact same position without dividing by zero', () => {
    const unit = new Unit({ speed: 10, width: 20 })
    unit.body.position = [3, 3]

    const overlapping = { body: { position: [3, 3] } }

    const force = unit.separate([unit, overlapping])

    expect(Number.isFinite(force[0])).toBe(true)
    expect(Number.isFinite(force[1])).toBe(true)
  })
})

describe('cohesion', () => {
  test('steers towards the center of mass of neighbors', () => {
    const unit = new Unit({ speed: 20 })
    unit.body.position = [0, 0]
    unit.body.velocity = [0, 0]

    const neighborA = { body: { position: [100, 0] } }
    const neighborB = { body: { position: [100, 0] } }

    const force = unit.cohesion([neighborA, neighborB])
    const expected = unit.arrive([100, 0])

    expect(force[0]).toBeCloseTo(expected[0])
    expect(force[1]).toBeCloseTo(expected[1])
  })

  test('returns zero force when there are no neighbors', () => {
    const unit = new Unit()
    const force = unit.cohesion([])

    expect(force[0]).toBe(0)
    expect(force[1]).toBe(0)
  })
})

describe('getForceFromControls', () => {
  test('moves forward along current facing when up is held', () => {
    const unit = new Unit({ speed: 10 })
    const force = unit.getForceFromControls(Constants.Control.up, 1)

    expect(force[0]).toBeCloseTo(10)
    expect(force[1]).toBeCloseTo(0)
  })

  test('scales force by deltaTime', () => {
    const unit = new Unit({ speed: 10 })
    const force = unit.getForceFromControls(Constants.Control.up, 0.5)

    expect(force[0]).toBeCloseTo(5)
  })

  test('produces no force when no movement key is held', () => {
    const unit = new Unit({ speed: 10 })
    const force = unit.getForceFromControls(Constants.Control.space, 1)

    expect(force[0]).toBe(0)
    expect(force[1]).toBe(0)
  })
})

describe('getAngleDeltaFromControls', () => {
  test('turns left by negative turnSpeed', () => {
    const unit = new Unit({ turnSpeed: 5 })
    const target = { turnSpeed: 5 }
    const delta = unit.getAngleDeltaFromControls(target, Constants.Control.left)
    expect(delta).toBe(-5)
  })

  test('turns right by positive turnSpeed', () => {
    const unit = new Unit({ turnSpeed: 5 })
    const target = { turnSpeed: 5 }
    const delta = unit.getAngleDeltaFromControls(target, Constants.Control.right)
    expect(delta).toBe(5)
  })

  test('does not turn when neither left nor right is held', () => {
    const unit = new Unit()
    const target = { turnSpeed: 5 }
    const delta = unit.getAngleDeltaFromControls(target, Constants.Control.up)
    expect(delta).toBe(0)
  })
})
