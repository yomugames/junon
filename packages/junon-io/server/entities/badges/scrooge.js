const BaseBadge = require('./base_badge')

class Scrooge extends BaseBadge {
    getId() {
        return 'scr'
    }
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
        //bright yellow to avoid confusion with contrib badge
        return 'ffff99'
    }
}

module.exports = Scrooge