const Helper = require('../../../common/helper')
const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseDrink = require("./base_drink")

const Drinks = {}

Drinks.Beer = require("./beer")
Drinks.Vodka = require("./vodka")
Drinks.EnergyDrink = require("./energy_drink")
Drinks.AlienJuice = require("./alien_juice")
Drinks.Nihonshu = require("./nihonshu")

Drinks.forType = (type) => {
  const klassName = Helper.getTypeNameById(type)
  return Drinks[klassName]
}

// dynamically create klasses
for (let name in Constants.Drinks) {
  if (!Drinks[name]) {
    let data = Constants.Drinks[name]
    if (!data.abstract) {
      Drinks[name] = Helper.createDynamicKlass("Drinks", BaseDrink, name)
    }
  }
}

module.exports = Drinks

