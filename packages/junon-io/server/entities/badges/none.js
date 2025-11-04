const BaseBadge = require("./base_badge");

class None extends BaseBadge {
    getName() {
        return "None"
    }

    isQualified(player) {
        return true;
    }

    getImageUrl() {
        return 'badges/none.png'
    }

    getDescription() {
        return ''
    }
}

module.exports = None;