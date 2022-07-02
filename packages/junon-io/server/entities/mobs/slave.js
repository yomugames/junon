const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')
const Item = require("./../item")
const Planner = require("./actions/planner")
const Needs = require("./../../../common/interfaces/needs")
const NeedsServer = require("../../interfaces/needs")
const Dragger = require("../../interfaces/dragger")
const EquipmentInventory = require("./../equipment_inventory")

class Slave extends LandMob {

  onPostInit() {
    this.setBehaviorByName("Idle")

    this.planner = new Planner(this)
  }

  ignoreSaveFileDormant() {
    return true
  }

  preApplyData() {
    this.initNeeds()
    this.initDragger()
    this.initEquipment()
  }

  initEquipment() {
    this.equipments = new EquipmentInventory(this, 4)
  }

  onAngleChanged() {
    super.onAngleChanged()

    this.updateDragTargetPosition()
  }

  feed(player, item) {
    if (this.nextFeedTimestamp) {
      if (this.game.timestamp < this.nextFeedTimestamp) {
        return
      }
    }

    if (!item.isFood()) return
    if (!item.isEdible()) return
    
    this.nextFeedTimestamp = this.game.timestamp + this.getFeedTimestampInterval()
    item.use(player, this)
  }

  getDefaultTasks() {
    let result = 0
    let disabledTasks = {
      "Cook": true
    }

    let taskNames = Object.keys(Protocol.definition().TaskType)
    for (let i = 0; i < taskNames.length; i++) {
      let taskName = taskNames[i]
      if (!disabledTasks[taskName]) {
        let taskId = Protocol.definition().TaskType[taskName]
        result += (1 << taskId)
      }
    }

    return result
  }

  onPositionChanged(options = {}) {
    super.onPositionChanged(options)
    this.updateDragTargetPosition()
  }

  setHandItem(item) {
    this.equipments.storeAt(Protocol.definition().EquipmentRole.Hand, item)
    this.onStateChanged("weaponType")
  }

  setExtraItem(item) {
    this.equipments.storeAt(Protocol.definition().EquipmentRole.Extra, item)
  }

  getExtraItem() {
    return this.equipments.get(Protocol.definition().EquipmentRole.Extra)
  }

  setHandEquipment(item) {
    this.setHandItem(item)
  }

  getHandItem() {
    return this.equipments.get(Protocol.definition().EquipmentRole.Hand)
  }

  move(deltaTime) {
    super.move(deltaTime)

    this.consumeStamina()
    this.consumeHunger()
  }

  remove() {
    super.remove()
    this.onDraggerRemoved()
  }

  consumeStamina() {
    if (this.sector.settings['isStaminaEnabled'] === false) return
      
    const isSixSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 6) === 0
    if (!isSixSecondInterval) return

    if (this.isDormant) return

    this.setStamina(this.stamina - 1)
  }

  isAbstract() {
    return true
  }

  getType() {
    return Protocol.definition().MobType.Slave
  }

  getConstantsTable() {
    return "Mobs.Slave"
  }

}


Object.assign(Slave.prototype, Needs.prototype, {
  onSleepStateChanged(){
    this.onStateChanged("isSleeping")
  },
  onHungerZero() {
    // this.setHealth(this.health - 2)
  },
  onOxygenChanged() {
    this.onStateChanged("oxygen")
  },
  onStaminaChanged() {
    this.onStateChanged("stamina")
  },
  onHungerChanged() {
    this.onStateChanged("hunger")
  },
  onHappinessChanged() {
    this.onStateChanged("happiness")
  },
  getMaxOxygen() {
    return this.getStats().oxygen
  }
})

Object.assign(Slave.prototype, NeedsServer.prototype, {
  getHungerReduceInterval() {
    return 8
  }
})

Object.assign(Slave.prototype, Dragger.prototype, {
  onDragTargetRemoved() {
    if (this.planner) {
      this.planner.onDragTargetRemoved()
    }
  }
})

module.exports = Slave
