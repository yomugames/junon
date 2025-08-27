const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class BlueLaser extends CollidableProjectile {

    getType() {
        return Protocol.definition().ProjectileType.BlueLaser
    }

    canDamageWalls() {
        return true //all this does is bypass the wall, not damage it, unsure why. Code looks fine
    }

    getConstantsTable() {
        return "Projectiles.BlueLaser"
    }
    
}

module.exports = BlueLaser                                                                                                                                                      