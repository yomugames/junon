const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseFloor = require("./platforms/base_floor")
const Projectiles = require("./../projectiles/index")

class WebTrap extends BaseFloor {

  onConstructionFinished() {
    super.onConstructionFinished()

    this.cooldown = 0
  }

  getConstantsTable() {
    return "Buildings.WebTrap"
  }

  getType() {
    return Protocol.definition().BuildingType.WebTrap
  }

  trigger() {
    if (!this.isReady()) return

    let targets = this.findTargets()
    if (targets.length > 0) {
      this.immobilizeTargets(targets)
      this.setCooldown()
    }
  }

  immobilizeTargets(entities) {
    entities.forEach((entity) => {
      entity.addWeb()

      if(entity.getType() == Protocol.definition().MobType.Sapper) {
        entity.remove() //sappers die to webs
      }
    })
  }

  findTargets() {
    return this.getAttackables().map((tree) => {
      return tree.search(this.getBoundingBox())
    }).flat().filter((entity) => {
      return !this.isFriendlyUnit(entity)
    })
  }

  getAttackables() {
    return [this.sector.playerTree, this.sector.mobTree]
  }

  executeTurn() {
    this.cooldown -= 1

    if (this.cooldown <= 0) {
      this.removeWeb()
      this.container.removeProcessor(this)
      this.cooldown = 0
    }
  }

  setCooldown() {
    this.cooldown = this.getCooldownTicks()
    this.container.addProcessor(this)
  }

  getCooldownTicks() {
    let seconds = Math.floor(this.getStats(this.level).reload / 1000)
    return seconds * Constants.physicsTimeStep
  }

  isReady() {
    return this.cooldown === 0
  }

}

module.exports = WebTrap