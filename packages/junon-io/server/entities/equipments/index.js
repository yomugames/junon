const Helper = require('../../../common/helper')
const Constants = require('../../../common/constants')
const BaseEquipment = require("./base_equipment")
const MeleeEquipment = require("./hand/melee_equipment")

const Equipments = {}
Equipments.SurvivalTool = require("./hand/survival_tool")
Equipments.Pistol = require("./hand/pistol")
Equipments.Shotgun = require("./hand/shotgun")
Equipments.LeadPipe = require("./hand/lead_pipe")
Equipments.PlasmaBlade = require("./hand/plasma_blade")
Equipments.FireExtinguisher = require("./hand/fire_extinguisher")
Equipments.Syringe = require("./hand/syringe")
Equipments.FlameThrower = require("./hand/flame_thrower")
Equipments.SprayGun = require("./hand/spray_gun")
Equipments.Mop = require("./hand/mop")
Equipments.Bottle = require("./hand/bottle")
Equipments.BloodBottle = require("./hand/blood_bottle")
Equipments.WaterBottle = require("./hand/water_bottle")
Equipments.Lighter = require("./hand/lighter")
Equipments.Drill = require("./hand/drill")
Equipments.Katana = require("./hand/katana")
Equipments.MolotovCocktail = require("./hand/molotov_cocktail")
Equipments.Grenade = require("./hand/grenade")
Equipments.PoisonGrenade = require("./hand/poison_grenade")
Equipments.AssaultRifle = require("./hand/assault_rifle")
Equipments.NameTag = require("./hand/name_tag")
Equipments.BlueEnergySword = require("./hand/blue_energy_sword")
Equipments.GreenEnergySword = require("./hand/green_energy_sword")
Equipments.RedEnergySword = require("./hand/red_energy_sword")
Equipments.Disinfectant = require("./hand/disinfectant")
Equipments.Wrench = require("./hand/wrench")
Equipments.Radio = require("./hand/radio")
Equipments.AssassinsKnife = require("./hand/assassins_knife")
Equipments.PocketTrader = require("./hand/pocket_trader")
Equipments.PlasmaGun = require("./hand/plasma_gun")
Equipments.SquidStaff = require("./hand/squid_staff")
Equipments.RocketLauncher = require("./hand/rocket_launcher")
Equipments.Scar17 = require("./hand/scar_17")
Equipments.Bowl = require("./hand/bowl")
Equipments.Deconstructor = require("./hand/deconstructor")
Equipments.Dynamite = require("./hand/dynamite")

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
