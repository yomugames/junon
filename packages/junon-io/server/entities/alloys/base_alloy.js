const BaseEntity = require("../base_entity");

class BaseAlloy extends BaseEntity {
    isUsable() {
        return true;
    }

    mergeAlloy() {
        // might implement in the smelter building
    }

    setRarity(rarity) {
        this.rarity = rarity;
    }

    isAlloy() {
        return true
    }

}

module.exports = BaseAlloy