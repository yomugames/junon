const Helper = require('../../common/helper')
const Equipments = require('./equipments/index')

const craftExcludeList = new Set(["Bayonet", "Kukri", "StunBaton", "MolotovCocktail", "Grenade", "PoisonGrenade", "BloodBottle", "CombatArmor", "WaterBottle", "NameTag", "SpaceSuit", "BlueEnergySword", "GreenEnergySword", "RedEnergySword", "PlasmaGun", "PlasmaBlade", "SquidStaff", "Radio", "AssassinsKnife", "SantaHat", "HazmatSuit", "PoliceSuit", "PrisonerSuit", "LabCoat", "CultistSuit", "ImperialSpecialForcesArmor", "Dynamite", "ShockGrenade", "FusionSword", "Poison", "PowerDrill"])
const nonBuildables = new Set(["BaseStarter", "EscapePod", "Core", "Refinery", "EmergencyButton", "TimerBomb", "ResearchTable", "Fridge", "Beaker", "Shower", "UndergroundVent"])
const chemistryRecipes = new Set(["FirstAidKit", "Antidote", "BloodPack", "Stimpack", "Drug", "Explosives", "Poison"])
const stoveRecipes = new Set(["Gelatin", "Steak", "Bread", "HotDog", "VeganPizza", "SlimyMeatPizza", "LectersDinner", "Omelette", "Fries", "PotatoSoup", "SlimeBroth", "MisoSoup", "Starberries", "Pumpkin", "Fish", "Nigiri", "PumpkinPie", "MushroomSoup"])
const breweryRecipes = new Set(["Beer", "Vodka", "EnergyDrink", "AlienJuice", "Nihonshu"])
const ammoPrinterRecipes = new Set(["BulletAmmo", "ShotgunShell", "RifleAmmo", "Missile", "PlasmaCell", "Grenade", "PoisonGrenade", "Dynamite", "MolotovCocktail", "TimerBomb"])
const forgeRecipes = new Set(["PowerDrill", "SquidStaff", "PlasmaGun", "PlasmaBlade", "BlueEnergySword", "GreenEnergySword", "RedEnergySword", "FusionSword", "SpaceSuit", "CombatArmor", "ImperialSpecialForcesArmor", "HazmatSuit", "PrisonerSuit", "PoliceSuit", "LabCoat", "CultistSuit"])
const furnaceRecipes = new Set(["CopperBar", "IronBar", "Glass", "CircuitBoard", "Bottle"])

function typeName(type) {
  return Helper.getTypeNameById(type)
}

function isExcluded(type) {
  return craftExcludeList.has(typeName(type))
}

module.exports = {
  isRegularCraftable(type) {
    const name = typeName(type)
    return Boolean(name) && !craftExcludeList.has(name) && !nonBuildables.has(name) && !forgeRecipes.has(name) && !chemistryRecipes.has(name) && !stoveRecipes.has(name) && !breweryRecipes.has(name) && !ammoPrinterRecipes.has(name) && !furnaceRecipes.has(name)
  },

  isWorkshopCraftable(type) {
    return Boolean(Equipments.forType(type)) && !isExcluded(type)
  },

  isChemistryCraftable(type) {
    return chemistryRecipes.has(typeName(type))
  },

  isStoveCraftable(type) {
    return stoveRecipes.has(typeName(type))
  },

  isBreweryCraftable(type) {
    return breweryRecipes.has(typeName(type))
  },

  isAmmoPrinterCraftable(type) {
    return ammoPrinterRecipes.has(typeName(type))
  },

  isForgeCraftable(type) {
    return forgeRecipes.has(typeName(type))
  },

  isFurnaceCraftable(type) {
    return furnaceRecipes.has(typeName(type))
  }
}