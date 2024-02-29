const BaseCommand = require("./base_command")

class SetStatus extends BaseCommand {
    getUsage() {
        return [
            "Sets this sector's visibility to public or private",
            "/setstatus [public/private]"
        ]
    }

    allowOwnerOnly() {
        return true
    }

    perform(caller, args) {
        let status = args[0]

        if(!caller || !caller.isPlayer()) return

        if(status == "public") {
            caller.sector.setIsPrivate(false)
            caller.showChatSuccess("Sector set to public.")
        }

        if(status == "private") {
            caller.sector.setIsPrivate(true)
            caller.showChatSuccess("Sector set to private.")
        }
    }
}

module.exports = SetStatus