const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const Helper = require('../../../common/helper')
const BaseBuilding = require("./base_building")
const ExceptionReporter = require('junon-common/exception_reporter')

class CryoTube extends BaseBuilding {

  interact(user) {
    if (!user.canAccessStorage(this)) {
      if (user.isPlayer()) {
        user.showError("Permission Denied", { isWarning: true })
      }
      
      return
    }

    if (user.isWorking) return

    if (this.isFull()) {
      this.releaseContent(user)
    } else if (user.hasDragTarget()) {
      if (this.game.distanceBetween(user, this) < Constants.tileSize * 3) {
        if (this.canStore(0, user.dragTarget)) {
          this.store(user.dragTarget)
          user.unsetDragTarget()
        }
      }
    }

  }

  releaseContent(user) {
    let storedEntity = this.retrieve(0)
    if (storedEntity) {

      if (user && user.isPlayer()) {
        user.walkthroughManager.handle("release_guard")
      }

      if (this.canStore(0, storedEntity)) {
        storedEntity.setDormant(false)
      }

      let pos = this.getReleasePosition()
      storedEntity.setPosition(pos.x, pos.y)
    }
  }

  getReleasePosition() {
    let centerX = this.getX()
    let centerY = this.getY()
    let tileDistance = 2
    let x = centerX - Math.floor(Math.cos(this.getRadAngle()) * Constants.tileSize * tileDistance)
    let y = centerY - Math.floor(Math.sin(this.getRadAngle()) * Constants.tileSize * tileDistance)

    return { x: x, y: y }
  }

  executeTurn() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    let entity = this.getStoredEntity()
    if (entity) {
      if (entity.isCorpse()) {
        let mob
        if (this.sector.getSetting("isMutantEnabled") && Math.random() < 0.25) {
          mob = entity.resurrect("Mutant")
          mob.setHealth(mob.getMaxHealth())
          this.removeAt(0) // remove storage content
          this.store(mob)
          this.releaseContent()
        } else {
          mob = entity.resurrect()
          this.removeAt(0) // remove storage content
          this.store(mob)
        }

      } else {
        entity.setHealth(entity.health + 1)
      }

    }
  }

  getStoredEntity() {
    return this.get(0)
  }

  isEntityStorage() {
    return true
  }

  getConstantsTable() {
    return "Buildings.CryoTube"
  }

  getType() {
    return Protocol.definition().BuildingType.CryoTube
  }

  canStore(index, item) {
    return item.isDraggable() && !item.isPlayer() && typeof item.setDormant === "function"
  }

  onStorageChanged(item, index) {
    super.onStorageChanged(item, index)
    
    let storedEntity = this.get(0)
    if (storedEntity && this.canStore(0, storedEntity)) {
      storedEntity.setPosition(this.getX(), this.getY())
      storedEntity.setDormant(true)
      this.container.addProcessor(this)
    } else {
      this.container.removeProcessor(this)
    }

    this.onStateChanged("content")
  }

  removeStorageItems() {
    this.releaseContent()
  }

}

module.exports = CryoTube

