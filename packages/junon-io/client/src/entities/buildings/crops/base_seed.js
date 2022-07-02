const BaseBuilding = require("./../base_building")
const SocketUtil = require("./../../../util/socket_util")
const Constants = require("../../../../../common/constants.json")


class BaseSeed extends BaseBuilding {

  static isPositionValid(container, x, y, w, h, angle, player) {
    const hits = container.platformMap.hitTestTile(this.getBox(x, y, w, h))
    const isOnSoil = hits.every((hit) => { return hit.entity && hit.entity.hasCategory("soil") })

    return isOnSoil &&
           this.isWithinInteractDistance(x, y, player) &&
           !container.distributionMap.isOccupied(x, y, w, h) &&
           !container.armorMap.isOccupied(x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h)
  }

  getRotatedWidth() {
    return Constants.tileSize
  }

  getRotatedHeight() {
    return Constants.tileSize
  }


  getTypeName(content) {
    let name = super.getTypeName(content)

    if (this.isHarvestable) {
      name = name.replace("Seed", "Plant")

    }

    return name
  }

  assignStructureOnMap() {
    // dont draw to map
  }

  getEntityMenuStats() {
    let statsEl = super.getEntityMenuStats()

    let growthPercent = Math.floor(100 * (this.health / this.getMaxHealth()))

    let el = "<div class='entity_stats_entry'>" +
                    "<div class='stats_type'>" + i18n.t('PlantGrowth') + ":</div>" +
                    "<div class='stats_value'>" + growthPercent + " %</div>" +
                "</div>"

    return statsEl + el
  }

  interactBuilding() {
    this.game.interact(this)
    this.game.player.setActTarget(this)
  }

  getGroup() {
    return "distributions"
  }


  setIsHarvestable(isHarvestable) {
    this.isHarvestable = isHarvestable

    if (this.isHarvestable) {
      this.redrawCrop()
    }
  }

  onPostClick() {
    if (!this.isHarvestable) {
      this.game.interact(this)
    }
  }

  onIsWateredChanged() {
    let platform = this.getStandingPlatform()
    if (!platform) return

    if (this.isWatered) {
      platform.applyTint(0x999999)
    } else {
      platform.applyTint(0xffffff)
    }

    platform.updateChunkSprite()
  }

  remove() {
    super.remove()

    let platform = this.getStandingPlatform()
    if (!platform) return

    platform.applyTint(0xffffff)
    platform.updateChunkSprite()
  }

  getMatureSpritePath() {
    let table = this.getConstants()
    if (table.sprite && table.sprite.maturepath) {
      return table.sprite.maturepath + ".png"
    }

    throw "must implement getMatureSpritePath"
  }

  redrawCrop() {
    const texture = PIXI.utils.TextureCache[this.getMatureSpritePath()]
    this.buildingSprite.texture = texture

    this.updateChunkSprite()
  }

  onBuildingConstructed() {
    this.container.crops[this.id] = this
    this.container.distributionMap.register(this.getMapRegisterBox(), this)
  }

  unregister() {
    this.getContainer().unregisterEntity("crops", this)
    this.container.distributionMap.unregister(this.getMapRegisterBox(), this)
  }

  getMap() {
    return this.container.distributionMap
  }

  forceShowDamage() {
    return true
  }

}

module.exports = BaseSeed
