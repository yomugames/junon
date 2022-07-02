const BaseBuilding = require("./../base_building")
const Constants = require("./../../../../../common/constants.json")

class BaseTower extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)

    this.rangeSprite = this.getRangeSprite()
    this.container.rangeContainerSprite.addChildAt(this.rangeSprite, 0)

    if (isEquipDisplay) {
      this.drawRange()
    } else {
      this.hideRange()
    }
  }

  onPostClick() {
    this.container.setAllRangeAlpha(0)
    this.drawRange()
  }

  static getGroup() {
    return "towers"
  }

  isTower() {
    return true
  }

  getEntityMenuStats() {
    let el = super.getEntityMenuStats()

    el += this.getDamageStat()
    el += this.getRangeStat()

    return el
  }

  getDamageStat() {
    let value = this.getDamage()
    let el = "<div class='entity_stats_entry damage_entry'>" +
                  "<div class='stats_type'>" + i18n.t('Damage') + ":</div>" +
                  "<div class='stats_value'>" + value  + "</div>" +
              "</div>"
    return el
  }

  getRangeStat() {
    let value = this.getRange()
    let el = "<div class='entity_stats_entry range_entry'>" +
                  "<div class='stats_type'>" + i18n.t('Range') + ":</div>" +
                  "<div class='stats_value'>" + value  + "</div>" +
              "</div>"
    return el
  }


  unselect() {
    super.unselect()
    this.hideRange()
  }

  remove() {
    super.remove()

    if (this.rangeSprite.parent) {
      this.rangeSprite.parent.removeChild(this.rangeSprite)
    }
  }

  hasRangeDisplay() {
    return true
  }

  static getRangeTexture() {
    if (!this.rangeTexture) {
      let graphics = new PIXI.Graphics()
      graphics.beginFill(0xc59bff)
      graphics.drawCircle(0, 0, this.prototype.getAttackRange())
      graphics.endFill()

      this.rangeTexture = game.app.renderer.generateTexture(graphics)
    }

    return this.rangeTexture
  }

  getRangeSprite() {
    let sprite = new PIXI.Sprite(this.constructor.getRangeTexture())
    sprite.name = "range"
    sprite.anchor.set(0.5)
    sprite.position.x = this.getRelativeX()
    sprite.position.y = this.getRelativeY()
    return sprite
  }

  getBuildingSprite() {
    if (this.isStaticTower()) {
      return super.getBuildingSprite()
    }

    const sprite = new PIXI.Container()

    const baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getBaseSpritePath()])
    baseSprite.anchor.set(0.5)
    baseSprite.name = "BaseSprite"
    // baseSprite.position.y = this.getHeight() / 4

    const barrelSprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getBarrelSpritePath()])

    barrelSprite.anchor.set(0.5)
    barrelSprite.name = "BarrelSprite"

    this.baseSprite = baseSprite
    this.barrelSprite = barrelSprite

    sprite.addChild(baseSprite)
    sprite.addChild(barrelSprite)

    return sprite
  }

  isStaticTower() {
    return false
  }

  setAngle(angle) {
    if (this.isStaticTower()) return
      
    if (this.angle !== angle) {
      this.angle              = angle
      this.barrelSprite.rotation = this.getRadAngle()
    }
  }

  setBaseRotation(angle) {
    super.setBaseRotation(angle)

    if (!this.isStaticTower()) {
      this.baseSprite.rotation = angle * (Math.PI / 180)
    }
  }

  getBaseSpritePath() {
    throw new Error("must implement BaseTower#getBaseSpritePath")
  }

  getBarrelSpritePath() {
    throw new Error("must implement BaseTower#getBarrelSpritePath")
  }

  getSpritePath() {
    return this.getBarrelSpritePath()
  }

  getAttackRange() {
    if (this.sector && this.sector.entityCustomStats[this.id]) {
      return this.sector.entityCustomStats[this.id].range
    }

    if (this.sector && this.sector.buildingCustomStats[this.getType()]) {
      return this.sector.buildingCustomStats[this.getType()].range
    }

    return this.getStats(this.level).range
  }

  getRange() {
    return this.getAttackRange()
  }

  getDamage() {
    if (this.game.sector.entityCustomStats[this.id]) {
      return this.game.sector.entityCustomStats[this.id].damage
    }

    if (this.game.sector.buildingCustomStats[this.getType()]) {
      return this.game.sector.buildingCustomStats[this.getType()].damage
    }

    return this.getStats(this.level).damage
  }

  getUpgradeType() {
    return "units"
  }

  getCollisionGroup() {
    return "collisionGroup.Unit"
  }

  onGridPositionChanged() {
    super.onGridPositionChanged()
    
    this.rangeSprite.position.x = this.getRelativeX()
    this.rangeSprite.position.y = this.getRelativeY()
  }

  drawRange() {
    this.rangeSprite.alpha = 0.1
    this.rangeSprite.width  = this.getRange() * 2
    this.rangeSprite.height = this.getRange() * 2
  }

  hideRange() {
    this.rangeSprite.alpha = 0
  }
}

module.exports = BaseTower
