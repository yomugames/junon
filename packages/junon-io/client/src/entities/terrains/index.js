const Helper = require("./../../../../common/helper")

const Terrains = {}

Terrains.Sky = require("./grounds/sky")
Terrains.Water = require("./undergrounds/water")
Terrains.Lava = require("./undergrounds/lava")
Terrains.Oil = require("./undergrounds/oil")

Terrains.Rock = require("./grounds/rock")
// Terrains.Ice = require("./grounds/ice")
// Terrains.LavaRock = require("./grounds/lava_rock")

// Terrains.Vine = require("./foregrounds/vine")
Terrains.Asteroid = require("./foregrounds/asteroid")
Terrains.CopperAsteroid = require("./foregrounds/copper_asteroid")
// Terrains.SteelAsteroid = require("./foregrounds/steel_asteroid")
// Terrains.IceAsteroid = require("./foregrounds/ice_asteroid")
// Terrains.IronAsteroid = require("./foregrounds/iron_asteroid")
Terrains.MeteoriteAsteroid = require("./foregrounds/meteorite_asteroid")

Terrains.forType = (type) => {
  const klassName = Helper.getTerrainNameById(type) 
  return Terrains[klassName]
}

Terrains.getList = () => {
  return Object.values(Terrains).filter((klass) => {
    return typeof klass.getType === "function"
  })
}

module.exports = Terrains