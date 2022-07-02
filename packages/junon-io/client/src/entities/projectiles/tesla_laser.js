const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Helper = require("./../../../../common/helper")

class TeslaLaser extends BaseProjectile {

  onProjectileConstructed() {
    this.laserSprite = this.sprite
    let distance = this.game.distance(this.data.x, this.data.y, this.data.endX, this.data.endY)
    this.laserSprite.width = distance
    this.laserSprite.height = 10
    let angle = this.game.angle(this.data.x, this.data.y, this.data.endX, this.data.endY)
    this.laserSprite.rotation = angle
    this.laserSprite.anchor.set(0)

    this.game.playSound("tesla")
  }

//   getSprite() {
//     let container = new PIXI.Container()
//     container.name = 'TeslaLaser'
//     let sprite = super.getSprite()
//     this.laserSprite = sprite
//     container.addChild(sprite)
//     container.pivot.set()
// 
//     let distance = this.game.distance(this.data.x, this.data.y, this.data.endX, this.data.endY)
//     this.laserSprite.width = distance
//     this.laserSprite.height = 10
//     let angle = this.game.angle(this.data.x, this.data.y, this.data.endX, this.data.endY)
//     this.laserSprite.rotation = angle
//     this.laserSprite.anchor.set(0)
// 
//     let laser_head = new PIXI.Sprite(PIXI.utils.TextureCache["tesla_laser_head.png"])
//     let laser_tail = new PIXI.Sprite(PIXI.utils.TextureCache["tesla_laser_head.png"])
//     laser_head.position.x = 0
//     laser_tail.position.x = distance
// 
//     // container.addChild(laser_head)
//     // container.addChild(laser_tail)
//     return container
//   }

  getSpritePath() {
    return 'tesla_laser.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.TeslaLaser
  }

  getConstantsTable() {
    return "Projectiles.TeslaLaser"
  }

}

module.exports = TeslaLaser
