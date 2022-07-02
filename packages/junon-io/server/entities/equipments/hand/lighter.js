const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class Lighter extends MeleeEquipment {
  getType() {
    return Protocol.definition().BuildingType.Lighter
  }

  getConstantsTable() {
    return "Equipments.Lighter"
  }

  useOnTarget(player, targetEntity) {
    return this.setOnFire(targetEntity)
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

module.exports = Lighter
