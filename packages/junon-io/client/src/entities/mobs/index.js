const Protocol = require("./../../../../common/util/protocol")

const Mobs = {}

Mobs.Ghost = require("./ghost")

Mobs.Slime = require("./slime")
Mobs.Spider = require("./spider")
Mobs.PoisonSpider = require("./poison_spider")
Mobs.Mutant = require("./mutant")
Mobs.Messenger = require("./messenger")
Mobs.Pirate = require("./pirate")
Mobs.Guard = require("./guard")
Mobs.Trooper = require("./trooper")
Mobs.Chemist = require("./chemist")
Mobs.Trader = require("./trader")
Mobs.SlaveTrader = require("./slave_trader")
Mobs.BioRaptor = require("./bio_raptor")
Mobs.Brood = require("./brood")
Mobs.Golem = require("./golem")
Mobs.Mantis = require("./mantis")
Mobs.Prisoner = require("./prisoner")
Mobs.SquidLord = require("./squid_lord")
Mobs.Firebat = require("./firebat")

Mobs.Raven = require("./raven")
Mobs.Drone = require("./drone")
Mobs.Cat = require("./cat")
Mobs.Monkey = require("./monkey")
Mobs.Chicken = require("./chicken")

Mobs.CleanBot = require("./robots/clean_bot")
Mobs.DummyPlayer = require("./dummy_player")
Mobs.Human = require("./human")

Mobs.Slave = require("./slave")
Mobs.NuuSlave = require("./nuu_slave")
Mobs.PixiSlave = require("./pixi_slave")
Mobs.GaramSlave = require("./garam_slave")

Mobs.forType = (type) => {
  let className = ""
  const nameToTypeMap = Protocol.definition().MobType

  for (let name in nameToTypeMap) {
    if (nameToTypeMap[name] === type) {
      className = name
    }
  }

  return Mobs[className]
}


module.exports = Mobs