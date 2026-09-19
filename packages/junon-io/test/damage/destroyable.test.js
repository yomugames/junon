/*
  Destroyable - shared health/damage logic for players, mobs and buildings.
  Covers health clamping, damage resistance, minimum-1-damage floor, and the
  entity:destroyed event firing exactly once when health reaches zero.
*/

const EventBus = require('eventbusjs')
const Destroyable = require('../../common/interfaces/destroyable')

class Entity {
  constructor(game, maxHealth = 10) {
    this.game = game
    this.maxHealth = maxHealth
    this.initDestroyable()
  }
}

// Destroyable.prototype.getMaxHealth is just a stub default (10), so our
// concrete override must be applied after the mixin to take precedence.
Object.assign(Entity.prototype, Destroyable.prototype, {
  getMaxHealth() {
    return this.maxHealth
  }
})

function createGame() {
  return { getId: () => 'game-1' }
}

describe('initDestroyable', () => {
  test('defaults health to getMaxHealth()', () => {
    const entity = new Entity(createGame(), 50)
    expect(entity.getHealth()).toEqual(50)
    expect(entity.isHealthFull()).toEqual(true)
  })

  test('accepts an explicit initial health', () => {
    const entity = new Entity(createGame())
    entity.initDestroyable(3)
    expect(entity.getHealth()).toEqual(3)
    expect(entity.isHealthFull()).toEqual(false)
  })
})

describe('damage', () => {
  test('reduces health by the damage amount', () => {
    const entity = new Entity(createGame(), 10)
    entity.damage(4)
    expect(entity.getHealth()).toEqual(6)
  })

  test('throws when amount is NaN', () => {
    const entity = new Entity(createGame(), 10)
    expect(() => entity.damage(NaN)).toThrow()
  })

  test('never deals less than 1 damage even with full resistance', () => {
    const entity = new Entity(createGame(), 10)
    entity.getDamageResistance = () => 9999
    entity.damage(5)
    expect(entity.getHealth()).toEqual(9)
  })

  test('subtracts resistance from the raw amount before applying', () => {
    const entity = new Entity(createGame(), 10)
    entity.getDamageResistance = () => 3
    entity.damage(5)
    expect(entity.getHealth()).toEqual(8) // 5 - 3 = 2 damage
  })

  test('truncates fractional damage via parseInt', () => {
    const entity = new Entity(createGame(), 10)
    entity.damage(4.9)
    expect(entity.getHealth()).toEqual(6) // floor(4.9) = 4
  })

  test('defaults attackEntity to attacker when not provided', () => {
    const entity = new Entity(createGame(), 10)
    const attacker = { id: 'attacker-1' }
    let receivedAttackEntity

    entity.getDamageResistance = (amount, attackEntity) => {
      receivedAttackEntity = attackEntity
      return 0
    }

    entity.damage(5, attacker)
    expect(receivedAttackEntity).toBe(attacker)
  })

  test('calls onDamaged before health is reduced', () => {
    const entity = new Entity(createGame(), 10)
    const calls = []
    entity.onDamaged = () => calls.push(entity.getHealth())

    entity.damage(4)
    expect(calls).toEqual([10])
    expect(entity.getHealth()).toEqual(6)
  })
})

describe('setHealth', () => {
  test('clamps to 0 on the low end', () => {
    const entity = new Entity(createGame(), 10)
    entity.setHealth(-5)
    expect(entity.getHealth()).toEqual(0)
  })

  test('clamps to getMaxHealth() on the high end', () => {
    const entity = new Entity(createGame(), 10)
    entity.setHealth(999)
    expect(entity.getHealth()).toEqual(10)
  })

  test('throws if the resulting delta is NaN', () => {
    const entity = new Entity(createGame(), 10)
    expect(() => entity.setHealth(NaN)).toThrow()
  })

  test('calls onHealthReduced then onPostSetHealth when health drops', () => {
    const entity = new Entity(createGame(), 10)
    const order = []
    entity.onHealthReduced = () => order.push('reduced')
    entity.onPostSetHealth = () => order.push('post')

    entity.setHealth(5)
    expect(order).toEqual(['reduced', 'post'])
  })

  test('calls onHealthIncreased then onPostSetHealth when health rises', () => {
    const entity = new Entity(createGame(), 10)
    entity.setHealth(2)

    const order = []
    entity.onHealthIncreased = () => order.push('increased')
    entity.onPostSetHealth = () => order.push('post')

    entity.setHealth(8)
    expect(order).toEqual(['increased', 'post'])
  })

  test('does not fire increase/reduce callbacks when health is unchanged', () => {
    const entity = new Entity(createGame(), 10)
    entity.onHealthReduced = jest.fn()
    entity.onHealthIncreased = jest.fn()
    entity.onPostSetHealth = jest.fn()

    entity.setHealth(10)

    expect(entity.onHealthReduced).not.toHaveBeenCalled()
    expect(entity.onHealthIncreased).not.toHaveBeenCalled()
    expect(entity.onPostSetHealth).not.toHaveBeenCalled()
  })
})

describe('death', () => {
  test('isDestroyed is true once health reaches zero', () => {
    const entity = new Entity(createGame(), 10)
    entity.damage(10)
    expect(entity.isDestroyed()).toEqual(true)
  })

  test('onHealthZero fires exactly once when health first reaches zero', () => {
    const entity = new Entity(createGame(), 10)
    entity.onHealthZero = jest.fn()

    entity.damage(10)
    expect(entity.onHealthZero).toHaveBeenCalledTimes(1)

    // further damage/attempts to reduce health past zero should not refire it
    entity.reduceHealth(1)
    expect(entity.onHealthZero).toHaveBeenCalledTimes(1)
  })

  test('dispatches a game-scoped entity:destroyed event exactly once', () => {
    const game = createGame()
    const entity = new Entity(game, 10)

    const listener = jest.fn()
    EventBus.addEventListener(game.getId() + ':entity:destroyed', listener)

    try {
      entity.damage(10)
      entity.reduceHealth(1)

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0].target).toBe(entity)
    } finally {
      EventBus.removeEventListener(game.getId() + ':entity:destroyed', listener)
    }
  })
})

describe('reduceHealth', () => {
  test('defaults to reducing by 1', () => {
    const entity = new Entity(createGame(), 10)
    entity.reduceHealth()
    expect(entity.getHealth()).toEqual(9)
  })
})
