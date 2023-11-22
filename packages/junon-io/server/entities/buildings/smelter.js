const BaseBuilding = require("./base_building");
const BaseProcessor = require("./base_processor");
const AlloyIndex = require('../alloys/index.js')

class Smelter extends BaseProcessor {
    getConstantsTable() {
        return "Buildings.Smelter"
    }

    getType() {
        return Protocol.definition().BuildingType.Forge
    }

    mergeAlloys(alloy1, alloy2) {
        if(!AlloyIndex[alloy1]) return
        if(!AlloyIndex[alloy2]) return

        
    }

    isProcessable(inputItem) {
        return inputItem.isAlloy()
    }
    
}

module.exports = Smelter