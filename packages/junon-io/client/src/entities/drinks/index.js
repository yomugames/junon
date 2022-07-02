const Helper = require("./../../../../common/helper")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

const Drinks = {}
Drinks.Drinkable = {}

const BaseDrink = require("./base_drink")
Drinks.Drinkable.Beer = require("./beer")
Drinks.Drinkable.Vodka = require("./vodka")
Drinks.Drinkable.EnergyDrink = require("./energy_drink")
Drinks.Drinkable.AlienJuice = require("./alien_juice")


Drinks.forType = (type) => {
  let klass
  const klassName = Helper.getTypeNameById(type) 

  // find which namesapce
  for (let group in Drinks) {
    klass = Drinks[group][klassName]
    if (klass) break
  }

  return klass
}

// dynamically create klasses
for (let name in Constants.Drinks) {
  if (!Drinks.Drinkable[name]) {
    let data = Constants.Drinks[name]
    if (!data.abstract) {
      Drinks.Drinkable[name] = Helper.createDynamicKlass("Drinks", BaseDrink, name)
    }
  }
}

Drinks.getDrinkables = () => {
  return Object.values(Drinks.Drinkable)
}


module.exports = Drinks
