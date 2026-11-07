const BaseBadge = require('./base_badge')

class Moderator extends BaseBadge {
    getId() {
        return 'md'
    }
    getName() {
        return 'Moderator'
    }

    isQualified(player) {
        return false;
    }

    getImageUrl() {
        return 'badges/mod.png'
    }

    getDescription() {
        return 'Only a moderator can have this badge.'
    }

    getColor() {
        //pure yellow
        return '39ff14'
    }
}

module.exports = Moderator