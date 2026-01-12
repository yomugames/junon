const BaseTower = require("./base_tower")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const Projectiles = require('./../../projectiles/index')

class TeslaCoil extends BaseTower {

  onBuildingPlaced() {
    super.onBuildingPlaced()
  }

  getType() {
    return Protocol.definition().BuildingType.TeslaCoil
  }

  getConstantsTable() {
    return "Buildings.TeslaCoil"
  }

  performAttack(attackTarget) {
    this.lastAttackTimestamp = this.game.timestamp

    this.shootProjectile(attackTarget)
  }

  hasAmmo() {
    return true
  }

  getChainTarget(sourceEntity, alreadyDamagedEntities) {
    let targets = this.getAttackables().map((tree) => {
      return tree.search(sourceEntity.getNeighborBoundingBox(Constants.tileSize * 8))
    }).flat().filter((entity) => {
      return this.canDamage(entity) && !alreadyDamagedEntities[entity.id]
    })

    return targets[0]
  }

  shootProjectile(attackTarget, options = {}) {
    if (!options.ignoreAmmo) {
      if (!this.hasAmmo() && !this.hasInfiniteAmmo()) return
    }

    let chainCount = 3

    let lines = []
    let target = attackTarget
    let alreadyDamagedEntities = {}

    let projectile

    if (this.canDamage(attackTarget)) {
      projectile = Projectiles.TeslaLaser.build({
        weapon: this,
        source:      { x: this.getX(),     y: this.getY() },
        destination: { x: attackTarget.getX(), y: attackTarget.getY() }
      })
      if(attackTarget.getType() == Protocol.definition().MobType.Sapper) {
        attackTarget.setHealth(attackTarget.health + 5)
      } else {
        attackTarget.damage(this.getDamage(), projectile)
        alreadyDamagedEntities[target.getId()] = true
      }
    }

    for (var i = 0; i <= chainCount; i++) {
      let nextTarget = this.getChainTarget(target, alreadyDamagedEntities)
      if (nextTarget) {
        projectile = Projectiles.TeslaLaser.build({
          weapon: this,
          source:      { x: target.getX(),     y: target.getY() },
          destination: { x: nextTarget.getX(), y: nextTarget.getY() }
        })

        target = nextTarget
        alreadyDamagedEntities[nextTarget.getId()] = true
        if(nextTarget.getType() == Protocol.definition().MobType.Sapper) {
          nextTarget.setHealth(nextTarget.health + 5)
          return
        }
        nextTarget.damage(this.getDamage(), projectile)
      }
    }
  }

  onTurnExecuted() {
  }

  canStore(index, item) {
    if (!item) return true // allow swap with blank space slot

    return item.isBulletAmmo()
  }


}

module.exports = TeslaCoil

