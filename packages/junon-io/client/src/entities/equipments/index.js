const Helper = require("./../../../../common/helper")
const BaseEquipment = require("./base_equipment")
const MeleeEquipment = require("./hand/melee_equipment")
const Constants = require("./../../../../common/constants.json")

const Equipments = {}
Equipments.LeadPipe = require("./hand/lead_pipe")
Equipments.Mop = require("./hand/mop")
Equipments.SurvivalTool = require("./hand/survival_tool")
Equipments.Drill = require("./hand/drill")
Equipments.Katana = require("./hand/katana")
Equipments.PlasmaBlade = require("./hand/plasma_blade")
Equipments.PlasmaGun = require("./hand/plasma_gun")
Equipments.SquidStaff = require("./hand/squid_staff")
Equipments.Bowl = require("./hand/bowl")
Equipments.Bottle = require("./hand/bottle")
Equipments.DrugBottle = require("./hand/drug_bottle")
Equipments.Syringe = require("./hand/syringe")
Equipments.BloodBottle = require("./hand/blood_bottle")
Equipments.WaterBottle = require("./hand/water_bottle")
Equipments.FireExtinguisher = require("./hand/fire_extinguisher")
Equipments.Disinfectant = require("./hand/disinfectant")
Equipments.Lighter = require("./hand/lighter")
Equipments.Wrench = require("./hand/wrench")
Equipments.PocketTrader = require("./hand/pocket_trader")
Equipments.Pistol = require("./hand/pistol")
Equipments.Shotgun = require("./hand/shotgun")
Equipments.AssaultRifle = require("./hand/assault_rifle")
Equipments.Scar17 = require("./hand/scar_17")
Equipments.Ak47 = require("./hand/ak47")
Equipments.BoltActionRifle = require("./hand/bolt_action_rifle")
Equipments.HeavyRifle = require("./hand/heavy_rifle")
Equipments.RocketLauncher = require("./hand/rocket_launcher")
Equipments.Minigun = require("./hand/minigun")
Equipments.Uzi = require("./hand/uzi")
Equipments.GrenadeLauncher = require("./hand/grenade_launcher")
Equipments.FlameThrower = require("./hand/flame_thrower")
Equipments.BlueEnergySword = require("./hand/blue_energy_sword")
Equipments.GreenEnergySword = require("./hand/green_energy_sword")
Equipments.RedEnergySword = require("./hand/red_energy_sword")
Equipments.MolotovCocktail = require("./hand/molotov_cocktail")
Equipments.Grenade = require("./hand/grenade")
Equipments.PoisonGrenade = require("./hand/poison_grenade")
Equipments.NameTag = require("./hand/name_tag")
Equipments.Radio = require("./hand/radio")
Equipments.AssassinsKnife = require("./hand/assassins_knife")
Equipments.Deconstructor = require('./hand/deconstructor')
Equipments.Dynamite = require('./hand/dynamite')
Equipments.ShockGrenade = require('./hand/shock_grenade')
Equipments.Bayonet = require("./hand/bayonet")
Equipments.Kukri = require("./hand/kukri")
Equipments.FusionSword = require("./hand/fusion_sword")
Equipments.MiasmaGun = require("./hand/miasma_gun")
Equipments.PowerDrill = require("./hand/power_drill")
Equipments.SpaceSuit = require("./armor/space_suit")
Equipments.CombatArmor = require("./armor/combat_armor")
Equipments.SantaHat = require("./armor/santa_hat")
Equipments.HazmatSuit = require("./armor/hazmat_suit")
Equipments.PrisonerSuit = require("./armor/prisoner_suit")
Equipments.PoliceSuit = require("./armor/police_suit")
Equipments.LabCoat = require("./armor/lab_coat")
Equipments.CultistSuit = require("./armor/cultist_suit")
Equipments.ImperialSpecialForcesArmor = require("./armor/imperial_special_forces_armor")

Equipments.forType = (type) => {
  const klassName = Helper.getTypeNameById(type)
  return Equipments[klassName]
}

const craftExcludeList = ["Bayonet", "Kukri", "StunBaton", "MolotovCocktail", "Grenade", "PoisonGrenade", "BloodBottle", "CombatArmor", "WaterBottle", "NameTag", "SpaceSuit", "BlueEnergySword", "GreenEnergySword", "RedEnergySword", "PlasmaGun", "PlasmaBlade", "SquidStaff", "Radio", "AssassinsKnife", "SantaHat", "HazmatSuit", "PoliceSuit", "PrisonerSuit", "LabCoat", "CultistSuit", "ImperialSpecialForcesArmor", "Dynamite", "ShockGrenade", "FusionSword", "Poison", "PowerDrill"]

Equipments.getList = () => {
  return Object.values(Equipments).filter((klass) => {
    return typeof klass.getType === "function" && craftExcludeList.indexOf(klass.getConstantName()) === -1
  })
}

// dynamically create klasses
for (let name in Constants.Equipments) {
  if (!Equipments[name]) {
    let data = Constants.Equipments[name]
    if (!data.abstract) {
      if (data.parent.match("MeleeEquipment")) {
        Equipments[name] = Helper.createDynamicKlass("Equipments", MeleeEquipment, name) 
      } else {
        Equipments[name] = Helper.createDynamicKlass("Equipments", BaseEquipment, name) 
      }
    }
  }
}



module.exports = Equipments
