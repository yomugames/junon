const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class SuitStation extends BaseBuilding {

  unregister() {
    super.unregister()
    this.container.removeProcessor(this)
  }

  // switch armors
  interact(user) {
    if (this.game.isMiniGame() && this.game.sector.miniGame.name === 'find_the_imposter') {
      return 
    }

    if (!this.canBeInteracted(user)) {
      user.showError("That doesnt belong to you")
      return
    }

    let playerArmorItem = user.retrieveArmorItem()
    let storedArmorItem = this.retrieve(0)

    if (playerArmorItem) {
      this.store(playerArmorItem)
      this.changeOwnership(user)
    }

    if (storedArmorItem) {
      user.setArmorItem(storedArmorItem)
      if (user.isPlayer()) {
        user.walkthroughManager.handle("suit_station")
      }
      this.changeOwnershipToTeam(user.getTeam())
    }
  }

  changeOwnershipToTeam(team) {
    if (this.owner) {
      this.owner.unregisterOwnership("structures", this)
    }
    
    this.setOwner(team)

    team.registerOwnership("structures", this)
  }

  changeOwnership(user) {
    if (!user.isPlayer()) return

    if (this.owner) {
      this.owner.unregisterOwnership("structures", this)
    }
    
    this.setOwner(user)

    user.registerOwnership("structures", this)
  }

  canBeInteracted(player) {
    if (this.visitorId) return false; //has visitor associated with it. Team won't change for a visitor
    if (!this.owner) return true

    if (this.owner.isPlayer() || this.owner.isPlayerData()) {
      let isAdminOfTeam = this.owner.getTeam() === player.getTeam() && player.isAdmin()
      if (isAdminOfTeam) return true

      return this.owner === player
    } else {
      return player.hasOwnership(this)
    }
  }

  canBeSalvagedBy(player) {
    if (!this.canBeInteracted(player)) return false

    return super.canBeSalvagedBy(player)
  }

  executeTurn() {
    const isThreeSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * Constants.oxygenProductionConsumptionRate) === 0
    if (!isThreeSecondInterval) return

    let item = this.get(0)
    if (!item) return

    let platform = this.getStandingPlatform()

    let isOxygenatedPlatform = platform && platform.room && platform.room.isOxygenated

    if (this.isOxygenItem(item) && isOxygenatedPlatform) {
      let equipment = item.instance
      equipment.increaseOxygen(6)
      platform.room.consumeOxygen(this)
    }
  }

  isOxygenItem(item) {
    if (!item) return false
    return item.instance && item.instance.hasOxygen()
  }

  getConstantsTable() {
    return "Buildings.SuitStation"
  }

  getType() {
    return Protocol.definition().BuildingType.SuitStation
  }

  getStorageContentType() {
    let item = this.get(0)
    if (!item) return ""

    let suitColor = item.instance && item.instance.content 
    if (suitColor) {
      return [item.type.toString(),suitColor].join(":")
    } else {
      return item.type.toString()
    }
  }

  canStore(index, item) {
    if (!item) return true // allow swap with blank space slot

    return item.isArmor()
  }

  onStorageChanged(item, index) {
    super.onStorageChanged(item, index)

    this.setBuildingContent(this.getStorageContentType())
    
    this.onStateChanged("content")

    let storedItem = this.get(0)
    if (this.isOxygenItem(storedItem)) {
      this.container.addProcessor(this)
    } else {
      this.container.removeProcessor(this)
    }
  }

}

module.exports = SuitStation
