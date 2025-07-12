const BaseBadge = require('./base_badge')

class OG extends BaseBadge {
    getName() {
        return 'OG'
    }

    async isQualified(player) {
        return await player.hasUserPlayed2Years()
    }

    getImageUrl() {
        return 'badges/og_badge.png'
    }

    getDescription() {
        return 'This badge is earned after playing for 2 years.'
    }

    getColor() {
        //dark purple
        return 'cf7ee9'
    }
}

module.exports = OG