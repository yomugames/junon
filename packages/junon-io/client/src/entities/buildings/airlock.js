const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const SocketUtil = require("./../../util/socket_util")
const Wire = require("./wire")

class Airlock extends BaseBuilding {

  onBuildingConstructed() {
    super.onBuildingConstructed()

    this.isFirstLoad = true
  }

  isLightBlocker() {
    return !this.isOpen //  only if closed
  }

  static isPositionValid(container, x, y, w, h, angle, player) {
    let relativeBox = this.getBox(x, y, w, h)
    let structureSides = this.getSideTiles(container.structureMap, relativeBox)
    // let wallSides      = this.getSideTiles(container.armorMap, relativeBox)

    // let noAirtightWallBeside = wallSides.every((hit) => { return !hit.entity || (hit.entity && !hit.entity.isAirtight()) })
    // let noAirtightStructureBeside = structureSides.every((hit) => { return !hit.entity || (hit.entity && !hit.entity.isAirtight()) })

    let armorHits = container.armorMap.hitTestTile(relativeBox)
    const isEnemyArmor = armorHits.find((hit) => { return hit.entity && !hit.entity.isOwnedBy(player) })
    if (isEnemyArmor) return false

    return  this.isOnValidPlatform(container, x, y, w, h, angle, player) &&
                         // noAirtightStructureBeside &&
                         this.isWithinInteractDistance(x, y, player) &&
                         !this.isOnHangar(container, x, y, w, h) &&
                         !this.hasRailNeighbor(container, x, y, w, h) &&
                         !container.unitMap.isOccupied(x, y, w, h) &&
                         !container.railMap.isOccupied(x, y, w, h) &&
                         !container.structureMap.isOccupied(x, y, w, h)
  }


  onOpenChanged() {
    super.onOpenChanged()
    
    if (this.tween) this.tween.stop()

    if (this.isOpen) {
      this.open()
    } else {
      this.close()
    }

    if (this.isFirstLoad) {
      this.isFirstLoad = false
    } else {
      this.recalculateNearbyFov()
      // this.game.playSound("airlock", { minInterval: 5000, shouldDelete: false })
    }

    this.container.lightManager.invalidateLightSources(this.getRow(), this.getCol())
  }

  recalculateNearbyFov() {
    if (this.game.player && this.sector.isFovMode()) {
      let hits = this.constructor.getNeighborTiles(this.sector.structureMap, this.getRelativeBox())    
      this.game.player.recalculateFovIfHitPresent(hits)
    }
    
  }

  open() {
    this.tween = this.getOpenTween(Constants.tileSize * 2)
    this.tween.start()
  }

  close() {
    this.tween = this.getOpenTween(0)
    this.tween.start()
  }

  getUpgradeCost() {
    return 500
  }

  getMaxHealth() {
    let maxHealth = super.getMaxHealth()
    if (this.level === 1) return maxHealth * 2
    return maxHealth
  }

  getOpenTween(toPosition) {
    const fromPosition = this.upperDoorSprite.position.x
    let position = { position: fromPosition }

    return new TWEEN.Tween(position)
        .to({ position: toPosition }, 250)
        .onUpdate(() => {
          this.upperDoorSprite.position.x = position.position
          this.lowerDoorSprite.position.x = -position.position
        })
        .onComplete(() => {
        })
  }

  getType() {
    return Protocol.definition().BuildingType.Airlock
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    let texture = PIXI.utils.TextureCache[this.getSpritePath()]
    let baseSprite = new PIXI.Sprite(texture)
    baseSprite.name = "Hinge"
    baseSprite.anchor.set(0.5)

    texture = PIXI.utils.TextureCache["upper_door.png"]
    this.upperDoorSprite = new PIXI.Sprite(texture)
    this.upperDoorSprite.anchor.set(0.5)
    this.upperDoorSprite.name = "UpperDoor"

    texture = PIXI.utils.TextureCache["lower_door.png"]
    this.lowerDoorSprite = new PIXI.Sprite(texture)
    this.lowerDoorSprite.anchor.set(0.5)
    this.lowerDoorSprite.name = "LowerDoor"

    sprite.addChild(this.lowerDoorSprite)
    sprite.addChild(this.upperDoorSprite)
    sprite.addChild(baseSprite)

    return sprite
  }


  getSpritePath() {
    return "airlock_hinge.png"
  }

  getConstantsTable() {
    return "Buildings.Airlock"
  }

}

module.exports = Airlock
