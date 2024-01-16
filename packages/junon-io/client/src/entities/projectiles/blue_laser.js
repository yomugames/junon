const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class BlueLaser extends BaseProjectile {
    onProjectileConstructed() {
        this.game.playSound("deep_laser")
    }

    getSpritePath() {
        return 'blue_laser.png'
    }

    getType() {
        return Protocol.definition().ProjectileType.BlueLaser
    }

    getConstantsTable() {
        return "Projectiles.BlueLaser"
    }
}

module.exports = BlueLaser