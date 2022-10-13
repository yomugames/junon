const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const Foods = require("./../foods/index")
const ExceptionReporter = require('junon-common/exception_reporter')

class Stove extends BaseBuilding {

  onBuildingPlaced() {
    super.onBuildingPlaced()
    if (!this.content) {
      this.setBuildingContent(Protocol.definition().BuildingType.Gelatin.toString())
    }
    
  }

  getConstantsTable() {
    return "Buildings.Stove"
  }

  getType() {
    return Protocol.definition().BuildingType.Stove
  }

  canCraft(type) {
    if (this.isFull()) return false

    return Foods.forType(type)
  }

  canBeCookedBy(item, user) {
    if (user.isPlayer()) {
      return item.isCraftable(user.inventory.storage)
    } else {
      return item.isCraftable(user.equipments.storage)
    }
  }

  getDesiredFoodItem() {
    let foodType = parseInt(this.content)
    return this.sector.createItem(foodType)
  }

  getFoodRequirements() {
    let foodType = parseInt(this.content)
    let foodKlass = Foods.forType(foodType)
    if (!foodKlass) return null
    return foodKlass.prototype.getRequirements()
  }

  interact(user, options = {}) {
    if (!this.hasMetPowerRequirement()) return false

    let item = this.getDesiredFoodItem()
    if (!this.canBeCookedBy(item, user)) {
      return
    }

    if (this.activeUser) return false

    let workPosition = this.getWorkPosition()
    if (!workPosition) {
      user.showError("Unreachable", { isWarning: true })
      return false
    }

    if (user.isPlayer() && user.getRole() && !user.getRole().isAllowedTo("Cook")) {
      user.showError("Permission Denied")
      return false
    }

    let workPositionAngle = (workPosition.radAngle * 180 / Math.PI)
    this.activeUser = user
    this.activeUser.setIsWorking(true)
    this.activeUser.setAngle(workPositionAngle)
    this.activeUser.setPosition(workPosition.x, workPosition.y)

    if (options.onComplete) {
      this.onCookingFinished = options.onComplete
    }

    this.container.addProcessor(this)
    return true
  }

  executeTurn() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    let secondsToComplete = 5
    let progress = Math.ceil(100 / secondsToComplete)

    this.usage = this.usage || 0
    this.setProgress(this.usage + progress)

    if (this.isCookingComplete()) {
      this.onFoodReady()
    }
  }

  getInteractDistance() {
    return Constants.tileSize * 2
  }

  onFoodReady() {
    try {
      let item = this.getDesiredFoodItem()
      
      this.activeUser.setIsWorking(false)

      let isSuccessful
      if (this.activeUser.isPlayer()) {
        isSuccessful = item.craft(this.activeUser.inventory.storage)
        this.activeUser.walkthroughManager.handle("cook_slime")
      } else {
        isSuccessful = item.craft(this.activeUser.equipments.storage)
      }

      if (isSuccessful) {
        if (this.activeUser.isPlayer()) {
          this.activeUser.inventory.store(item)

          let data = { 
            foodType: item.type, 
            entityId: this.activeUser.getId(),
            player: ""
          }

          if (this.activeUser.isPlayer()) {
            data.player = this.activeUser.getName()
          }

          this.game.triggerEvent("FoodCooked", data)
        } else {
          this.activeUser.setHandItem(item)
        }
      }
    } catch(e) {
      ExceptionReporter.captureException(e)
    } finally {
      this.container.removeProcessor(this)

      if (this.onCookingFinished) {
        this.onCookingFinished(this)
        this.onCookingFinished = null
      }
      this.activeUser = null

      this.usage = 0
    }

  }

  isCookingComplete() {
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


}

module.exports = Stove

