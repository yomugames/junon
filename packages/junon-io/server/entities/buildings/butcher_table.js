const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class ButcherTable extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    this.getPlacer() && this.getPlacer().progressTutorial("corpse", 0)
  }

  interact(user, options = {}) {
    if (this.activeCorpse) return false

    if (this.isRemoved) {
      if (options.onComplete) {
        options.onComplete(this)
      }
      return true
    }

    if (!user.hasDragTarget()) {
      user.showError("Corpse Required")
      return false
    }

    if (!user.dragTarget.isCorpse()) return false

    if (user.dragTarget.isSlaveCorpse()) {
      if (user.isPlayer() && !user.isAdmin()) {
        user.showError("Not allowed to do that")
        return false
      }
    }

    let workPosition = this.getWorkPosition()
    if (!workPosition) return false

    if (user.isPlayer() && user.getRole() && !user.getRole().isAllowedTo("ButcherCorpse")) {
      user.showError("Permission Denied")
      return false
    }

    if (user.isWorking) return false

    this.activeCorpse = user.dragTarget
    this.activeCorpse.setPosition(this.getX(), this.getY())

    let workPositionAngle = (workPosition.radAngle * 180 / Math.PI)

    user.setIsWorking(true)

    if (user.isPlayer()) {
      user.setEquipIndex(-1)
    }

    user.setAngle(workPositionAngle)

    this.activeUser = user
    this.activeUser.setPosition(workPosition.x, workPosition.y)

    if (options.onComplete) {
      this.onButcherFinished = options.onComplete
    }

    this.container.addProcessor(this)

    return true
  }

  getInteractDistance() {
    return Constants.tileSize * 2
  }

  onCorpseRemoved() {
    let data = {
      corpseType: Protocol.definition().MobType[this.activeCorpse.type],
      entityId: this.activeUser.getId(),
      player: ""
    }

    if (this.activeUser.isPlayer()) {
      data.player = this.activeUser.getName()
    }

    this.game.triggerEvent("CorpseButchered", data)

    this.activeCorpse = null

    if (this.activeUser) {
      this.activeUser.unsetDragTarget()

      if (this.activeUser.isPlayer()) {
        this.activeUser.progressTutorial("corpse", 2)
        this.activeUser.walkthroughManager.handle("butcher_slime")
      }

      this.activeUser.setIsWorking(false)

      if (this.onButcherFinished) {
        this.onButcherFinished(this)
        this.onButcherFinished = null
      }
      this.activeUser = null
    }

    this.container.removeProcessor(this)
    this.usage = 0
  }

  harvestCorpse() {
    let workPosition = this.getWorkPosition()
    if (!workPosition) return

    if (this.activeUser.isPlayer()) {
      let pickup = this.activeCorpse.harvest(workPosition)
      if (!pickup) {
        this.activeUser.showError('ButcherTable.HarvestFailure')
      }
    } else if (this.activeUser.isMob()) {
      let item = this.activeCorpse.harvestToItem()
      if (item) {
        this.activeUser.setHandItem(item)
      }
    }
  }

  executeTurn() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    if (!this.activeCorpse) {
      this.onCorpseRemoved()
      return
    }

    let extraFactor = Math.floor(this.activeCorpse.getMobMaxHealth() / 50)
    let baseSeconds = 4
    let secondsToComplete = baseSeconds + extraFactor
    let progress = Math.ceil(100 / secondsToComplete)

    this.usage = this.usage || 0
    this.setProgress(this.usage + progress)

    if (this.isButcheringComplete()) {
      this.harvestCorpse()
      this.onCorpseRemoved()
    }
  }

  isButcheringComplete() {
    return this.usage >= 100
  }

  setProgress(usage) {
    if (usage > 100) {
      this.usage = 100
    } else {
      this.usage = usage
    }

    this.onStateChanged("usage")
  }

  getConstantsTable() {
    return "Buildings.ButcherTable"
  }

  getType() {
    return Protocol.definition().BuildingType.ButcherTable
  }

}

module.exports = ButcherTable
