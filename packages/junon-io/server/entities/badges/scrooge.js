const BaseBadge = require('./base_badge')

class Scrooge extends BaseBadge {
    getName() {
        return 'Scrooge'
    }

    async isQualified(player) {
        return await player.hasOneMillionGold();
    }

    getImageUrl() {
        return 'badges/scrooge.png'
    }

    getDescription() {
        return 'Unlocked once you have one million gold in your account.'
    }

    getColor() {
        //golden yellow
        return 'ffd700'
    }
}

module.exports = Scrooge