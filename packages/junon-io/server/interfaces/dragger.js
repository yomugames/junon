const Constants = require('../../common/constants.json')
const Protocol = require('../../common/util/protocol')
const EventBus = require('eventbusjs')
const winston = require("winston")
const Helper = require('../../common/helper')
const Dragger = () => {
}

Dragger.prototype = {
  initDragger() {
    this.onDragTargetRemovedListener = this.onDragTargetRemoved.bind(this)
  },

  releaseDragTarget() {
    if (!this.getContainer().isSector()) return

    let corpseId = this.dragTarget.getId()
    let corpseTypeName = this.dragTarget.getTypeName()

    // check if valid release position
    let box = this.dragTarget.getRelativeBox()
    let structureHits = this.getContainer().structureMap.hitTestTile(box)
      .filter((hit) => {
        return hit.entity
    })

    let closestStructureHit = structureHits.sort((a, b) => {
      let distanceA =  this.game.distanceBetween(this, a.entity)
      let distanceB =  this.game.distanceBetween(this, b.entity)
      return distanceA - distanceB
    })[0]

    if (closestStructureHit && closestStructureHit.entity.isEntityStorage()) {
      if (!closestStructureHit.entity.isFull()) {
        closestStructureHit.entity.store(this.dragTarget)
        this.unsetDragTarget()
      }
    } else {
      this.unsetDragTarget()
    }

    let data = {
      entityId: this.id,
      player: this.isPlayer() ? this.getName() : "",
      corpseType: corpseTypeName,
      corpseId: corpseId
    }

    this.game.triggerEvent("CorpseReleased", data)

    this.onStateChanged()
  },

  hasDragTarget() {
    return this.dragTarget
  },

  unsetDragTarget(){
    if (this.dragTarget) {
      this.dragTarget.unclaim()
      this.dragTarget.dragger = null
      EventBus.removeEventListener(`${this.game.getId()}:entity:removed:${this.dragTarget.getId()}`, this.onDragTargetRemovedListener)
    }
    this.dragTarget = null
  },

  claimDragTarget(entity) {
    if (entity === this) return // cant drag self
    if (entity && entity.isPlayer()) return // cant drag player
    if (entity.isClaimed()) return
    
    entity.claim(this)
  },

  setDragTarget(entity) {
    if (entity === this) return // cant drag self
    if (entity && entity.isPlayer()) return // cant drag player
    if (entity && entity.dragger) return // already being dragged by someone
    if(!Helper.isTargetWithinRange(this, entity)) {
      this.showError("Too far", { isWarning: true })
      return false
    }
  
    if (this.dragTarget && entity) {
      // if were setting a new drag target, release prev one first
      this.releaseDragTarget()
    }

    this.dragTarget = entity


    if (this.dragTarget) {
      this.dragTarget.claim(this)
      this.dragTarget.dragger = this
      EventBus.addEventListener(`${this.game.getId()}:entity:removed:${this.dragTarget.getId()}`, this.onDragTargetRemovedListener)

      let corpseTypeName = this.dragTarget.getTypeName()

      let data = {
        entityId: this.id,
        player: this.isPlayer() ? this.getName() : "",
        corpseType: corpseTypeName,
        corpseId: this.dragTarget.id
      }

      this.game.triggerEvent("CorpseDragged", data)

    }

    this.updateDragTargetPosition()
    this.onDragTargetChanged()

    this.onStateChanged()
  },

  setDragTargetPosition(dragger, dragTarget) {
    const dragRange = Constants.tileSize
    const xp = dragRange * Math.cos(this.getRadAngle())
    const yp = dragRange * Math.sin(this.getRadAngle())
    dragTarget.setPosition(dragger.getX() + xp, dragger.getY() + yp)
  },

  updateDragTargetPosition() {
    if (this.dragTarget) {
      let dragger = this.dragTarget.dragger
      this.setDragTargetPosition(dragger, this.dragTarget)
    }
  },

  onDragTargetChanged() {

  },

  onDragTargetRemoved() {
    this.dragTarget = null
  },

  onDraggerRemoved() {
    if (this.dragTarget) {
      this.unsetDragTarget()
    }

  }

}

module.exports = Dragger