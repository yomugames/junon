const Helper = require("./../../../../common/helper")
const BaseFloor = require('./platforms/base_floor')
const Constants = require("./../../../../common/constants.json")
const BaseWall = require("./base_wall")
const BaseSeed = require("./crops/base_seed")

const Buildings = {}
Buildings.Production = {}
Buildings.Structures = {}
Buildings.Atmospherics = {}
Buildings.Furnitures = {}
Buildings.Floors = {}
Buildings.Power = {}

Buildings.Ships = {}
Buildings.NonBuidables = {}

// production
Buildings.Production.Furnace = require("./furnace")
Buildings.Production.ButcherTable = require("./butcher_table")
Buildings.Production.Stove = require("./stove")
Buildings.Production.Forge = require("./forge")
// Buildings.Production.Workshop = require("./workshop")
Buildings.Production.Brewery = require("./brewery")
Buildings.Production.ChemistryStation = require("./chemistry_station")
Buildings.Production.MiningDrill = require("./mining_drill")
Buildings.Production.DeepDrill = require("./deep_drill")
Buildings.Production.AmmoPrinter = require("./ammo_printer")

// structures

Buildings.Structures.SpikeTrap = require("./spike_trap")
Buildings.Structures.WebTrap = require("./web_trap")
Buildings.Structures.ManualAirlock = require("./manual_airlock")
Buildings.Structures.Airlock = require("./airlock")
Buildings.Structures.SealedDoor = require("./sealed_door")
Buildings.Structures.Fence = require("./fence")
Buildings.Structures.Lamp = require("./lamp")
Buildings.Structures.WallLamp = require("./wall_lamp")
Buildings.Structures.SteelCrate = require("./steel_crate")
Buildings.Structures.FarmController = require("./farm_controller")
Buildings.Structures.FoodVendingMachine = require("./food_vending_machine")
Buildings.Structures.DrinksVendingMachine = require("./drinks_vending_machine")
Buildings.Structures.Atm = require("./atm")
Buildings.Structures.WaterPump = require("./water_pump")
Buildings.Structures.LiquidPipe = require("./liquid_pipe")
Buildings.Structures.LiquidTank = require("./liquid_tank")
Buildings.Structures.CryoTube = require("./cryo_tube")
Buildings.Structures.SuitStation = require("./suit_station")
Buildings.Structures.Beacon = require("./beacon")
Buildings.Structures.UndergroundVent = require("./underground_vent")
Buildings.Structures.SecurityCamera = require("./security_camera")
Buildings.Structures.SecurityMonitor = require("./security_monitor")
Buildings.Structures.MiniTurret = require("./towers/mini_turret")
Buildings.Structures.FlamethrowerTurret = require("./towers/flamethrower_turret")
Buildings.Structures.MissileTurret = require("./towers/missile_turret")
Buildings.Structures.TeslaCoil = require("./towers/tesla_coil")
Buildings.Structures.BomberTurret = require("./towers/bomber_turret")
Buildings.Structures.KeypadDoor = require("./keypad_door")
Buildings.Structures.MiasmaGate = require("./miasma_gate.js")

Buildings.Atmospherics.AirAlarm = require("./air_alarm")
Buildings.Atmospherics.Ventilator = require("./ventilator")
Buildings.Atmospherics.OxygenGenerator = require("./oxygen_generator")
Buildings.Atmospherics.OxygenTank = require("./oxygen_tank")
Buildings.Atmospherics.SmallOxygenTank = require("./small_oxygen_tank")
Buildings.Atmospherics.GasPipe = require("./gas_pipe")

// furniture
// Buildings.Furnitures.Fridge = require("./fridge")
// dynamically create klasses
Buildings.Furnitures.Wall = require("./wall")

for (let name in Constants.Walls) {
  if (!Buildings.Furnitures[name]) {
    let data = Constants.Walls[name]
    if (!data.abstract) {
      Buildings.Furnitures[name] = Helper.createDynamicKlass("Walls", BaseWall, name)
    }
  }
}

Buildings.Furnitures.Bed = require("./bed")
Buildings.Furnitures.Sign = require("./sign")

Buildings.Furnitures.Table = require("./table")
Buildings.Furnitures.LargeTable = require("./large_table")
Buildings.Furnitures.WoodTable = require("./wood_table")
Buildings.Furnitures.TradingTable = require("./trading_table")
Buildings.Furnitures.SlaversTable = require("./slavers_table")
Buildings.Furnitures.Chair = require("./chair")
Buildings.Furnitures.WoodChair = require("./wood_chair")
Buildings.Furnitures.Cage = require("./cage")
Buildings.Furnitures.Television = require("./television")
Buildings.Furnitures.Terminal = require("./terminal")
Buildings.Furnitures.Pot = require("./pot")
Buildings.Furnitures.Tree = require("./tree")
Buildings.Furnitures.ChristmasTree = require("./christmas_tree")
Buildings.Furnitures.RedPresent = require("./red_present")
Buildings.Furnitures.BluePresent = require("./blue_present")
Buildings.Furnitures.GreenPresent = require("./green_present")
Buildings.Furnitures.UnbreakableWall = require("./unbreakable_wall")

// platforms
Buildings.Floors.Lattice = require("./platforms/lattice")
Buildings.Floors.Floor = require("./platforms/floor")

Buildings.Floors.Soil = require("./platforms/soil")
Buildings.Floors.WoodFloor = require("./platforms/wood_floor")
Buildings.Floors.SteelFloor = require("./platforms/steel_floor")

// dynamically create klasses
for (let name in Constants.Floors) {
  if (!Buildings.Floors[name]) {
    let data = Constants.Floors[name]
    if (!data.abstract) {
      Buildings.Floors[name] = Helper.createDynamicKlass("Floors", BaseFloor, name)
    }
  }
}

Buildings.Floors.CarpetFloor = require("./platforms/carpet_floor")
Buildings.Floors.TiledFloor = require("./platforms/tiled_floor")
Buildings.Floors.GreenFloor = require("./platforms/green_floor")
Buildings.Floors.PurpleFloor = require("./platforms/purple_floor")
Buildings.Floors.PlatedFloor = require("./platforms/plated_floor")
Buildings.Floors.StripePlatedFloor = require("./platforms/stripe_plated_floor")
Buildings.Floors.RailTrack = require("./rail_track")
Buildings.Floors.RailStop = require("./rail_stop")

// ship
Buildings.Ships.Reactor = require("./reactor")
Buildings.Ships.ShieldGenerator = require("./shield_generator")
Buildings.Ships.Thruster = require("./thruster")
Buildings.Ships.Bridge = require("./bridge")

// non-buildables
Buildings.NonBuidables.BaseStarter = require("./base_starter")
Buildings.NonBuidables.EscapePod = require("./escape_pod")
Buildings.NonBuidables.Core = require("./core")
Buildings.NonBuidables.Refinery = require("./refinery")
Buildings.NonBuidables.EmergencyButton = require("./emergency_button")
Buildings.NonBuidables.TimerBomb = require("./timer_bomb")
Buildings.NonBuidables.ResearchTable = require("./research_table")
Buildings.NonBuidables.Fridge = require("./fridge")
Buildings.NonBuidables.Beaker = require("./beaker")
Buildings.NonBuidables.Shower = require("./shower")

// power
Buildings.Power.Wire = require("./wire")
Buildings.Power.PowerSwitch = require("./power_switch")
Buildings.Power.OilRefinery = require("./oil_refinery")
Buildings.Power.PowerGenerator = require("./power_generator")
Buildings.Power.FuelPipe = require("./fuel_pipe")
Buildings.Power.FuelTank = require("./fuel_tank")
Buildings.Power.SolarPanel = require("./solar_panel")

// towers
Buildings.Towers = {}
Buildings.Towers.MineralMiner = require("./towers/mineral_miner")
Buildings.Towers.Turret = require("./towers/turret")
Buildings.Towers.Cannon = require("./towers/cannon")
Buildings.Towers.VoidRay = require("./towers/void_ray")
Buildings.Towers.IonCannon = require("./towers/ion_cannon")
Buildings.Towers.MiniTurret = require("./towers/mini_turret")
Buildings.Towers.MissileTurret = require("./towers/missile_turret")
Buildings.Towers.BomberTurret = require("./towers/bomber_turret")
Buildings.Towers.Fighter = require("./units/fighter")

// crops
Buildings.Crops = {}
Buildings.Crops.PotatoSeed = require("./crops/potato_seed")
Buildings.Crops.WheatSeed = require("./crops/wheat_seed")
Buildings.Crops.CoffeeSeed = require("./crops/coffee_seed")
// Buildings.Crops.NitroSeed = require("./crops/nitro_seed")
// Buildings.Crops.CottonSeed = require("./crops/cotton_seed")
Buildings.Crops.FiberSeed = require("./crops/fiber_seed")
Buildings.Crops.PumpkinSeed = require("./crops/pumpkin_seed.js")
Buildings.Crops.RiceSeed = require("./crops/rice_seed")
Buildings.Crops.CabbageSeed = require("./crops/cabbage_seed.js")

// dynamically create klasses
for (let name in Constants.Crops) {
  if (!Buildings.Crops[name]) {
    let data = Constants.Crops[name]
    if (!data.abstract) {
      Buildings.Crops[name] = Helper.createDynamicKlass("Crops", BaseSeed, name)
    }
  }
}


Buildings.forType = (type) => {
  let klass
  const klassName = Helper.getTypeNameById(type)

  return Buildings.forTypeByName(klassName)
}

Buildings.forTypeByName = (klassName) => {
  let klass

  // find which namesapce
  for (let group in Buildings) {
    klass = Buildings[group][klassName]
    if (klass) break
  }

  return klass
}

Buildings.getConstructors = () => {
  return [
    Buildings.Structures.Stove,
    Buildings.Structures.Workshop,
    Buildings.Structures.Furnace,
    Buildings.Structures.Refinery,
    Buildings.Structures.AmmoPrinter
  ]
}

Buildings.getList = () => {
  return Object.values(Buildings.Floors).concat(this.getConstructors())
}

Buildings.getExcludeCraftingGroups = () => {
  return ["Ships", "Towers", "Crops", "NonBuidables"]
}

module.exports = Buildings
