const BaseBadge = require('./base_badge')

class Contributor extends BaseBadge {
    getId() {
        return 'ct'
    }
    getName() {
        return 'Contributor'
    }

    isQualified(player) {
        return false;
    }

    getImageUrl() {
        return 'badges/contrib.png'
    }

    getDescription() {
        return 'Get this badge by becoming a contributor for junon.io'
    }

    getColor() {
        //pure yellow
        return 'ffff00'
    }
}

module.exports = Contributor