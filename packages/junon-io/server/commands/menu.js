const BaseCommand = require("./base_command")

class Menu extends BaseCommand {
    getUsage() {
        return [
            "/menu close [menu name] [player name]",
            "/menu open [menu name] [player name]",
            "Available menu names:",
            "keypadMenu, craftMenu, atmMenu, friendsMenu, commandBlockMenu, teamMenu, welcomeMenu, stoveMenu, tradeMenu, slaveTradeMenu, badgeMenu"
        ]
    }

    allowOwnerOnly() {
        return true
    }

    perform(caller, args) {
        let subcommand = args[0]
        let menuName = args[1]
        let player = args[2]
        let multiplePlayers
        if(!caller || !caller.isPlayer()) return

        if(player) {
            player = this.getPlayersBySelector(player)
            multiplePlayers = true
        } else {
            player = caller
        }

        if(subcommand == "open") {
            if(multiplePlayers) {
                player.forEach((entity) => {
                    this.getSocketUtil().emit(entity.socket, "OpenMenu", {menuName: menuName})
                })
                return
            }
            player.getSocketUtil().emit(player.socket, "OpenMenu", {menuName: menuName})
            return
        }
        if(subcommand == "close") {
            if(multiplePlayers) {
                player.forEach((entity) => {
                    this.getSocketUtil().emit(entity.socket, "OpenMenu", {menuName: menuName})
                })
                return
            }
            player.getSocketUtil().emit(player.socket,"CloseMenu", {menuName: menuName})
            return
        }

        caller.showChatError("No subcommand found "+ subcommand)
    }
}

module.exports = Menu