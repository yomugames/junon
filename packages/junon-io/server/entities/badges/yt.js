const BaseBadge = require('./base_badge')

class Youtube extends BaseBadge {
    getId() {
        return 'yt'
    }
    getName() {
        return 'Youtube'
    }

    isQualified(player) {
        return false;
    }

    getImageUrl() {
        return 'badges/yt.png'
    }

    getDescription() {
        return 'Have the youtuber role in the junon.io Discord by meeting the criteria.'
    }

    getColor() {
        //pure red
        return 'ff0000'
    }
}

module.exports = Youtube