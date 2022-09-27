const Helper = require('../../../common/helper')

const Mobs = {}

Mobs.Slime = require("./slime")
Mobs.BioRaptor = require("./bio_raptor")

Mobs.Spider = require("./spider")
Mobs.PoisonSpider = require("./poison_spider")
Mobs.Brood = require("./brood")

Mobs.Messenger = require("./messenger")
Mobs.Guard = require("./guard")
Mobs.Trooper = require("./trooper")
Mobs.Chemist = require("./chemist")
Mobs.Prisoner = require("./prisoner")

Mobs.Pirate = require("./pirate")
Mobs.Mutant = require("./mutant")
Mobs.Trader = require("./trader")
Mobs.SlaveTrader = require("./slave_trader")
Mobs.Cat = require("./cat")
Mobs.Monkey = require("./monkey")
Mobs.Ghost = require("./ghost") // dead players become ghost
Mobs.Chicken = require("./chicken")
Mobs.Human = require("./human")
Mobs.Golem = require("./golem")
Mobs.Mantis = require("./mantis")
Mobs.SquidLord = require("./squid_lord")
Mobs.Firebat = require("./firebat")

// robots
Mobs.CleanBot = require("./robots/clean_bot")

Mobs.NuuSlave = require("./nuu_slave")
Mobs.PixiSlave = require("./pixi_slave")
Mobs.GaramSlave = require("./garam_slave")

Mobs.DummyPlayer = require("./dummy_player")

// flying 
Mobs.Drone = require("./drone")
Mobs.Raven = require("./raven")

Mobs.forType = (type) => {
  const klassName = Helper.getMobNameById(type)
  return Mobs[klassName]
}


module.exports = Mobs