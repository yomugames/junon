class BaseBadge {
    getName() {
        throw new Error('Must implement getName()')
    }

    isQualified(player) {
        throw new Error('Must implement isQualified()')
    }

    getImageUrl() {
        throw new Error('Must implement getImageUrl()')
    }

    getDescription() {
        throw new Error('Must implement getDescription()')
    }

    getColor() {
        return 'ffffff'
    }

    isEquipped(player) {
        return player.equippedBadge.name === this.getName()
    }
}

module.exports = BaseBadge;