const Dirt = require("../../client/src/entities/effects/dirt")
const BaseCommand = require("./base_command")

class DirtCommand extends BaseCommand {
    getUsage() {
        return [
            "/dirt add [entity_id]",
            "/dirt clear [entity_id]",
            "/dirt decrease [entity_id]"
        ]
    }
    allowOwnerOnly() {
        return true
    }

    perform(caller, args) {
        let subcommand = args[0]
        let entities = this.getEntitiesBySelector(args[1])

        if(entities.length == 0) return

        for (let entity in entities) {

            if(!entities[entity].isPlatformDirtiable()) continue

            if(subcommand == "add") {
                    entities[entity].addDirt()
            } else if (subcommand == "clear") {
                entities[entity].removeDirt()
            } else if (subcommand == "decrease") {
                entities[entity].reduceDirt()
            }
        }
        

    }
}
module.exports = DirtCommand