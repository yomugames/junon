const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseFloor = require("./platforms/base_floor")
const Projectiles = require("./../projectiles/index")

class SpikeTrap extends BaseFloor {

  onConstructionFinished() {
    super.onConstructionFinished()

    this.cooldown = 0
  }

  getConstantsTable() {
    return "Buildings.SpikeTrap"
  }

  getType() {
    return Protocol.definition().BuildingType.SpikeTrap
  }

  trigger() {
    if (!this.isReady()) return

    let targets = this.findTargets()
    if (targets.length > 0) {
      this.damageTargets(targets)
      this.spawnProjectile()
      this.setCooldown()
    }
  }

  damageTargets(entities) {
    entities.forEach((entity) => {
      entity.damage(this.getDamage(), this)
    })
  }

  findTargets() {
    return this.getAttackables().map((tree) => {
      return tree.search(this.getBoundingBox())
    }).flat().filter((entity) => {
      return !this.isFriendlyUnit(entity)
    })
  }

  spawnProjectile() {
    const projectile = Projectiles.Spike.build({
      weapon:        this,
      source:      { x: this.getX(), y: this.getY() },
      destination: { x: this.getX(), y: this.getY() }
    })
  }

  getAttackables() {
    return [this.sector.playerTree, this.sector.mobTree]
  }

  executeTurn() {
    this.cooldown -= 1

    if (this.cooldown <= 0) {
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

module.exports = SpikeTrap

