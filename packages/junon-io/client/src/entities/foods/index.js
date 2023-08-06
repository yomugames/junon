const Helper = require("./../../../../common/helper")

const Foods = {}

Foods.Raw = {}
Foods.Raw.Gel = require("./gel")
Foods.Raw.Egg = require("./egg")
Foods.Raw.AlienMeat = require("./alien_meat")
Foods.Raw.HumanMeat = require("./human_meat")
Foods.Raw.AnimalMeat = require("./animal_meat")
Foods.Raw.Wheat = require("./wheat")

Foods.Cooked = {}
Foods.Cooked.Potato = require("./potato")
Foods.Cooked.Gelatin = require("./gelatin")
Foods.Cooked.Steak = require("./steak")
Foods.Cooked.Bread = require("./bread")
Foods.Cooked.HotDog = require("./hot_dog")
Foods.Cooked.VeganPizza = require("./vegan_pizza")
Foods.Cooked.SlimyMeatPizza = require("./slimy_meat_pizza")
Foods.Cooked.LectersDinner = require("./lecters_dinner")
Foods.Cooked.Omelette = require("./omelette")
Foods.Cooked.Fries = require("./fries")
Foods.Cooked.PotatoSoup = require("./potato_soup")
Foods.Cooked.SlimeBroth = require("./slime_broth")
Foods.Cooked.MisoSoup = require("./miso_soup")
Foods.Cooked.Starberries = require("./starberries")

Foods.Drugs = {}
Foods.Drugs.FirstAidKit = require("./first_aid_kit")
Foods.Drugs.Antidote = require("./antidote")
Foods.Drugs.BloodPack = require("./blood_pack")
Foods.Drugs.Stimpack = require("./stimpack")


Foods.forType = (type) => {
  let klass
  const klassName = Helper.getTypeNameById(type) 

  // find which namesapce
  for (let group in Foods) {
    klass = Foods[group][klassName]
    if (klass) break
  }

  return klass
}


Foods.getCookables = () => {
  return Object.values(Foods.Cooked).filter((klass) => {
    return klass.getConstantsTable() !== "Foods.Potato"
  })
}

Foods.getDrugs = () => {
  return Object.values(Foods.Drugs)
}


module.exports = Foods
