const DrugThermal = require("../common/drug_thermal")

describe("Drug thermal reactions", () => {
  const materials = ["RedMushroom", "BlueMushroom", "RedMushroom"]

  test("is deterministic and independent of material order", () => {
    expect(DrugThermal.getReactionProfile("world-a", materials)).toEqual(
      DrugThermal.getReactionProfile("world-a", ["RedMushroom", "RedMushroom", "BlueMushroom"])
    )
  })

  test("uses the required reaction window geometry", () => {
    let profile = DrugThermal.getReactionProfile("world-a", materials)
    expect(profile.reactionStartTemperature).toBeGreaterThanOrEqual(25)
    expect(profile.reactionStartTemperature).toBeLessThanOrEqual(165)
    expect(profile.reactionEndTemperature - profile.reactionStartTemperature).toBe(30)
    expect(profile.peakTemperature - profile.reactionStartTemperature).toBe(15)
  })

  test("can produce different windows for different worlds", () => {
    let profiles = ["world-a", "world-b", "world-c"].map((world) => {
      return DrugThermal.getReactionProfile(world, materials).reactionStartTemperature
    })
    expect(new Set(profiles).size).toBeGreaterThan(1)
  })

  test("scales from 50 percent to 100 percent without compounding", () => {
    let profile = { reactionStartTemperature: 50, peakTemperature: 65, reactionEndTemperature: 80 }
    let effect = { effect: "Max Health", value: 50 }
    expect(DrugThermal.getEffectiveEffect(effect, 20, profile).value).toBe(25)
    expect(DrugThermal.getEffectiveEffect(effect, 55, profile).value).toBe(33)
    expect(DrugThermal.getEffectiveEffect(effect, 65, profile).value).toBe(50)
    expect(DrugThermal.getEffectiveEffect(effect, 80, profile).value).toBe(50)
    expect(effect.value).toBe(50)
  })

  test("fails only above the reaction end", () => {
    let profile = { reactionStartTemperature: 50, peakTemperature: 65, reactionEndTemperature: 80 }
    expect(DrugThermal.isFailedTemperature(profile, 80)).toBe(false)
    expect(DrugThermal.isFailedTemperature(profile, 80.01)).toBe(true)
  })

  test("recalculates from the original base value", () => {
    let profile = { reactionStartTemperature: 50, peakTemperature: 65, reactionEndTemperature: 80 }
    let heated = DrugThermal.getEffectiveEffect({ effect: "Max Health", value: 33, baseValue: 50 }, 20, profile)
    expect(heated.value).toBe(25)
    expect(heated.baseValue).toBe(50)
  })
})
