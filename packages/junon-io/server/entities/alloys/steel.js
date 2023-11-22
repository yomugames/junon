const Protocol = require("../../../common/util/protocol");
const BaseAlloy = require("./base_alloy");
const Constants = require('../../../common/constants.json')

class Steel extends BaseAlloy {
    getConstantsTable() {
        return "Alloys.Steel"
    }
    getType() {
        return Protocol.definition().BuildingType.Steel
    }

    getRarity() {
        return Constants.Alloys.Steel.rarity
    }
}