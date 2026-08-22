const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Menu extends BaseCommand {
    getUsage() {
        return [
            "Toggles a menu's visibility to players",
            "/menu close [menu] [player]",
            "/menu open [menu] [player]",
            "ex: available menu names:",
            this.getAllowedMenusToOpen().join(", ")
        ]
    }

    getAllowedMenusToOpen()
    {
        return ["blueprintMenu",
                "inventoryMenu",
                "chatMenu",
                "tradeMenu",
                "slaveTradeMenu",
                "welcomeMenu",
                "mapMenu",
                "miniMapMenu",
                "atmMenu",
                "sidebarMenu",
                "commandBlockMenu",
                "voteMenu",
                "friendsMenu",
                "badgeMenu",
                "teamMenu",
                "terminalMenu"]
    }

    getUnallowedMenusToClose()
    {
        return ["friendsMenu",
                "badgeMenu"]
    }

    allowOwnerOnly() {
        return true
    }

    perform(caller, args) {
        let subcommand = args[0]
        let menuName = args[1]
        let player = args[2]
        let multiplePlayers
        // if(!caller || !caller.isPlayer()) return

        if(player) {
            player = this.getPlayersBySelector(player)
            multiplePlayers = true
        } else {
            player = caller
        }

        if(subcommand == "open") {
            // only check allowed menus here
            // since player shouldn't have entity-dependent menus open with this cmd
            // but should be able to have them closed
            let allowedMenus = this.getAllowedMenusToOpen()
            if(allowedMenus.indexOf(menuName) === -1)
            {
                caller.showChatError("Menu invalid or unallowed: " + menuName)
                return
            }

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
            let disallowedMenus = this.getUnallowedMenusToClose()
            if(disallowedMenus.indexOf(menuName) !== -1)
            {
                caller.showChatError("Menu invalid or unallowed: " + menuName)
                return
            }
            if(multiplePlayers) {
                player.forEach((entity) => {
                    this.getSocketUtil().emit(entity.socket, "CloseMenu", {menuName: menuName})
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
