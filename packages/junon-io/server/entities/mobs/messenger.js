const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')
const EquipmentInventory = require("./../equipment_inventory")
const Item = require("./../item")

class Messenger extends LandMob {
  onPostInit() {
    if (this.owner) {
      this.game.eventManager.registerMessenger(this, this.owner)
    }
  }

  setHealth() {
    // cant die
  }

  getType() {
    return Protocol.definition().MobType.Messenger
  }

  onNPCClientMessage(data) {
    this.choice = data.choice

    if (data.choice === 1) {
      this.onPlayerPayment(data)
    } else if (data.choice === 2) {
      if (!data.player.isAdmin()) {
        data.player.showError("Only Admin can choose that action")
        return
      }
      this.onPlayerDeclareWar(data)
    }
  }

  move(deltaTime) {
    super.move(deltaTime)

    if (this.isLeaving) {
      this.removeAfterFiveSeconds()
      return
    }

    this.handleNoPayment()
  }

  remove() {
    if (this.owner) {
      this.game.eventManager.unregisterMessenger(this, this.owner)
    }

    super.remove()
  }

  handleNoPayment() {
    const isThreeSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 3) === 0
    if (!isThreeSecondInterval) return

    if (this.game.hour === 21) {
      this.onPlayerDeclareWar()
    }

    if (this.game.hour >= 22 || this.game.hour < 15) {
      this.remove()
    }
  }

  onPlayerDeclareWar(data) {
    if (this.paymentReceived) return

    if (this.owner) {
      if (!this.owner.hasAdminOnline()) return
      this.owner.addDeed("taxes_not_paid")
      this.owner.broadcast("NPCServerMessage", {
        entityId: this.getId(),
        choice: this.choice,
        message: "Messenger.Blasphemy"
      })
    }

    this.npcLeaveGame()

  }

  onPlayerPayment(data) {
    let player = data.player
    if (!player.getTeam()) return
    if (this.paymentReceived) return

    let taxAmount = player.getTeam().getRequiredTaxAmount()

    if (player.gold < taxAmount) {
      player.showError("You dont have enough gold.")
      return
    }

    player.reduceGold(taxAmount)

    this.onPlayerPaymentReceived(data)
  }

  onPlayerPaymentReceived(data) {
    this.paymentReceived = true
    this.npcLeaveGame()

    if (this.owner) {
      this.owner.removeDeed("taxes_not_paid")
      this.owner.broadcast("NPCServerMessage", {
        entityId: this.getId(),
        choice: this.choice,
        message: "Messenger.RightChoice"
      })
    }
  }

  onGoalReached(targetEntityToMove, goal) {
    super.onGoalReached(targetEntityToMove, goal)

    this.setDormant(true)
    this.setAngle(90)
  }


  getConstantsTable() {
    return "Mobs.Messenger"
  }

}

module.exports = Messenger
