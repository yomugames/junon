const LandMob = require('./land_mob')
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")
const ClientHelper = require("../../util/client_helper")
const Equipper = require('../../../../common/interfaces/equipper')


class Visitor extends LandMob {
    constructor(game, data) {
        super(game, data)

        this.initEquipper();
    }
    animateEquipment() {
        let targetPosition = this.getMeleeTarget()
        this.attackTween = this.getMeleeChargeTween(targetPosition)
        this.attackTween.start()
    }
   
    getBaseRotationOffset() {
        return 0 * PIXI.DEG_TO_RAD
    }

    getSpritePath() {
        return "visitor.png"
    }

    getType() {
        return Protocol.definition().MobType.Visitor
    }

    getConstantsTable() {
        return "Mobs.Visitor"
    }

}

Object.assign(Visitor.prototype, Equipper.prototype, {
    getDefaultSpriteColor() {
        return 0x3c2317;
    },
    getBodySpriteTint() {
        return 0xffffff
    },
    getEquipperBodySpritePath() {
        return "visitor.png"
    },
    getBodyWidth() {
        return 49
    },
    getBodyHeight() {
        return 54
    },
    getBodyPositionX() {
        return 0
    }
})
module.exports = Visitor
