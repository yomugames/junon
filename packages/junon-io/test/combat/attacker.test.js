/*
  Attacker - shared targeting logic for mobs, towers, and player-controlled attacks.
  canAttack() is the gatekeeper deciding whether a target is legal to attack at all
  (alliance, invisibility, god mode, already-destroyed); hasReachedAttackInterval /
  attack() drive the cooldown-gated firing loop. Both are pure enough to test without
  a running game loop.
*/

const Attacker = require('../../common/interfaces/attacker')
const Constants = require('../../common/constants.json')

class Unit {
  constructor({ alliance = null, game } = {}) {
    this.alliance = alliance
    this.game = game || { timestamp: 0 }
  }

  getAlliance() {
    return this.alliance
  }
}

Object.assign(Unit.prototype, Attacker.prototype)

function mockTarget(overrides = {}) {
  return Object.assign({
    isInvisible: () => false,
    isDestroyed: () => false,
    isRemoved: false,
    godMode: false,
    getAlliance: () => 'enemy-team'
  }, overrides)
}

describe('canAttack', () => {
  test('allows attacking a valid enemy target', () => {
    const attacker = new Unit({ alliance: 'my-team' })
    expect(attacker.canAttack(mockTarget())).toEqual(true)
  })

  test('refuses to attack a member of the same alliance', () => {
    const attacker = new Unit({ alliance: 'my-team' })
    const ally = mockTarget({ getAlliance: () => 'my-team' })
    expect(attacker.canAttack(ally)).toEqual(false)
  })

  test('treats unowned (allianceless) targets as friendly', () => {
    const attacker = new Unit({ alliance: 'my-team' })
    const unowned = mockTarget({ getAlliance: () => null })
    expect(attacker.canAttack(unowned)).toEqual(false)
  })

  test('refuses to attack an invisible target by default', () => {
    const attacker = new Unit({ alliance: 'my-team' })
    const invisible = mockTarget({ isInvisible: () => true })
    expect(attacker.canAttack(invisible)).toEqual(false)
  })

  test('allows attacking an invisible target when canAttackInvisible is overridden', () => {
    const attacker = new Unit({ alliance: 'my-team' })
    attacker.canAttackInvisible = () => true
    const invisible = mockTarget({ isInvisible: () => true })
    expect(attacker.canAttack(invisible)).toEqual(true)
  })

  test('refuses to attack an already-destroyed target', () => {
    const attacker = new Unit({ alliance: 'my-team' })
    const destroyed = mockTarget({ isDestroyed: () => true })
    expect(attacker.canAttack(destroyed)).toEqual(false)
  })

  test('refuses to attack a removed target', () => {
    const attacker = new Unit({ alliance: 'my-team' })
    const removed = mockTarget({ isRemoved: true })
    expect(attacker.canAttack(removed)).toEqual(false)
  })

  test('refuses to attack a target in god mode', () => {
    const attacker = new Unit({ alliance: 'my-team' })
    const invincible = mockTarget({ godMode: true })
    expect(attacker.canAttack(invincible)).toEqual(false)
  })

  test('respects a custom shouldChooseTarget override', () => {
    const attacker = new Unit({ alliance: 'my-team' })
    attacker.shouldChooseTarget = () => false
    expect(attacker.canAttack(mockTarget())).toEqual(false)
  })
})

describe('hasReachedAttackInterval', () => {
  function createAttacker(attackIntervalMs) {
    const attacker = new Unit({ game: { timestamp: 0 } })
    attacker.getAttackInterval = () => attackIntervalMs
    attacker.resetLastAttackTime()
    return attacker
  }

  test('is false immediately after resetLastAttackTime (startup delay applies)', () => {
    const attacker = createAttacker(1000)
    expect(attacker.hasReachedAttackInterval()).toEqual(false)
  })

  test('becomes true once enough game ticks have elapsed', () => {
    const attacker = createAttacker(1000)
    // convertMillisecondToFrames(1000) at physicsTimeStep=10 => 10 ticks
    attacker.game.timestamp += attacker.convertMillisecondToFrames(1000) + 1
    expect(attacker.hasReachedAttackInterval()).toEqual(true)
  })

  test('convertMillisecondToFrames scales by physicsTimeStep', () => {
    const attacker = createAttacker(1000)
    const frames = attacker.convertMillisecondToFrames(1000)
    expect(frames).toEqual(Constants.physicsTimeStep)
  })
})

describe('attack', () => {
  test('does nothing without an attackTarget', () => {
    const attacker = new Unit()
    attacker.performAttack = jest.fn()
    attacker.attack()
    expect(attacker.performAttack).not.toHaveBeenCalled()
  })

  test('does not fire again before the attack interval has elapsed', () => {
    const attacker = new Unit({ game: { timestamp: 0 } })
    attacker.getAttackInterval = () => 1000
    attacker.resetLastAttackTime()
    attacker.performAttack = jest.fn()
    attacker.attackTarget = mockTarget()

    attacker.attack()
    expect(attacker.performAttack).not.toHaveBeenCalled()
  })

  test('fires once the interval has elapsed and updates lastAttackTime', () => {
    const attacker = new Unit({ game: { timestamp: 0 } })
    attacker.getAttackInterval = () => 1000
    attacker.resetLastAttackTime()
    attacker.performAttack = jest.fn()
    const target = mockTarget()
    attacker.attackTarget = target

    attacker.game.timestamp += attacker.convertMillisecondToFrames(1000) + 1
    attacker.attack()

    expect(attacker.performAttack).toHaveBeenCalledWith(target)
    expect(attacker.lastAttackTime).toEqual(attacker.game.timestamp)
  })
})

describe('setAttackTarget / setDesiredAttackTarget callbacks', () => {
  test('setAttackTarget(null) notifies onTargetOutOfRange with the previous target', () => {
    const attacker = new Unit()
    const target = mockTarget()
    attacker.onTargetOutOfRange = jest.fn()

    attacker.attackTarget = target
    attacker.setAttackTarget(null)

    expect(attacker.onTargetOutOfRange).toHaveBeenCalledWith(target)
    expect(attacker.attackTarget).toBeNull()
  })

  test('setAttackTarget(target) notifies onAttackTargetFound', () => {
    const attacker = new Unit()
    const target = mockTarget()
    attacker.onAttackTargetFound = jest.fn()

    attacker.setAttackTarget(target)

    expect(attacker.onAttackTargetFound).toHaveBeenCalledWith(target)
    expect(attacker.attackTarget).toBe(target)
  })

  test('setDesiredAttackTarget only fires found/removed callbacks when the target actually changes', () => {
    const attacker = new Unit()
    const target = mockTarget()
    attacker.onDesiredAttackTargetFound = jest.fn()
    attacker.onDesiredTargetRemoved = jest.fn()

    attacker.setDesiredAttackTarget(target)
    expect(attacker.onDesiredAttackTargetFound).toHaveBeenCalledTimes(1)

    attacker.setDesiredAttackTarget(target) // unchanged
    expect(attacker.onDesiredAttackTargetFound).toHaveBeenCalledTimes(1)

    attacker.setDesiredAttackTarget(null)
    expect(attacker.onDesiredTargetRemoved).toHaveBeenCalledWith(target)
  })
})
