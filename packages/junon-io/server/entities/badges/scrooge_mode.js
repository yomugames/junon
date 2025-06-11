const BaseBadge = require('./base_badge')

class ScroogeMode extends BaseBadge {
    getName() {
        return 'ScroogeMode'
    }

    async isQualified(player) {
        return await player.hasOneMillionGold();
    }

    getImageUrl() {
        return 'badges/scrooge_mode.png'
    }

    getDescription() {
        return 'Unlocked once you have one million gold in your account.'
    }

    getColor() {
        //golden yellow
        return 'ffd700'
    }
}

module.exports = ScroogeMode