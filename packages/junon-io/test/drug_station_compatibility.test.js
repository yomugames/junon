const DrugStation = require("../server/entities/buildings/drug_station")

const station = Object.create(DrugStation.prototype)

const getEffectValue = (effects, name) => {
  let effect = effects.find((entry) => entry.effect === name)
  return effect ? effect.value : 0
}

describe("DrugStation compatibility", () => {
  test.each([
    [["RedMushroom"]],
    [["RedMushroom", "RedMushroom"]],
    [["RedMushroom", "OrangeMushroom"]],
    [["RedMushroom", "GreenMushroom"]],
    [["OrangeMushroom", "GreenMushroom"]],
    [["RedMushroom", "OrangeMushroom", "GreenMushroom"]]
  ])("calculates a finite effect list for %j", (ingredients) => {
    let effects = station.getCalculatedDrugEffects(ingredients)
    expect(effects.length).toBeGreaterThan(0)
    effects.forEach((effect) => expect(Number.isFinite(effect.value)).toBe(true))
  })

  test("applies diminishing returns to repeated mushrooms", () => {
    let effects = station.getCalculatedDrugEffects(["RedMushroom", "RedMushroom"])
    expect(getEffectValue(effects, "Max Health")).toBe(68)
    expect(getEffectValue(effects, "Max Stamina")).toBe(-54)
  })

  test("calculates compatibility from unique ingredient pairs", () => {
    expect(station.getAverageCompatibility(["RedMushroom"])).toBe(100)
    expect(station.getAverageCompatibility(["RedMushroom", "RedMushroom"])).toBe(100)
    expect(station.getAverageCompatibility(["RedMushroom", "OrangeMushroom"])).toBe(55)
    expect(station.getAverageCompatibility(["RedMushroom", "OrangeMushroom", "GreenMushroom"])).toBeCloseTo(155 / 3)
  })

  test("is independent of ingredient insertion order", () => {
    let effects = station.getCalculatedDrugEffects(["RedMushroom", "OrangeMushroom", "GreenMushroom"])
    let reorderedEffects = station.getCalculatedDrugEffects(["GreenMushroom", "RedMushroom", "OrangeMushroom"])
    expect(reorderedEffects).toEqual(effects)
  })

  test.each([
    [40, 0, 0],
    [39, 1, 0],
    [25, 15, 0],
    [24, 16, 1]
  ])("adds deterministic nausea and poison at %i compatibility", (compatibility, nausea, poison) => {
    let thresholdStation = Object.create(DrugStation.prototype)
    thresholdStation.getAverageCompatibility = () => compatibility
    let effects = thresholdStation.getCalculatedDrugEffects(["RedMushroom"])
    expect(getEffectValue(effects, "Nausea")).toBe(nausea)
    expect(getEffectValue(effects, "Poison")).toBe(poison)
  })

  test("persists every ingredient copy as effect metadata", () => {
    let ingredients = ["RedMushroom", "RedMushroom", "OrangeMushroom"]
    let effects = station.setDrugIngredients([], ingredients)
    expect(station.getDrugIngredients({ instance: { effects: effects } })).toEqual(ingredients)
  })

  test("rounds calculated duration to the nearest integer", () => {
    expect(station.getDrugDuration([{ effect: "Effect Duration", value: 12.5 }])).toBe(68)
  })
})