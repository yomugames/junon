const Helper = require('../../../common/helper')
const Constants = require('../../../common/constants.json')
const BaseFloor = require("./platforms/base_floor")
const BaseWall = require("./base_wall")
const BaseSeed = require("./crops/base_seed")

const Buildings = {}

Buildings.Lattice = require("./platforms/lattice")
Buildings.Floor = require("./platforms/floor")

Buildings.SteelFloor = require("./platforms/steel_floor")
Buildings.Soil = require("./platforms/soil")
Buildings.WoodFloor = require("./platforms/wood_floor")
Buildings.CarpetFloor = require("./platforms/carpet_floor")
Buildings.TiledFloor = require("./platforms/tiled_floor")
Buildings.PurpleFloor = require("./platforms/purple_floor")
Buildings.PlatedFloor = require("./platforms/plated_floor")
Buildings.StripePlatedFloor = require("./platforms/stripe_plated_floor")
Buildings.GreenFloor = require("./platforms/green_floor")
Buildings.Hangar = require("./platforms/hangar")
Buildings.RailTrack = require("./rail_track")
Buildings.RailStop = require("./rail_stop")

Buildings.SpikeTrap = require("./spike_trap")
Buildings.WebTrap = require("./web_trap")

Buildings.SealedDoor = require("./sealed_door")
Buildings.Airlock = require("./airlock")
Buildings.ManualAirlock = require("./manual_airlock")
Buildings.SolarPanel = require("./solar_panel")
Buildings.OxygenTank = require("./oxygen_tank")
Buildings.SmallOxygenTank = require("./small_oxygen_tank")

Buildings.Core = require("./core")
Buildings.BaseStarter = require("./base_starter")
Buildings.Wall = require("./wall")
Buildings.Beacon = require("./beacon")
Buildings.Cage = require("./cage")
Buildings.Fence = require("./fence")
Buildings.Reactor = require("./reactor")
Buildings.Thruster = require("./thruster")
Buildings.ShieldGenerator = require("./shield_generator")
Buildings.Bridge = require("./bridge")
Buildings.MineralStorage = require("./mineral_storage")
Buildings.Conveyor = require("./conveyor")
Buildings.Wire = require("./wire")
Buildings.Fridge = require("./fridge")
Buildings.Bed = require("./bed")
Buildings.WaterPump = require("./water_pump")
Buildings.Ventilator = require("./ventilator")
Buildings.Stove = require("./stove")
Buildings.SteelCrate = require("./steel_crate")
Buildings.Terminal = require("./terminal")
Buildings.Beaker = require("./beaker")
Buildings.ShipyardConstructor = require("./shipyard_constructor")
Buildings.HangarCornerBlock = require("./hangar_corner_block")
Buildings.HangarController = require("./hangar_controller")
Buildings.AmmoPrinter = require("./ammo_printer")
Buildings.Table = require("./table")
Buildings.WoodTable = require("./wood_table")
Buildings.LargeTable = require("./large_table")
Buildings.TradingTable = require("./trading_table")
Buildings.SlaversTable = require("./slavers_table")
Buildings.ButcherTable = require("./butcher_table")
Buildings.Chair = require("./chair")
Buildings.WoodChair = require("./wood_chair")
Buildings.Shower = require("./shower")
Buildings.SuitStation = require("./suit_station")
Buildings.ResearchTable = require("./research_table")
Buildings.Television = require("./television")
Buildings.Pot = require("./pot")
Buildings.AirAlarm = require("./air_alarm")
Buildings.GasPipe = require("./gas_pipe")
Buildings.LiquidPipe = require("./liquid_pipe")
Buildings.LiquidTank = require("./liquid_tank")
Buildings.Lamp = require("./lamp")
Buildings.WallLamp = require("./wall_lamp")
Buildings.Furnace = require("./furnace")
Buildings.Refinery = require("./refinery")
Buildings.Workshop = require("./workshop")
Buildings.OxygenGenerator = require("./oxygen_generator")
Buildings.CryoTube = require("./cryo_tube")
Buildings.EscapePod = require("./escape_pod")
Buildings.MiningDrill = require("./mining_drill")
Buildings.ChemistryStation = require("./chemistry_station")
Buildings.Brewery = require("./brewery")
Buildings.Forge = require("./forge")
Buildings.OilRefinery = require("./oil_refinery")
Buildings.FuelTank = require("./fuel_tank")
Buildings.PowerGenerator = require("./power_generator")
Buildings.FuelPipe = require("./fuel_pipe")
Buildings.Sign = require("./sign")
Buildings.FoodVendingMachine = require("./food_vending_machine")
Buildings.DrinksVendingMachine = require("./drinks_vending_machine")
Buildings.Atm = require("./atm")
Buildings.FarmController = require("./farm_controller")
Buildings.DeepDrill = require("./deep_drill")
Buildings.EmergencyButton = require("./emergency_button")
Buildings.SecurityCamera = require("./security_camera")
Buildings.SecurityMonitor = require("./security_monitor")
Buildings.TimerBomb = require("./timer_bomb")
Buildings.PowerSwitch = require("./power_switch")
Buildings.UndergroundVent = require("./underground_vent")
Buildings.RedPresent = require("./red_present")
Buildings.BluePresent = require("./blue_present")
Buildings.GreenPresent = require("./green_present")
Buildings.ChristmasTree = require("./christmas_tree")
Buildings.Tree = require("./tree")

Buildings.MineralMiner = require("./towers/mineral_miner")
Buildings.Turret = require("./towers/turret")
Buildings.Cannon = require("./towers/cannon")
Buildings.VoidRay = require("./towers/void_ray")
Buildings.IonCannon = require("./towers/ion_cannon")

Buildings.MiniTurret = require("./towers/mini_turret")
Buildings.FlamethrowerTurret = require("./towers/flamethrower_turret")
Buildings.MissileTurret = require("./towers/missile_turret")
Buildings.TeslaCoil = require("./towers/tesla_coil")
Buildings.BomberTurret = require("./towers/bomber_turret")

Buildings.WheatSeed = require("./crops/wheat_seed")
Buildings.FiberSeed = require("./crops/fiber_seed")
Buildings.PotatoSeed = require("./crops/potato_seed")
Buildings.CoffeeSeed = require("./crops/coffee_seed")

Buildings.Fighter = require("./units/fighter")

let disabledTypes = [0,1,3,4,5,7,8,10,11,12,13,14,15,21]
let disabledTypeSet = new Set()
disabledTypes.forEach((id) => { disabledTypeSet.add(id) })

Buildings.forType = (type) => {
  if (disabledTypeSet.has(type)) return null

  const klassName = Helper.getTypeNameById(type)
  return Buildings[klassName]
}

Buildings.getPassableTileTypes = () => {
  if (!Buildings.passableTileTypes) {
    let passable = Object.values(Buildings).filter((klass) => {
      return typeof klass.getType === "function"
    }).filter((klass) => {
      return klass.prototype.isPassableByPathFinder()
    })

    Buildings.passableTileTypes = passable.map((klass) => { return klass.getType() })
  }

  return Buildings.passableTileTypes
}

Buildings.getPlatformTypes = () => {
  if (!Buildings.platformTypes) {
    let platformKlasses = Object.values(Buildings).filter((klass) => {
      return typeof klass.getType === "function"
    }).filter((klass) => {
      return klass.prototype.hasCategory("platform")
    })

    Buildings.platformTypes = platformKlasses.map((klass) => { return klass.getType() })
  }
  
  return Buildings.platformTypes
}

// dynamically create klasses
for (let name in Constants.Walls) {
  if (!Buildings[name]) {
    let data = Constants.Walls[name]
    if (!data.abstract) {
      Buildings[name] = Helper.createDynamicKlass("Walls", BaseWall, name)
    }
  }
}

// dynamically create klasses
for (let name in Constants.Floors) {
  if (!Buildings[name]) {
    let data = Constants.Floors[name]
    if (!data.abstract) {
      Buildings[name] = Helper.createDynamicKlass("Floors", BaseFloor, name)
    }
  }
}

// dynamically create klasses
for (let name in Constants.Crops) {
  if (!Buildings[name]) {
    let data = Constants.Crops[name]
    if (!data.abstract) {
      Buildings[name] = Helper.createDynamicKlass("Crops", BaseSeed, name)
    }
  }
}


module.exports = Buildings
