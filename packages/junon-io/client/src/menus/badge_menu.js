const BaseMenu = require('./base_menu')

class BadgeMenu extends BaseMenu {
    onMenuConstructed() {
        
    }
    open() {
        super.open()
        this.game.getSocketUtil().emit("GetBadges", {})
    }
}

module.exports = BadgeMenu