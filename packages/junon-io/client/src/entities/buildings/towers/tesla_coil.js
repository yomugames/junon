const BaseTower = require("./base_tower")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class TeslaCoil extends BaseTower {

  onBuildingConstructed() {
    super.onBuildingConstructed()

    this.tween = this.getRotatingTween()
  }

  onPowerChanged() {
    super.onPowerChanged()

    if (this.isPowered) {
      if (!this.tween) {
        this.tween = this.getRotatingTween()
      }
      this.tween.start()
    } else {
      if (this.tween) {
        this.tween.stop()
        this.tween = null
      }
    }
  }

  getRotatingTween() {
    let rotation = { rotation: 0 }

    const fadeOutTween = new TWEEN.Tween(rotation)
        .to({ rotation: 360 * PIXI.DEG_TO_RAD }, 3000)
        .onUpdate(() => {
          this.barrelSprite.rotation = rotation.rotation
        })
        .repeat(Infinity)

    return fadeOutTween
  }

  cleanupTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
  }

  remove() {
    super.remove()

    this.cleanupTween()
  }

  getBaseSpritePath() {
    return 'tesla_coil_base.png'
  }

  getBarrelSpritePath() {
    return 'tesla_coil_ring.png'
  }

  getSpritePath() {
    return 'tesla_coil.png'
  }

  getConstantsTable() {
    return "Buildings.TeslaCoil"
  }

  getType() {
    return Protocol.definition().BuildingType.TeslaCoil
  }

}

module.exports = TeslaCoil
