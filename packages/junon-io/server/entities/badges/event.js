const BaseBadge = require("./base_badge");

class Event extends BaseBadge {
    getId() {
        return 'ev'
    }
    getName() {
        return 'Event'
    }

    isQualified(player) {
        return false;
    }

    getImageUrl() {
        return 'badges/og_badge.png'
    }

    getDescription() {
        return 'Win an event (check out the junon.io discord)'
    }

    getColor() {
        return "333333"
    }
}

module.exports = Event;