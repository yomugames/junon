const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class EmergencyButton extends BaseBuilding {

  interact(user) {
    if (!this.game.isMiniGame()) return
    if (this.sector.voteManager.isStarted) return

    if (this.sector.getFlameCount() > 0) {
      return
    }

    if (!this.sector.voteManager.canUseEmergencyMeeting(user)) {
      if (this.sector.voteManager.hasUsedEmergencyMeeting(user)) {
        user.showError("Already used it previously")
      } else {
        let cooldown = this.sector.voteManager.getRemainingCooldown()
        let message = i18n.t(user.locale, "CanUseAgain", { cooldown: cooldown })
        user.showError(message)
      }

      return
    }

    if (!user.sector.eventHandler.isRoundEnding) {
      this.sector.voteManager.triggerEmergencyMeeting(user)
    }
  }

  getConstantsTable() {
    return "Buildings.EmergencyButton"
  }

  getType() {
    return Protocol.definition().BuildingType.EmergencyButton
  }

}

module.exports = EmergencyButton
