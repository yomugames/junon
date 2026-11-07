const BaseBadge = require("./base_badge");

class Minigame extends BaseBadge {
    getId() {
        return 'mc'
    }
    getName() {
        return 'Minigame'
    }

    isQualified(player) {
        return false;
    }

    getImageUrl() {
        return 'badges/minigame.png'
    }

    getDescription() {
        return 'Get this badge by being a verified minigame creator!'
    }

    getColor() {
        // transitional blue between neon and bright blue
        return "1f51ff"
    }
}

module.exports = Minigame;