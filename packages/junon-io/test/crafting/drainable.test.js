/*
  Drainable - shared fuel/liquid/gas usage tracker used by tanks, generators,
  and distribution pipes. Unlike the other common/interfaces mixins, Drainable
  is instantiated directly (`new Drainable(usage, capacity, entity, resource)`)
  rather than mixed onto a host prototype.
*/

const Drainable = require('../../common/interfaces/drainable')

describe('construction', () => {
  test('initializes usage and capacity from the constructor args', () => {
    const drainable = new Drainable(5, 10, {}, 'Fuel')
    expect(drainable.getUsage()).toEqual(5)
    expect(drainable.getUsageCapacity()).toEqual(10)
    expect(drainable.getContent()).toBeNull()
  })

  test('getUsageCapacity throws if no capacity was ever set', () => {
    const drainable = new Drainable(0, 10, {}, 'Fuel')
    drainable.capacity = null
    expect(() => drainable.getUsageCapacity()).toThrow()
  })
})

describe('isFull / isEmpty / isDepleted', () => {
  test('isFull is true once usage reaches capacity', () => {
    const drainable = new Drainable(10, 10, {}, 'Fuel')
    expect(drainable.isFull()).toEqual(true)
  })

  test('isEmpty/isDepleted are true at or below zero usage', () => {
    const drainable = new Drainable(0, 10, {}, 'Fuel')
    expect(drainable.isEmpty()).toEqual(true)
    expect(drainable.isDepleted()).toEqual(true)
  })
})

describe('setUsage', () => {
  test('clamps to [0, capacity]', () => {
    const drainable = new Drainable(0, 10, {}, 'Fuel')

    drainable.setUsage(999)
    expect(drainable.getUsage()).toEqual(10)

    drainable.setUsage(-5)
    expect(drainable.getUsage()).toEqual(0)
  })

  test('ignores NaN', () => {
    const drainable = new Drainable(5, 10, {}, 'Fuel')
    drainable.setUsage(NaN)
    expect(drainable.getUsage()).toEqual(5)
  })

  test('clears content once usage hits zero (by default)', () => {
    const drainable = new Drainable(5, 10, {}, 'Fuel')
    drainable.setContent('Oil')
    drainable.setUsage(0)
    expect(drainable.getContent()).toBeNull()
  })

  test('does not clear content on zero when shouldSetEmptyContentOnZeroUsage is overridden', () => {
    const drainable = new Drainable(5, 10, {}, 'Fuel')
    drainable.shouldSetEmptyContentOnZeroUsage = () => false
    drainable.setContent('Oil')
    drainable.setUsage(0)
    expect(drainable.getContent()).toEqual('Oil')
  })

  test('fires onUsageChanged via the registered listener only when usage actually changes', () => {
    const drainable = new Drainable(5, 10, {}, 'Fuel')
    const listener = { onUsageChanged: jest.fn() }
    drainable.setUsageChangedListener(listener)

    drainable.setUsage(5) // unchanged
    expect(listener.onUsageChanged).not.toHaveBeenCalled()

    drainable.setUsage(8)
    expect(listener.onUsageChanged).toHaveBeenCalledWith('Fuel', 8)
  })
})

describe('drain', () => {
  test('reduces usage by amount and reports how much was actually drained', () => {
    const drainable = new Drainable(10, 10, {}, 'Fuel')
    const drained = drainable.drain(4)
    expect(drained).toEqual(4)
    expect(drainable.getUsage()).toEqual(6)
  })

  test('caps the drained amount to whatever is left', () => {
    const drainable = new Drainable(3, 10, {}, 'Fuel')
    const drained = drainable.drain(10)
    expect(drained).toEqual(3)
    expect(drainable.getUsage()).toEqual(0)
  })
})

describe('fill', () => {
  test('sets content and increases usage, returning zero excess when under capacity', () => {
    const drainable = new Drainable(0, 10, {}, 'Fuel')
    const excess = drainable.fill('Oil', 4)

    expect(excess).toEqual(0)
    expect(drainable.getUsage()).toEqual(4)
    expect(drainable.getContent()).toEqual('Oil')
  })

  test('reports the overflow amount when filling past capacity', () => {
    const drainable = new Drainable(8, 10, {}, 'Fuel')
    const excess = drainable.fill('Oil', 5)

    expect(excess).toEqual(3) // 8 + 5 - 10
    expect(drainable.getUsage()).toEqual(10)
  })
})

describe('drainDelayed / fillDelayed', () => {
  test('drainDelayed mutates usage directly without clamping or firing onUsageChanged synchronously', () => {
    const drainable = new Drainable(10, 10, {}, 'Fuel')
    const listener = { onUsageChanged: jest.fn() }
    drainable.setUsageChangedListener(listener)

    const drained = drainable.drainDelayed(4)

    expect(drained).toEqual(4)
    expect(drainable.getUsage()).toEqual(6)
    expect(listener.onUsageChanged).not.toHaveBeenCalled()
  })

  test('drainDelayed notifies the drainable-delayed listener', () => {
    const drainable = new Drainable(10, 10, {}, 'Fuel')
    const listener = { onDrainableDelayed: jest.fn() }
    drainable.setDrainableDelayedListener(listener)

    drainable.drainDelayed(4)
    expect(listener.onDrainableDelayed).toHaveBeenCalledTimes(1)
  })

  test('fillDelayed sets content, increases usage, and returns overflow', () => {
    const drainable = new Drainable(8, 10, {}, 'Fuel')
    const excess = drainable.fillDelayed('Oil', 5)

    expect(excess).toEqual(3)
    expect(drainable.getUsage()).toEqual(13) // not clamped, unlike fill()
    expect(drainable.getContent()).toEqual('Oil')
  })
})

describe('setContent', () => {
  test('fires onContentChanged only when the content actually changes', () => {
    const drainable = new Drainable(0, 10, {}, 'Fuel')
    drainable.onContentChanged = jest.fn()

    drainable.setContent('Oil')
    expect(drainable.onContentChanged).toHaveBeenCalledTimes(1)

    drainable.setContent('Oil') // unchanged
    expect(drainable.onContentChanged).toHaveBeenCalledTimes(1)

    drainable.setContent('Water')
    expect(drainable.onContentChanged).toHaveBeenCalledTimes(2)
  })
})
