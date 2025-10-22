const Player = require("../player");

class BaseBadge {
    getId() {
        throw new Error('Must implement getId()')
    }
    getName() {
        throw new Error('Must implement getName()')
    }

    /**
     * Will be automatically executed by Player.constructor, return false if you don't want this.
     * @param {Player} player 
     */
    isQualified(player) {
        throw new Error('Must implement isQualified()')
    }

    getImageUrl() {
        throw new Error('Must implement getImageUrl()')
    }

    getDescription() {
        throw new Error('Must implement getDescription()')
    }

    getColor() {
        return 'ffffff'
    }

    isEquipped(player) {
        return player.equippedBadge.name === this.getName()
    }
}

module.exports = BaseBadge;