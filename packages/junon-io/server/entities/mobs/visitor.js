const LandMob = require("./land_mob")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")
const Projectiles = require('../projectiles/index')

class Visitor extends LandMob {
  constructor(sector, data) {
    super(sector, data)
    this.Happiness = new Happiness(); //this.happiness already exists in a mob, and causes weird effects.
    //note: onPositionChanged() will happen before this.Happiness is initialized
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

  onPositionChanged() {
    super.onPositionChanged()
    if(this.Happiness) {
      this.updateHappiness()
    }
  }

  getTile(row=this.getRow(), col=this.getCol()) {
    return this.getPathFinder().getTile(row,col)
  }

  updateHappiness() {
    this.checkForPlants();
    this.checkForLights();
  }

  checkForPlants() {
    
  }

  checkForLights() {
    let room = this.getRoom()
    if(!room) return

    let structures = room.structures;
    let validStructures = [];
    for(let i in structures) {
      if(structures[i].entity.hasCategory("lamp") && structures[i].entity.content !== "" && structures[i].entity.content !== "#ffffff" && structures[i].entity.isOpen) {
        validStructures.push(structures[i].entity);
      }
    }

    if(validStructures.length > 5) {
      this.Happiness.changeHappinessForEvent("findColoredLights");
    }

  }
}


class Happiness {
  constructor(level) {
    this.level = level || 0;
    this.eventDefinitions = {
      findColoredLights: 10
    }
  }

  changeHappinessForEvent(event) {
    let value = this.eventDefinitions[event]
    if(!value) return;
    delete this.eventDefinitions[event] //ensure doesn't trigger again.
    this.changeHappinessBy(value)
  }

  changeHappinessBy(value) {
    this.level += value;
    console.log(this.level)
  }
}



module.exports = Visitor
