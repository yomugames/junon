const BaseCommand = require("./base_command")

class Blood extends BaseCommand {
    getUseage() {
        return [
            "/blood add [entity_id]",
            "/blood decrease [entity_id]"
        ]
    }
    allowOwnerOnly() {
        return true
    }

    perform (caller, args) {
        let subcommand = args[0]
        if(!args[1]) return

        
        let entities = this.getEntitiesBySelector(args[1])


        if(entities.length == 0) return

        for(let entity in entities) {
            // assuming dirty platforms can also be bloody
            if(!entities[entity].isPlatformDirtiable()) continue

            if(subcommand == "add") {
                entities[entity].addBlood()
            } else if (subcommand == "decrease") {
                entities[entity].clean()
            } else {
                caller.showChatError(`Subcommand ${subcommand} not found`)
                return
            }
        }
    }
}
module.exports = Blood