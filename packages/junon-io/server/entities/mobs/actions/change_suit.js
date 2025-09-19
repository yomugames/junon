const Item = require("../../item");
const BaseAction = require("./base_action")
const Protocol = require('../../../../common/util/protocol')

class ChangeSuit extends BaseAction {
    perform(options) {
        if(options.takeOff) {
            let armor = this.planner.entity.retrieveArmorItem() //station should be empty.
            options.suitStation.store(armor)
            this.planner.entity.armorType = Protocol.definition().BuildingType.None
            this.planner.entity.Happiness.changeHappinessForEvent("takeOffSuit")
        }
   }
}

module.exports = ChangeSuit;