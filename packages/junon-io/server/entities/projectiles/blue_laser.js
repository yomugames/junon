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

    canDamage(entity) {
        if(entity.isWall()) return true //will pass wall and hit other building if any
        if (!entity) return false
    
        if (this.owner && this.owner.isPlayer() && !this.owner.canDamage(entity)) {
          return false
        }
        if(entity.isPlayer()) return false
        if (this.isFriendlyUnit(entity)) return false
        if (entity.isOwnedBy(this.owner)) return false
        if (entity.hasCategory("ghost")) return false
        if(entity.isMob()) return false
    
        const isWeaponDestroyed = this.owner && this.owner.isSector()
        const isSelfHit = entity === this.owner || (isWeaponDestroyed && entity.isPlayer())
        //const isUnownedBuilding = entity.isBuilding() && !entity.hasOwner() this was for domination? (copying most the code from base_projectile)
        const isDistribution = entity.isDistribution()
    
        if (isSelfHit || isDistribution || !entity.setHealth) return false
        if (entity.hasCategory("trap")) return true
        if (entity.hasCategory("platform") && this.shouldHitFloor) return true
        if (!entity.isCollidable(this)) return false
        if (entity.isBuilding() && entity.getConstants().isPassable) return false
    
        return true
      }
    
}

module.exports = BlueLaser                                                                                                                                                      