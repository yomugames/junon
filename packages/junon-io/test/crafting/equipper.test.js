/*
  Equipper - shared equipment-slot bookkeeping mixed into Player/mobs. Most of
  this mixin is PIXI sprite rendering (hands/body/tween animation) which needs
  a real renderer to exercise meaningfully; this suite scopes to the plain
  state it manages regardless of rendering: which item occupies the hand/armor
  role, and bulk removal.
*/

// Protocol.definition() normally requires an async load of the compiled
// .proto schema (see common/util/protocol.js); stub it so the equipment-role
// keys used by Equipper are available synchronously in this unit test.
jest.mock('../../common/util/protocol', () => ({
  definition: () => ({ EquipmentRole: { Armor: 'armor', Hand: 'hand' } })
}))

const Equipper = require('../../common/interfaces/equipper')

class Unit {
  constructor() {
    this.initEquipper()
  }
}

Object.assign(Unit.prototype, Equipper.prototype)

describe('initEquipper', () => {
  test('starts with no equipment in any role', () => {
    const unit = new Unit()
    expect(unit.getArmorEquipment()).toBeUndefined()
    expect(unit.getHandEquipment()).toBeUndefined()
  })
})

describe('armor equipment', () => {
  test('setArmorEquipment / getArmorEquipment / getArmorEquip round-trip', () => {
    const unit = new Unit()
    const armor = { id: 'plate-armor' }

    unit.setArmorEquipment(armor)

    expect(unit.getArmorEquipment()).toBe(armor)
    expect(unit.getArmorEquip()).toBe(armor) // alias
  })

  test('setting a new armor replaces the previous one', () => {
    const unit = new Unit()
    unit.setArmorEquipment({ id: 'leather' })
    unit.setArmorEquipment({ id: 'plate' })

    expect(unit.getArmorEquipment().id).toEqual('plate')
  })
})

describe('hand equipment', () => {
  test('setHandEquipment / getHandEquipment round-trip', () => {
    const unit = new Unit()
    const weapon = { id: 'sword' }

    unit.setHandEquipment(weapon)

    expect(unit.getHandEquipment()).toBe(weapon)
  })

  test('armor and hand equipment are independent slots', () => {
    const unit = new Unit()
    const armor = { id: 'plate' }
    const weapon = { id: 'sword' }

    unit.setArmorEquipment(armor)
    unit.setHandEquipment(weapon)

    expect(unit.getArmorEquipment()).toBe(armor)
    expect(unit.getHandEquipment()).toBe(weapon)
  })
})

describe('removeEquipments', () => {
  test('calls remove() on every equipped item and clears the equipment map', () => {
    const unit = new Unit()
    const armor = { id: 'plate', remove: jest.fn() }
    const weapon = { id: 'sword', remove: jest.fn() }

    unit.setArmorEquipment(armor)
    unit.setHandEquipment(weapon)

    unit.removeEquipments()

    expect(armor.remove).toHaveBeenCalledTimes(1)
    expect(weapon.remove).toHaveBeenCalledTimes(1)
    expect(unit.getArmorEquipment()).toBeUndefined()
    expect(unit.getHandEquipment()).toBeUndefined()
  })

  test('is a no-op when nothing is equipped', () => {
    const unit = new Unit()
    expect(() => unit.removeEquipments()).not.toThrow()
  })
})
