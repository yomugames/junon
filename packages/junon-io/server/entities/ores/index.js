const Helper = require('../../../common/helper')
const BaseOre = require("./base_ore")
const Constants = require('../../../common/constants.json')

const Ores = {}
Ores.IceOre = require("./ice_ore")
Ores.SteelOre = require("./steel_ore")
Ores.IronOre = require("./iron_ore")
Ores.CopperOre = require("./copper_ore")
Ores.NitroPowder = require("./nitro_powder")
Ores.Sand = require("./sand")
Ores.Gold = require("./gold")
Ores.Wood = require("./wood")
Ores.Cloth = require("./cloth")
Ores.PlantFiber = require("./plant_fiber")
Ores.Poison = require("./poison")
Ores.Web = require("./web")
Ores.CoffeeBean = require("./coffee_been")
Ores.SulfurOre = require("./sulfur_ore")
Ores.Explosives = require("./explosives")
Ores.Meteorite = require("./meteorite")
Ores.SquidLordHeart = require("./squid_lord_heart")

Ores.forType = (type) => {
  const klassName = Helper.getTypeNameById(type)
  return Ores[klassName]
}

for (let name in Constants.Ores) {
  if (!Ores[name]) {
    let data = Constants.Ores[name]
    if (!data.abstract) {
      Ores[name] = Helper.createDynamicKlass("Ores", BaseOre, name)
    }
  }
}


module.exports = Ores
