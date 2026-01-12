const HandEquipment = require("./hand_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class Deconstructor extends HandEquipment {
    use(user, targetEntity) {
        super.use(user, targetEntity)
    
        let sourcePoint = user.game.pointFromDistance(user.getX(), user.getY(), 48, user.getRadAngle())
    
        const projectile = Projectiles.BlueLaser.build({
          weapon:        this,
          source:      { x: sourcePoint[0],         y: sourcePoint[1] },
          destination: user.getShootTarget(this)
        })
    
        return true
      }
    

    getConstantsTable() {
        return "Equipments.Deconstructor"
    }

    getType() {
        return Protocol.definition().BuildingType.Deconstructor
    }
}

module.exports = Deconstructor