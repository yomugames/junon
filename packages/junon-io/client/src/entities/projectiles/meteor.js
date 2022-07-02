const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Helper = require("./../../../../common/helper")
const Trail = require("../particles/trail")

class Meteor extends BaseProjectile {

  onProjectileConstructed() {
    // this.game.playSound("shotgun")
  }

  interpolate(lastFrameTime) {
    // create 3 trails of varying color - yellow to red. positioned in top/middle/bottom
    let offset = 4
    let attrs = [
      { y: this.getY() - offset, color: 0xfabd77, radius: 10 + Math.floor(Math.random() * 10) },
      { y: this.getY()         , color: 0xfad677, radius: 10 + Math.floor(Math.random() * 10) },
      { y: this.getY() + offset, color: 0xfac977, radius: 10 + Math.floor(Math.random() * 10) }
    ]

    // e97e2e, change from yellow to ed7236, and get smaller as well

    attrs.forEach((attr) => {
      Trail.create({
        x: this.getX(), 
        y: attr.y, 
        angle: 0, 
        color: 0xc75637, 
        destinationColor: 0xed7236,
        radius: attr.radius, 
        offset: 0,
        isShrinking: true
      })
    })

    super.interpolate(lastFrameTime)
  }

  performRemove() {
    super.performRemove()
    this.game.screenShake()
  }

  getSpritePath() {
    return 'meteor_rock.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.Meteor
  }

  getConstantsTable() {
    return "Projectiles.Meteor"
  }

}

module.exports = Meteor
