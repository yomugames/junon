const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class AssassinsKnife extends MeleeEquipment {
  getType() {
    return Protocol.definition().BuildingType.AssassinsKnife
  }

  getConstantsTable() {
    return "Equipments.AssassinsKnife"
  }

  getMeleeTargetOptions() {
    let options = super.getMeleeTargetOptions()

    options["anchorCenter"] = true

    return options
  }

  useOnTarget(user, target) {
    if (!target) return false

    return super.useOnTarget(user, target)
  }

  onMeleeAttackFailure(user) {
    if (user.isPlayer()) {
      user.showError("No player targets available")
    }
  }

  getDamage() {
    if (this.game.isMiniGame()) {
      return 100
    } else {
      return 10
    }
  }

  getMeleeTargetOptions() {
    let options = super.getMeleeTargetOptions()
    options.attackables = this.getAttackables()
    return options
  }

  getAttackables() {
    return [this.sector.playerTree]
  }

}

module.exports = AssassinsKnife
