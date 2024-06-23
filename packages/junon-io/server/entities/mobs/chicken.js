const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Chicken extends LandMob {
  constructor(game, data) {
    super(game, data)
    //egg spawner start
    this.eggSpawnInterval = setInterval(() => {
      if (this.health <= 0) return
      this.sector.spawnItem({ type: "egg", count: 1, x: this.getCol() * Constants.tileSize + Constants.tileSize / 2, y: this.getRow() * Constants.tileSize + Constants.tileSize / 2 })
    }, 300000)
  }

  getType() {
    return Protocol.definition().MobType.Chicken
  }
  getConstantsTable() {
    return "Mobs.Chicken"
  }

}

module.exports = Chicken
