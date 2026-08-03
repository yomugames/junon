const BaseTower = require("./base_tower")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Revitalizer extends BaseTower {

  onBuildingPlaced() {
    super.onBuildingPlaced()
  }

  getSprite() {
    let sprite = super.getSprite()
    this.fillBarContainer.rotation = -Math.PI/2
    this.fillBarContainer.position.x = 0
    this.fillBarContainer.position.y = 32
    return sprite
  }

  getBuildingSprite() {
    let sprite = super.getBuildingSprite()

    return sprite
  }

  getHealingAreaSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["blue.png"])
    sprite.name = "HealArea"
    sprite.anchor.set(0.5)
    sprite.alpha = 0
    sprite.width = 0
    sprite.height = 0
    return sprite
  }

  getHealingBeamSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["revitalizer_beam.png"])
    sprite.name = "HealBeam"
    sprite.anchor.set(0.5)
    sprite.alpha = 0.5
    sprite.width = 0
    sprite.height = 32
    return sprite
  }

  // seems redundant, but necessary for invalid area to show when building
  onGridPositionChanged() {
    super.onGridPositionChanged()
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
      if (this.healTween && this.healingArea.alpha !== 0) {
        this.playEndTween()
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

  getHealTween() {
    let alpha = { alpha: 0.5 }

    let tween = new TWEEN.Tween(alpha)
        .to({ alpha: 0.2 }, 500)
        .onUpdate(() => {
          this.healingArea.alpha = alpha.alpha
          this.healingBeam.alpha = alpha.alpha * 1.25
          // default to previous dimensions if target sprite can't be found
          if(this.target) {
            this.healingArea.width = this.target.sprite.width
            this.healingArea.height = this.target.sprite.height
          }
          // extra failsafe if multiple revitalizers are healing a single target
          if(!this.sector.entities[this.target.id] || !this.target || this.target.health === this.target.getMaxHealth()) {
            tween.stop()
            this.renderHeal(this.target.getId())
          }
        })
        .yoyo(true)
        .repeat(Infinity)

    return tween
  }

  getHealEndTween() {
    let alpha = this.healingArea.alpha >= 0.2 ? { alpha: this.healingArea.alpha } : { alpha: 0.2 }

    let tween = new TWEEN.Tween(alpha)
        .to({ alpha: 0 }, 500)
        .onUpdate(() => {
          this.healingArea.alpha = alpha.alpha
          this.healingBeam.alpha = alpha.alpha * 1.25
          if(this.target) {
            this.healingArea.width = this.target.sprite.width
            this.healingArea.height = this.target.sprite.height
          }
        })
        .onComplete(() => {
          // this = null
        })

    return tween
  }

  cleanupTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
    if (this.healTween) {
      this.healTween.stop()
      this.healTween = null
    }
    if(this.healingArea) {
      this.sector.spriteLayers.ceilings.removeChild(this.healingArea)
    }
    if(this.healingBeam) {
      this.sector.spriteLayers.ceilings.removeChild(this.healingBeam)
    }
  }  

  renderHeal(targetId, isEmpty) {
    this.target = this.sector.getEntity(targetId)
    if(!this.healingArea) {
      this.healingArea = this.sector.spriteLayers.ceilings.addChild(this.getHealingAreaSprite())
      this.healingBeam = this.sector.spriteLayers.ceilings.addChild(this.getHealingBeamSprite())
    }

    if(this.target && !isEmpty)
    {
      this.healingArea.position.x = this.target.getRelativeX()
      this.healingArea.position.y = this.target.getRelativeY()
      this.healingArea.width = this.target.sprite.width
      this.healingArea.height = this.target.sprite.height

      this.healingBeam.width = this.game.distance(this.getRelativeX(), this.getRelativeY(), this.target.getRelativeX(), this.target.getRelativeY())
      this.healingBeam.rotation = this.game.angle(this.getRelativeX(), this.getRelativeY(), this.target.getRelativeX(), this.target.getRelativeY())
      
      // pivot the beam (probably a better way to do this)
      this.healingBeam.position.x = this.getRelativeX() + Math.cos(this.healingBeam.rotation) * (this.healingBeam.width / 2)
      this.healingBeam.position.y = this.getRelativeY() + Math.sin(this.healingBeam.rotation) * (this.healingBeam.width / 2)

      // check if target would be full health
      // since there's a delay
      if(this.target.health + this.getDamage() >= this.target.getMaxHealth()) {
        this.playEndTween()
      }
      else if (!this.healTween || !this.healTween.isPlaying()){
        this.healTween = this.getHealTween()
        this.healTween.start()
      }
    } else { // can no longer repair target
        this.playEndTween()
    }
  }

  playEndTween() {
    this.healTween && this.healTween.stop() // reset tween
    this.healTween = this.getHealEndTween()
    this.healTween.start()
  }

  openMenu() {
    this.game.storageMenu.open("Revitalizer", this)
  }

  getDamageStat() {
    let value = this.getDamage()
    let el = "<div class='entity_stats_entry damage_entry'>" +
                  "<div class='stats_type'>" + i18n.t('Repair') + ":</div>" +
                  "<div class='stats_value'>" + value  + "</div>" +
              "</div>"
    return el
  }

  getBarrelWidth() {
    return 80
  }

  getBarrelHeight() {
    return 80
  }

  getBaseSpritePath() {
    return 'revitalizer_base.png'
  }

  getBarrelSpritePath() {
    return 'revitalizer_core.png'
  }

  getSpritePath() {
    return 'revitalizer.png'
  }

  getConstantsTable() {
    return "Buildings.Revitalizer"
  }

  getType() {
    return Protocol.definition().BuildingType.Revitalizer
  }

}

module.exports = Revitalizer
