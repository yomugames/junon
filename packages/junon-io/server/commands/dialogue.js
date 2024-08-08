const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class Dialogue extends BaseCommand {

  getUsage() {
    return [
      "/dialogue list",
      "/dialogue assign [entity_id] [text]",
      "/dialogue remove [entity_id]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  isNonSandboxCommand() {
    return true
  }

  perform(player, args) {
    let subcommand = args[0]
    let text
    let entityId

    switch(subcommand) {
      case "list":
        let dialogues = this.game.getDialogueList()
        if (dialogues.length === 0) {
          player.showChatSuccess("No dialogues")
        } else {
          let englishDialogues = dialogues.map((dialogue) => {
            return dialogue.en
          })
          player.showChatSuccess(englishDialogues.join(", "))
        }
        break
      case "remove":
        entityId = args[1]
        this.game.removeDialogue(entityId)
        break
      case "assign":
        entityId = args[1]
        let entity = this.game.getEntity(entityId)
        if (!entity) {
          player.showChatError("No such mob id: " + entityId)
          return
        }

        if (!entity.isMob()) {
          player.showChatError("Not a mob: " + entityId)
          return
        }

        text = args.slice(2).join(" ")

        if (this.isJson(text)) {
          let json = JSON.parse(text)
          this.game.assignDialogue(entityId, json.text, { locale: json.locale })
        } else {
          this.game.assignDialogue(entityId, text)
        }

        break
      default:
        player.showChatError("No such subcommand /dialogue " + subcommand)
    }


  }

}

module.exports = Dialogue
