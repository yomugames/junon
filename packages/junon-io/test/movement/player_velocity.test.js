/*
  PlayerCommon - translates held WASD-style control keys into a velocity vector.
  getVelocity() is yaw-aware (rotates input relative to camera/ship orientation)
  while getVelocityFromControls() is a simpler axis-aligned version. Both are pure
  functions of (speed, moveYaw, controlKeys), so we can test them directly.
*/

const PlayerCommon = require('../../common/entities/player_common')
const Constants = require('../../common/constants.json')

class Player {
  constructor({ speed = 10, moveYaw = 0 } = {}) {
    this.speed = speed
    this.moveYaw = moveYaw
  }
}

Object.assign(Player.prototype, PlayerCommon.prototype)

const { up, down, left, right } = Constants.Control

function toArray(vec) {
  return [vec[0], vec[1]]
}

describe('getVelocityFromControls', () => {
  test('moves left/right along x and down/up along y', () => {
    const player = new Player({ speed: 10 })

    expect(toArray(player.getVelocityFromControls(left, 10))).toEqual([-10, 0])
    expect(toArray(player.getVelocityFromControls(right, 10))).toEqual([10, 0])
    expect(toArray(player.getVelocityFromControls(down, 10))).toEqual([0, 10])
    expect(toArray(player.getVelocityFromControls(up, 10))).toEqual([0, -10])
  })

  test('is stationary when no direction key is held', () => {
    const player = new Player()
    expect(toArray(player.getVelocityFromControls(0, 10))).toEqual([0, 0])
  })

  test('when both keys on an axis are held, the later check (right/up) wins', () => {
    const player = new Player()
    // left is checked before right, and down before up, so the second
    // assignment silently overwrites the first instead of cancelling out.
    expect(toArray(player.getVelocityFromControls(left | right, 10))).toEqual([10, 0])
    expect(toArray(player.getVelocityFromControls(up | down, 10))).toEqual([0, -10])
  })
})

describe('getMoveData / getVelocity (yaw-aware)', () => {
  test('at yaw 0, up moves along +y and is not normalized for a single direction', () => {
    const player = new Player({ speed: 10, moveYaw: 0 })

    const velocity = player.getVelocity(up)

    expect(velocity.x).toBeCloseTo(0)
    expect(velocity.y).toBeCloseTo(10)
  })

  test('at yaw 0, right moves along +x', () => {
    const player = new Player({ speed: 10, moveYaw: 0 })

    const velocity = player.getVelocity(right)

    expect(velocity.x).toBeCloseTo(10)
    expect(velocity.y).toBeCloseTo(0)
  })

  test('diagonal movement is normalized so speed does not exceed base speed', () => {
    const player = new Player({ speed: 10, moveYaw: 0 })

    const velocity = player.getVelocity(up | right)

    const magnitude = Math.sqrt(velocity.x ** 2 + velocity.y ** 2)
    expect(magnitude).toBeCloseTo(10)
    expect(velocity.x).toBeCloseTo(10 / Math.sqrt(2))
    expect(velocity.y).toBeCloseTo(10 / Math.sqrt(2))
  })

  test('opposing keys produce zero velocity', () => {
    const player = new Player({ speed: 10, moveYaw: 0 })

    const velocity = player.getVelocity(left | right)

    expect(velocity.x).toBeCloseTo(0)
    expect(velocity.y).toBeCloseTo(0)
  })

  test('moveYaw rotates which world direction "up" maps to', () => {
    const player = new Player({ speed: 10, moveYaw: Math.PI / 2 })

    const velocity = player.getVelocity(up)

    // sin(90deg)=1, cos(90deg)~=6.12e-17 (not exactly 0), so the diagonal
    // "both axes nonzero" check still triggers and normalizes by sqrt(2)
    // even though this is conceptually a single-direction input.
    expect(velocity.x).toBeCloseTo(10 / Math.sqrt(2))
    expect(velocity.y).toBeCloseTo(0)
  })
})
