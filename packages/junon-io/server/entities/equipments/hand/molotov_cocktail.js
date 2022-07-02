const HandEquipment = require("./hand_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")
const Projectiles = require("./../../projectiles/index")


class MolotovCocktail extends HandEquipment {
  getType() {
    return Protocol.definition().BuildingType.MolotovCocktail
  }

  getConstantsTable() {
    return "Equipments.MolotovCocktail"
  }

  useOnTarget(player, targetEntity) {
    return this.setOnFire(targetEntity)
  }

  use(user, targetEntity, options = {}) {
    let distanceFromUser = 0
    let sourcePoint = user.game.pointFromDistance(user.getX(), user.getY(), distanceFromUser, user.getRadAngle())
    let destination = { x: options.targetX, y: options.targetY }
    // if distance exceeds limit
    let rangeLimit = this.getRange()
    let targetDistance = user.game.distance(sourcePoint[0], sourcePoint[1], destination.x, destination.y)
    if (targetDistance > rangeLimit) {
      destination = user.getShootTarget(this)
    }

    const projectile = new Projectiles.MolotovCocktail({
      weapon:        this,
      source:      { x: sourcePoint[0],         y: sourcePoint[1] },
      destination: destination
    })

    return super.use(user, targetEntity, options)
  }

  isConsumable() {
    return true
  }


  setOnFire(entity) {
    if (this.isDepleted()) {
      let owner = this.getOwner()
      if (owner.isPlayer()) {
        owner.showError("Needs Fuel")
      }

      return
    }

    if (!entity) return  true
    if (!entity.isFlamable()) return true

    entity.addFire()
    entity.fireIgnitedBy = this.getOwner()

    return true
  }

  getAdditionalAttackables() {
    return [this.getOwner().sector.unitTree]
  }

  getTargets(player, meleeRange) {
    const xp = meleeRange * Math.cos(player.getRadAngle())
    const yp = meleeRange * Math.sin(player.getRadAngle())

    const relativeBox = player.getRelativeBox()
    relativeBox.pos.x += xp
    relativeBox.pos.y += yp

    let hits = player.sector.platformMap.hitTestTile(relativeBox)
    return hits.filter((hit) => {
      return hit.entity // must be present
    }).map((hit) => { return hit.entity })
  }


}

module.exports = MolotovCocktail
