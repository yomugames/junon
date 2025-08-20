const LandMob = require('./land_mob')
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")
const ClientHelper = require("../../util/client_helper")


class Guest extends LandMob {
    animateEquipment() {
        let targetPosition = this.getMeleeTarget()
        this.attackTween = this.getMeleeChargeTween(targetPosition)
        this.attackTween.start()
    }
   
    getSpritePath() {
        return "guest.png"
    }

    getType() {
        return Protocol.definition().MobType.Guest
    }

    getConstantsTable() {
        return "Mobs.Guest"
    }

}

module.exports = Guest
