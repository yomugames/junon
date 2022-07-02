const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const SocketUtil = require("./../../util/socket_util")
const ClientHelper = require("./../../util/client_helper")

class MineralStorage extends BaseBuilding {

  onBuildingConstructed() {
    super.onBuildingConstructed()

    this.spriteCount = 0
    this.storageSprite = new PIXI.Container()
    this.storageSprite.pivot.set(this.getWidth()/2)

    this.buildingSprite.addChild(this.storageSprite)
  }

  getSpritePath() {
    return 'box_storage.png'
  }

  syncWithServer(data) {
    super.syncWithServer(data)

    this.setMineralUsage(data.usage)
  }

  setMineralUsage(usage) {
    if (usage < this.usage) {
      this.onMineralDecreased(this.usage - usage)
    }

    if (this.usage !== usage) {
      this.usage = usage
      this.onMineralUsageChanged()
    }
  }

  onMineralDecreased(amount) {
    this.removeChildrens(this.storageSprite)
    this.spriteCount = 0
  }

  onMineralUsageChanged() {
    const maxSpriteCount = 20
    const numRequired = Math.floor(this.usage / this.getMineralCapacity() * maxSpriteCount)
    const numAdditional = numRequired - this.spriteCount

    for (var i = 0; i < numAdditional; i++) {
      let sprite = this.createMineralSprite()
      this.storageSprite.addChild(sprite)
    }

    this.spriteCount = numRequired

  }

  onClick() {
    if (player.isUsingDismantler()) {
      return super.onClick()
    }

    super.onClick()
    if (this.usage > 0) {
      SocketUtil.emit("RetrieveMinerals", { shipId: this.ship.id, buildingId: this.id })
    }
  }

  createMineralSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["mineral.png"])
    sprite.anchor.set(0.5)
    sprite.width = 16
    sprite.height = 16

    sprite.position.x = this.getRandomMineralPosition()
    sprite.position.y = this.getRandomMineralPosition()

    return sprite
  }

  getRandomMineralPosition() {
    const min = 16
    const max = this.getWidth() - min
    return Math.floor(Math.random()*(max-min+1)+min)
  }

  getMineralCapacity() {
    return this.getStats(this.level).minerals
  }

  getType() {
    return Protocol.definition().BuildingType.MineralStorage
  }

  getConstantsTable() {
    return "Buildings.MineralStorage"
  }

}

module.exports = MineralStorage
