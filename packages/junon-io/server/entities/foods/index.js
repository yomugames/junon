const Helper = require('../../../common/helper')

const Foods = {}
Foods.AlienMeat = require("./alien_meat")
Foods.HumanMeat = require("./human_meat")
Foods.AnimalMeat = require("./animal_meat")
Foods.Wheat = require("./wheat")
Foods.Potato = require("./potato")
Foods.Steak = require("./steak")
Foods.Gel = require("./gel")
Foods.Gelatin = require("./gelatin")
Foods.HotDog = require("./hot_dog")
Foods.Bread = require("./bread")
Foods.VeganPizza = require("./vegan_pizza")
Foods.SlimyMeatPizza = require("./slimy_meat_pizza")
Foods.LectersDinner = require("./lecters_dinner")
Foods.Antidote = require("./antidote")
Foods.FirstAidKit = require("./first_aid_kit")
Foods.BloodPack = require("./blood_pack")
Foods.Stimpack = require("./stimpack")
Foods.Egg = require("./egg")
Foods.Omelette = require("./omelette")
Foods.Fries = require("./fries")
Foods.MisoSoup = require("./miso_soup")
Foods.PotatoSoup = require("./potato_soup")
Foods.SlimeBroth = require("./slime_broth")
Foods.Starberries = require("./starberries")
Foods.Pumpkin = require("./pumpkin")
Foods.Rice = require("./rice")
Foods.Fish = require("./fish")
Foods.Nigiri = require("./nigiri")
Foods.PumpkinPie = require("./pumpkin_pie")
Foods.Cabbage = require("./cabbage")
Foods.RedMushroom = require("./red_mushroom")
Foods.BrownMushroom = require("./brown_mushroom")
Foods.WhiteMushroom = require("./white_mushroom")
Foods.OrangeMushroom = require("./orange_mushroom")
Foods.YellowMushroom = require("./yellow_mushroom")
Foods.GreenMushroom = require("./green_mushroom")
Foods.BlueMushroom = require("./blue_mushroom")
Foods.PurpleMushroom = require("./purple_mushroom")
Foods.PinkMushroom = require("./pink_mushroom")
Foods.BlackMushroom = require("./black_mushroom")
Foods.MushroomSoup = require("./mushroom_soup")
Foods.Drug = require("./drug")


Foods.forType = (type) => {
  const klassName = Helper.getTypeNameById(type)
  return Foods[klassName]
}


module.exports = Foods
