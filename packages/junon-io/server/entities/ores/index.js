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
Ores.RedSpore = require("./red_spore")
Ores.BrownSpore = require("./brown_spore")
Ores.WhiteSpore = require("./white_spore")
Ores.OrangeSpore = require("./orange_spore")
Ores.YellowSpore = require("./yellow_spore")
Ores.GreenSpore = require("./green_spore")
Ores.BlueSpore = require("./blue_spore")
Ores.PurpleSpore = require("./purple_spore")
Ores.PinkSpore = require("./pink_spore")
Ores.BlackSpore = require("./black_spore")

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
