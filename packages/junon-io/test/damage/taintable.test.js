/*
  Taintable - shared status-effect system (fire, poison, paralyze, dirt, ...)
  mixed into players/mobs/items. Covers effect-level clamping, add/remove
  lifecycle hooks firing exactly on 0<->positive transitions, and the
  fire/dirt effects that have extra rules (flammability gating, no upper cap
  via addEffect).
*/

const Taintable = require('../../common/interfaces/taintable')

class Unit {
  constructor({ flamable = false, timestamp = 0 } = {}) {
    this.sector = { game: { timestamp } }
    this.flamable = flamable
  }

  getConstants() { return { isFlamable: this.flamable } }
}

Object.assign(Unit.prototype, Taintable.prototype)

describe('setEffectLevel', () => {
  test('clamps level to [0, getMaxEffectLevel()]', () => {
    const unit = new Unit()
    unit.setEffectLevel('poison', 999)
    expect(unit.getEffectLevel('poison')).toEqual(unit.getMaxEffectLevel())

    unit.setEffectLevel('poison', -5)
    expect(unit.getEffectLevel('poison')).toEqual(0)
  })

  test('fires onEffectAdded exactly once when an effect goes from 0 to positive', () => {
    const unit = new Unit()
    unit.onEffectAdded = jest.fn()
    unit.onEffectLevelChanged = jest.fn()

    unit.setEffectLevel('paralyze', 1)
    expect(unit.onEffectAdded).toHaveBeenCalledWith('paralyze')
    expect(unit.onEffectAdded).toHaveBeenCalledTimes(1)

    unit.setEffectLevel('paralyze', 2) // still positive, not a fresh add
    expect(unit.onEffectAdded).toHaveBeenCalledTimes(1)
    expect(unit.onEffectLevelChanged).toHaveBeenCalledTimes(2)
  })

  test('fires onEffectRemoved exactly when the level drops back to 0', () => {
    const unit = new Unit()
    unit.setEffectLevel('paralyze', 1)
    unit.onEffectRemoved = jest.fn()

    unit.setEffectLevel('paralyze', 0)
    expect(unit.onEffectRemoved).toHaveBeenCalledWith('paralyze')
  })

  test('does not fire any callback when the clamped level is unchanged', () => {
    const unit = new Unit()
    unit.setEffectLevel('fear', 0)
    unit.onEffectAdded = jest.fn()
    unit.onEffectRemoved = jest.fn()
    unit.onEffectLevelChanged = jest.fn()

    unit.setEffectLevel('fear', -1) // clamps to 0, already 0
    expect(unit.onEffectAdded).not.toHaveBeenCalled()
    expect(unit.onEffectRemoved).not.toHaveBeenCalled()
    expect(unit.onEffectLevelChanged).not.toHaveBeenCalled()
  })

  test('records the created-at timestamp and an explicit duration on a fresh add', () => {
    const unit = new Unit({ timestamp: 555 })
    unit.setEffectLevel('web', 1, 20)

    expect(unit.getEffectCreatedAt('web')).toEqual(555)
    expect(unit.getEffectDuration('web')).toEqual(20)
  })

  test('falls back to the per-effect default duration when none is given', () => {
    const unit = new Unit()
    unit.setEffectLevel('poison', 1)
    expect(unit.getEffectDuration('poison')).toEqual(20)
  })

  test('clears createdAt/duration once the effect is removed', () => {
    const unit = new Unit({ timestamp: 100 })
    unit.setEffectLevel('web', 1, 20)
    unit.setEffectLevel('web', 0)

    expect(unit.getEffectCreatedAt('web')).toBeUndefined()
    // explicit 20 is gone; getEffectDuration now falls back to web's built-in default (2)
    expect(unit.getEffectDuration('web')).toEqual(2)
  })
})

describe('getTotalEffectValue', () => {
  test('sums every active effect level', () => {
    const unit = new Unit()
    unit.setEffectLevel('poison', 2)
    unit.setEffectLevel('fear', 1)
    expect(unit.getTotalEffectValue()).toEqual(3)
  })

  test('is 0 before any effect has ever been set', () => {
    const unit = new Unit()
    expect(unit.getTotalEffectValue()).toEqual(0)
  })
})

describe('clean', () => {
  test('reduces the first found active effect by one level and stops', () => {
    const unit = new Unit()
    unit.setEffectLevel('dirt', 2)
    unit.setEffectLevel('poison', 1)

    unit.clean()

    // whichever key iterates first drops by exactly 1; total drops by exactly 1
    expect(unit.getTotalEffectValue()).toEqual(2)
  })
})

describe('add*/remove* convenience wrappers', () => {
  test('addPoison/removePoision toggle the poison effect', () => {
    const unit = new Unit()
    unit.addPoison()
    expect(unit.getEffectLevel('poison')).toEqual(1)

    unit.removePoision()
    expect(unit.getEffectLevel('poison')).toEqual(0)
  })

  test('addWeb/addParalyze/addFear/addInvisible/addHaste/addDrunk/addMiasma/addSpin/addSmoke/addRage all set level 1', () => {
    const unit = new Unit()
    const pairs = [
      ['addWeb', 'web'], ['addParalyze', 'paralyze'], ['addFear', 'fear'],
      ['addInvisible', 'invisible'], ['addHaste', 'haste'], ['addDrunk', 'drunk'],
      ['addMiasma', 'miasma'], ['addSpin', 'spin'], ['addSmoke', 'smoke'], ['addRage', 'rage']
    ]

    pairs.forEach(([method, effect]) => {
      unit[method]()
      expect(unit.getEffectLevel(effect)).toEqual(1)
    })
  })

  test('isInvisible reflects the invisible effect', () => {
    const unit = new Unit()
    expect(unit.isInvisible()).toBeFalsy()
    unit.addInvisible()
    expect(unit.isInvisible()).toEqual(1)
  })
})

describe('dirt', () => {
  test('addDirt/reduceDirt increment and decrement, setDirt clamps to [0, 4]', () => {
    const unit = new Unit()
    unit.addDirt()
    unit.addDirt()
    expect(unit.getDirtLevel()).toEqual(2)

    unit.reduceDirt()
    expect(unit.getDirtLevel()).toEqual(1)

    unit.setDirt(999)
    expect(unit.getDirtLevel()).toEqual(4)

    unit.removeDirt()
    expect(unit.getDirtLevel()).toEqual(0)
    expect(unit.hasDirt()).toBeFalsy()
  })
})

describe('fire', () => {
  test('addFire is a no-op on a non-flamable entity', () => {
    const unit = new Unit({ flamable: false })
    unit.addFire()
    expect(unit.isOnFire()).toEqual(false)
  })

  test('addFire ignites a flamable entity, incrementing on repeat calls', () => {
    const unit = new Unit({ flamable: true })
    unit.addFire()
    expect(unit.isOnFire()).toEqual(true)
    expect(unit.getEffectLevel('fire')).toEqual(1)

    unit.addFire()
    expect(unit.getEffectLevel('fire')).toEqual(2)
  })

  test('addFire with forceFlamable ignites even a non-flamable entity', () => {
    const unit = new Unit({ flamable: false })
    unit.addFire(undefined, { forceFlamable: true })
    expect(unit.isOnFire()).toEqual(true)
  })

  test('reduceFire/removeFire extinguish it', () => {
    const unit = new Unit({ flamable: true })
    unit.addFire(3)
    unit.reduceFire()
    expect(unit.getEffectLevel('fire')).toEqual(2)

    unit.removeFire()
    expect(unit.isOnFire()).toEqual(false)
  })
})

describe('addEffect dispatcher', () => {
  test('routes to the matching add* method by name', () => {
    const unit = new Unit({ flamable: true })
    unit.addEffect('poison')
    expect(unit.getEffectLevel('poison')).toEqual(1)

    unit.addEffect('fire') // forced flamable internally
    expect(unit.isOnFire()).toEqual(true)
  })
})

describe('removeAllEffects', () => {
  test('zeroes out every effect that was ever set', () => {
    const unit = new Unit()
    unit.setEffectLevel('poison', 2)
    unit.setEffectLevel('fear', 1)

    unit.removeAllEffects()

    expect(unit.getTotalEffectValue()).toEqual(0)
  })

  test('is a no-op when no effects have ever been set', () => {
    const unit = new Unit()
    expect(() => unit.removeAllEffects()).not.toThrow()
  })
})
