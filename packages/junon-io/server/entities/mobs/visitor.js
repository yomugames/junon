const LandMob = require("./land_mob")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")
const Projectiles = require('../projectiles/index')
const Planner = require("./actions/planner")
const Needs = require("../../../common/interfaces/needs")
const NeedsServer = require("../../interfaces/needs")
const EquipmentInventory = require("../equipment_inventory")
const Item = require("../item")

class Visitor extends LandMob {
  constructor(sector, data) {
    super(sector, data)
    if(data.constructor.name === 'Mob') { //data should be a Mob (from message Mob) if loaded from save file and should already have an equipment associated with it.
      this.loadedFromSaveFile = true;
    } else {
      this.setArmorItem(new Item(this, "SpaceSuit")) 
    }

    this.Happiness = new Happiness(this, data?.Happiness?.eventDefinitions); //this.happiness (no uppercase) already exists in a mob, and causes weird effects.
    //note: onPositionChanged() will happen before this.Happiness is initialized

    this.sector.visitors.push(this)
    this.setOwner(this.sector.getCreatorTeam()) 
    this.planner = new Planner(this)
    this.suitStationId = data.suitStationId;
  }

    

  preApplyData() {
    this.initNeeds()
    this.initEquipment()
  }

  ignoreSaveFileDormant() {
    return true;
  }

  initEquipment() {
    this.equipments = new EquipmentInventory(this, 2)
  }

  move(deltaTime) {
    super.move(deltaTime)

    this.consumeStamina()
    this.consumeHunger()
  }

  consumeStamina() {
    if (this.sector.settings['isStaminaEnabled'] === false) return
      
    const isSixSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 6) === 0
    if (!isSixSecondInterval) return

    if (this.isDormant) return

    this.setStamina(this.stamina - 1)
  }
  
  setExtraItem(item) {
    this.equipments.storeAt(Protocol.definition().EquipmentRole.Extra, item)
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

  getType() {
    return Protocol.definition().MobType.Visitor
  }

  getConstantsTable() {
    return "Mobs.Visitor"
  }

  canBeKnocked() {
    return true
  }

  setNeutral(isNeutral) {
    this.isNeutral = true // always neutral
  }

  onPositionChanged(options = {}) {
    super.onPositionChanged(options)
    if(this.planner) {
      if(this.planner.isHungry()) {
        this.planner.handleHunger();
      }
      if(this.planner.isSleepy()) {
        this.planner.handleSleep();
      }
      if(this.getRoom()?.checkIsOxygenated() && this.armorType) {
        this.planner.handleOxygen(true);
      } else if(!this.getRoom()?.checkIsOxygenated() && !this.armorType) {
        this.Happiness.changeHappinessForEvent("noOxygen")
        this.planner.handleOxygen(false);
      }
      if((this.sector.buildingCounts.barTableCount && this.Happiness.eventDefinitions.drinkBeer) || Protocol.definition().BuildingType[this.getHandItem()?.type] == "Beer") {
        this.planner.handleBarTable()
      }
      if((this.sector.buildingCounts.terminalCount && this.Happiness.eventDefinitions.useTerminal)) {
        this.planner.handleUseTerminal()
      }
    }
    if (this.Happiness) {
      this.updateHappiness()
    }
  }

  getTile(row = this.getRow(), col = this.getCol()) {
    return this.getPathFinder().getTile(row, col)
  }

  updateHappiness() {
    this.checkForPlants();
    this.checkForLights();
    this.checkForDirtBloodAndCarpet();
  }

  checkForDirtBloodAndCarpet() {
    let tile = this.getTile();
    if(!tile) return;
    if(tile.hasDirt()) {
      this.Happiness.changeHappinessForEvent("stepOnDirt")
    }
    if(tile.constructor.name === "CarpetFloor") {
      this.Happiness.changeHappinessForEvent("stepOnCarpet")
    }
    if(tile.hasBlood()) {
      this.Happiness.changeHappinessForEvent("stepOnBlood")
    }
  }

  checkForPlants() {
    let room = this.getRoom()
    if (!room) return;
    let structures = room.structures;
    let validStructures = [];
    for (let i in structures) {
      if (structures[i].entity.constructor.name === "Pot" && Object.keys(structures[i].entity.storage).length) validStructures.push(structures[i].entity)
    }
    if (validStructures.length > 2) {
      this.Happiness.changeHappinessForEvent("findPottedPlants")
    }
  }

  checkForLights() {
    let room = this.getRoom()
    if (!room) return

    let structures = room.structures; let validStructures = []; for (let i in structures) {
      if (structures[i].entity.hasCategory("lamp") && structures[i].entity.content !== "" && structures[i].entity.content !== "#ffffff" && structures[i].entity.isOpen) {
        validStructures.push(structures[i].entity);
      }
    }

    if (validStructures.length > 5) {
      this.Happiness.changeHappinessForEvent("findColoredLights");
    }
  }

  damage(amount, attacker, attackEntity) {
    super.damage(amount, attacker, attackEntity)
    if (this.getMaxHealth() - this.health > this.getMaxHealth() / 4) {
      this.Happiness.changeHappinessForEvent("damaged");
    }
  }

  setHandItem(item) {
    this.equipments.storeAt(Protocol.definition().EquipmentRole.Hand, item)
    this.onStateChanged("weaponType")
  }

  getExtraItem() {
    return;
  }

  setArmorItem(item) {
    this.equipments.storeAt(Protocol.definition().EquipmentRole.Armor, item)
    this.onStateChanged("armorType")
  }

  onHealthZero() {
    super.onHealthZero()
    this.Happiness.changeHappinessForEvent("killed");
  }
}

Object.assign(Visitor.prototype, Needs.prototype, {
  //add event handlers for needs here (see packages/junon-io/server/entities/mobs/slave.js:136)
})
Object.assign(Visitor.prototype, NeedsServer.prototype, {
  hasDragTarget() {} //for slaves only
})

class Happiness {
  /**
   * 
   * @param {Visitor} visitor 
   * @param {Number} level 
  */
  constructor(visitor, eventDefinitions, level) {
    this.level = level || 0;
    this.visitor = visitor
    this.eventDefinitions = eventDefinitions || {
      findColoredLights: 10,
      findPottedPlants: 10,
      damaged: -25,
      killed: -80,
      stepOnDirt: -5,
      stepOnBlood: -5,
      stepOnCarpet: 5,
      takeOffSuit: 35,
      noOxygen: -5,
      drinkBeer: 20,
      eatSlimyMeatPizza: 10,
      useTerminal: 10,
      noTable: -5
    }
  }

  changeHappinessForEvent(event) {
    let value = this.eventDefinitions[event]
    if (!value) return;
    delete this.eventDefinitions[event] //ensure doesn't trigger again.
    this.changeHappinessBy(value)
  }

  changeHappinessBy(value) {
    this.level += value;
    this.visitor.sector.visitorHappiness += value;
    this.visitor.sector.getSocketUtil().broadcast(this.visitor.sector.getSocketIds(), "RPUpdated", { visitorHappiness: this.visitor.sector.visitorHappiness })
  }
}



module.exports = Visitor
