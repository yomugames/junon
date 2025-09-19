const Item = require("../../item");
const BaseAction = require("./base_action")
const Protocol = require('../../../../common/util/protocol')

class ChangeSuit extends BaseAction {
    perform(options) {
        if(options.takeOff && !Object.keys(options.suitStation.storage).length) {
            let armor = this.planner.entity.retrieveArmorItem() //station should be empty.
            options.suitStation.store(armor)
            options.suitStation.visitorId = this.planner.entity.id
            this.planner.entity.armorType = Protocol.definition().BuildingType.None
            this.planner.entity.Happiness.changeHappinessForEvent("takeOffSuit")
            this.planner.suitStation = options.suitStation
        } else {
            if(!Object.keys(options.suitStation.storage)) return

            let storedArmorItem = options.suitStation.retrieve(0)
            this.planner.entity.setArmorItem(storedArmorItem)
            options.suitStation.visitorId = undefined;
        }
   }
}

module.exports = ChangeSuit;