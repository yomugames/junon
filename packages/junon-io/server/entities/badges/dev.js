const BaseBadge = require("./base_badge");

class Developer extends BaseBadge {
    getId() {
        return 'dev'
    }
    getName() {
        return 'Developer'
    }

    isQualified(player) {
        return false;
    }

    getImageUrl() {
        return 'badges/dev.png'
    }

    getDescription() {
        return 'Get this badge by becoming a Developer for junon.io'
    }

    getColor() {
        return "ff5f1f"
    }
}

module.exports = Developer;