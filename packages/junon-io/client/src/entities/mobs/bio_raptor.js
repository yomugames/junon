const BaseMob = require('./base_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class BioRaptor extends BaseMob {

  getSpritePath() {
    return "bio_raptor.png"
  }

  animateEquipment() {
    let targetPosition = this.getMeleeTarget()
    this.attackTween = this.getMeleeChargeTween(targetPosition)
    this.attackTween.start()
  }

  shouldShowInteractTooltip() {
    return this.owner
  }

  onPreRemove(cb) {
    let tween = this.getFadeOutTween()
    tween.onComplete(() => {
      cb()
    })
    tween.start()
  }

  getFadeOutTween() {
    let alpha = { alpha: 1 }
    let tween = new TWEEN.Tween(alpha)
        .to({ alpha: 0 }, 2000)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          this.sprite.alpha = alpha.alpha
        })

    return tween
  }

  getConstantsTable() {
    return "Mobs.BioRaptor"
  }

  getType() {
    return Protocol.definition().MobType.BioRaptor
  }
  
  animateExplosion() {
    const smokeCount = 4
    for (var i = 0; i < smokeCount; i++) {
      ClientHelper.addSmoke(this.getX(), this.getY())
    }
  }

  // on client, we want bioraptor to circle to be smaller
  // so unitmap would only register one tile per bioraptor if centered on tile
  // then we'll be able to select bioraptor apart from cryotube
  getWidth() {
    return Constants.tileSize
  }

  getHeight() {
    return Constants.tileSize
  }

}

module.exports = BioRaptor
