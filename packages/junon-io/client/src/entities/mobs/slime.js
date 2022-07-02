const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")


class Slime extends LandMob {
  constructor(game, data) {
    super(game, data)

    // this.characterSprite.tint = 0x319ef7 // 0x2e482e // green
    
    this.characterSprite.rotation = Math.PI

    this.registerAnimationTween(this.getAnimationTween()).start()
  }

  animateEquipment() {
    let targetPosition = this.getMeleeTarget()
    this.attackTween = this.getMeleeChargeTween(targetPosition)
    this.attackTween.start()
  }

  animateWalkOnPlatform() {
    
  }

  setAngle(angle) {
    this.angle = angle
    // on client, we want Slime to have same orientation even if direction angle changed
    // so dont change sprite rotation. only the data
  }

  getAnimationTween() {
    let delta = { delta: 0 }
    let origSize = this.characterSprite.width

    const tween = new TWEEN.Tween(delta)
        .to({ delta: 6 }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          this.characterSprite.width = origSize + delta.delta
          this.characterSprite.height = origSize - delta.delta
          this.characterSprite.position.y = delta.delta/2
        })
        .repeat(Infinity)
        .yoyo(true)

    return tween
  }

  getWidth() {
    return 32
  }

  getHeight() {
    return 32
  }

  getSpritePath() {
    return "blue_slime.png"
  }

  getType() {
    return Protocol.definition().MobType.Slime
  }

  getConstantsTable() {
    return "Mobs.Slime"
  }

  shouldCreateDeadBody() {
    return false
  }

}

module.exports = Slime
