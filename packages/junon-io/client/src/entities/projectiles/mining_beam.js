const BaseBeam = require("./base_beam")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class MiningBeam extends BaseBeam {

  getBaseSpritePath() {
    return 'mining_beam.png'
  }

  getHeadSpritePath() {
    return 'mining_head.png'
  }

  getFlowSpritePath() {
    return 'mining_beam_flow.png'
  }

  getHeadBaseWidth() {
    return 32
  }

  getHeadCoreWidth() {
    return 24
  }

  getRayThickness() {
    return 7
  }

  getSprite() {
    const sprite = super.getSprite()

    this.flowSprite     = new PIXI.Sprite(PIXI.utils.TextureCache[this.getFlowSpritePath()])
    this.flowSprite.width = 15
    this.flowSprite.height = 15
    this.flowSprite.anchor.set(0, 0.5)

    sprite.addChild(this.flowSprite)

    return sprite
  }


  drawBeam() {
    super.drawBeam()
    this.animate()
  }

  animate() {
    if (!this.tween) {
      this.tween = this.getFlowTween()
      this.tween.start()
    }
  }

  getFlowTween() {
    const beamDistance = Math.sqrt((this.destination.x - this.source.x) ** 2 + (this.destination.y - this.source.y) ** 2)

    let distance = { distance: 0 }
    let speed = 1.5
    let duration = beamDistance * speed

    return new TWEEN.Tween(distance)
        .to({ distance: beamDistance }, duration)
        .onUpdate(() => {
          this.flowSprite.position.set(distance.distance, 0)
        })
        .delay( 500 )
        .repeat(Infinity)
  }

  shouldRemoveImmediately() {
    return false
  }

  syncWithServer(data) {
    this.oldPoints = {
      source: { x: this.source.x, y: this.source.y } ,
      destination: { x: this.destination.x, y: this.destination.y }
    }
    this.setData(data)
    this.checkOnPositionChanged()
    this.drawBeam()
  }

  onPositionChanged() {
    this.cleanupTween()
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

  checkOnPositionChanged() {
    if (this.oldPoints.source.x !== this.source.x ||
        this.oldPoints.source.y !== this.source.y ||
        this.oldPoints.destination.x !== this.destination.x ||
        this.oldPoints.destination.y !== this.destination.y) {
      this.onPositionChanged()
    }
  }

  getType() {
    return Protocol.definition().ProjectileType.MiningBeam
  }

  getConstantsTable() {
    return "Projectiles.MiningBeam"
  }

}

module.exports = MiningBeam
