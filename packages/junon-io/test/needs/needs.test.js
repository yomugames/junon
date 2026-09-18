/*
  Needs - hunger/oxygen/stamina/happiness survival stats mixed into Player.
  Covers clamping to [0, max], delta-based change callbacks (only firing when
  the value actually moves), the hunger-hits-zero starvation hook, and the
  sleep-state toggle.
*/

const Needs = require('../../common/interfaces/needs')

class Unit {
  constructor(maxes = {}) {
    this.maxes = Object.assign({ hunger: 100, oxygen: 15, stamina: 100, happiness: 100 }, maxes)
    this.initNeeds()
  }
}

// Needs.prototype.getMax* are just Constants-backed defaults, so our
// per-instance overrides must be applied after the mixin to take precedence.
Object.assign(Unit.prototype, Needs.prototype, {
  getMaxHunger() { return this.maxes.hunger },
  getMaxOxygen() { return this.maxes.oxygen },
  getMaxStamina() { return this.maxes.stamina },
  getMaxHappiness() { return this.maxes.happiness }
})

describe('initNeeds', () => {
  test('starts every stat at its max', () => {
    const unit = new Unit({ hunger: 50, oxygen: 15, stamina: 80, happiness: 90 })
    expect(unit.hunger).toEqual(50)
    expect(unit.oxygen).toEqual(15)
    expect(unit.stamina).toEqual(80)
    expect(unit.happiness).toEqual(90)
  })
})

describe('setHunger', () => {
  test('clamps to [0, max]', () => {
    const unit = new Unit({ hunger: 100 })
    unit.setHunger(999)
    expect(unit.hunger).toEqual(100)

    unit.setHunger(-5)
    expect(unit.hunger).toEqual(0)
  })

  test('fires onHungerChanged with the delta only when the value actually moves', () => {
    const unit = new Unit({ hunger: 100 })
    unit.onHungerChanged = jest.fn()

    unit.setHunger(100) // unchanged
    expect(unit.onHungerChanged).not.toHaveBeenCalled()

    unit.setHunger(70)
    expect(unit.onHungerChanged).toHaveBeenCalledWith(-30)
  })

  test('fires onHungerZero exactly when hunger reaches 0', () => {
    const unit = new Unit({ hunger: 100 })
    unit.onHungerZero = jest.fn()

    unit.setHunger(10)
    expect(unit.onHungerZero).not.toHaveBeenCalled()

    unit.setHunger(0)
    expect(unit.onHungerZero).toHaveBeenCalledTimes(1)
  })
})

describe('setOxygen', () => {
  test('clamps to [0, max] and reports the delta', () => {
    const unit = new Unit({ oxygen: 15 })
    unit.onOxygenChanged = jest.fn()

    unit.setOxygen(-10)
    expect(unit.oxygen).toEqual(0)
    expect(unit.onOxygenChanged).toHaveBeenCalledWith(-15)

    unit.onOxygenChanged.mockClear()
    unit.setOxygen(999)
    expect(unit.oxygen).toEqual(15)
    expect(unit.onOxygenChanged).toHaveBeenCalledWith(15)
  })
})

describe('setStamina', () => {
  test('clamps to [0, max] and reports the delta', () => {
    const unit = new Unit({ stamina: 100 })
    unit.onStaminaChanged = jest.fn()

    unit.setStamina(150)
    expect(unit.stamina).toEqual(100)
    expect(unit.onStaminaChanged).not.toHaveBeenCalled() // already at max, no delta

    unit.setStamina(40)
    expect(unit.onStaminaChanged).toHaveBeenCalledWith(-60)
  })
})

describe('setHappiness', () => {
  test('clamps to [0, max] and only notifies (no delta arg) when changed', () => {
    const unit = new Unit({ happiness: 100 })
    unit.onHappinessChanged = jest.fn()

    unit.setHappiness(100)
    expect(unit.onHappinessChanged).not.toHaveBeenCalled()

    unit.setHappiness(-20)
    expect(unit.happiness).toEqual(0)
    expect(unit.onHappinessChanged).toHaveBeenCalledTimes(1)
  })
})

describe('sleep state', () => {
  test('sleep()/wakeup() toggle isSleeping and notify only on an actual change', () => {
    const unit = new Unit()
    unit.onSleepStateChanged = jest.fn()

    unit.sleep()
    expect(unit.isSleeping).toEqual(true)
    expect(unit.onSleepStateChanged).toHaveBeenCalledTimes(1)

    unit.sleep() // already asleep
    expect(unit.onSleepStateChanged).toHaveBeenCalledTimes(1)

    unit.wakeup()
    expect(unit.isSleeping).toEqual(false)
    expect(unit.onSleepStateChanged).toHaveBeenCalledTimes(2)
  })
})
