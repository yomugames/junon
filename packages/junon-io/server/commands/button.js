const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const EntityGroup = require("./../entities/entity_group")
const Helper = require("../../common/helper")
const Mobs = require("../entities/mobs/index")
const Buildings = require("../entities/buildings/index")
const Button = require("../entities/button")

class ButtonCommand extends BaseCommand {

  getUsage() {
    return [
      "Attaches an interactive button to a player, mob, or building",
      "/button list",
      "/button add [name]",
      "/button remove [name]",
      "/button show [name]",
      "/button rename [name] [newname]",
      "/button describe [name] [description]",
      "/button attach [name] [player|entity_type|entity_id]",
      "/button dettach [name] [player|entity_type|entity_id]",
      "ex: /button add Hug",
      "/button attach Hug kuroro",
    ]
  }

  /*
    /button list
    Upgrade (attached to: Wall, MiniTurret)
    Sell (attached to: Wall, MiniTurret)

    /button set Upgrade "wer"
    /button remove Sell
    /button attach MiniTurret

    onButtonClick
      buttonName === 'Upgrade'
      entityType === MiniTurret
      level === 0
      /stat {entityId} damage:*2 range:+128

    individual stat of tower..
  */

  allowOwnerOnly() {
    return true
  }

  cleanName(text) {
    let newText = this.game.sanitize(text)
    return newText.substring(0,50)
  }

  cleanDescription(text) {
    let newText = this.game.sanitize(text)
    return newText.substring(0,300)
  }

  perform(caller, args) {
    let buttonName
    let button
    let type
    let klassName
    let entityById
    let playerByName

    let subcommand = args[0]

    switch(subcommand) {
      case "list":
        let buttonNames = Object.keys(this.sector.buttons)
        if (buttonNames.length === 0) {
          caller.showChatSuccess("No buttons")
        } else {
          caller.showChatSuccess(buttonNames.join(", "))
        }
        break
      case "add":
        buttonName = this.cleanName(args[1])

        if (this.sector.getButton(buttonName)) {
          caller.showChatError("button already exists")
          return
        }

        new Button(this.sector, { name: buttonName })
        caller.showChatSuccess(`button ${buttonName} created`)
        break
      case "show":
        buttonName = this.cleanName(args[1])
        button = this.sector.getButton(buttonName)
        if (button) {
          caller.showChatSuccess(button.prettyPrint())
        }
        break
      case "remove":
        buttonName = this.cleanName(args[1])
        button = this.sector.getButton(buttonName)
        if (button) {
          button.remove()
          caller.showChatSuccess(`button ${buttonName} deleted`)
        }
        break
      case "rename":
        buttonName = this.cleanName(args[1])
        button = this.sector.getButton(buttonName)
        if (!button) {
          caller.showChatError(`button ${buttonName} not found`)
          return
        }

        let newButtonName = this.cleanName(args[2])
        if (this.sector.getButton(newButtonName)) {
          caller.showChatError(`button named ${newButtonName} already exists`)
          return
        }
        button.rename(newButtonName)
        caller.showChatSuccess("button renamed from " + button.name + " to " + newButtonName)

        break
      case "label":
        buttonName = this.cleanName(args[1])
        let label = this.cleanName(args[2])
        button = this.sector.getButton(buttonName)
        if (!button) {
          caller.showChatError(`button ${buttonName} not found`)
          return
        }

        button.setLabel(label)
        caller.showChatSuccess(`button ${buttonName} labelled ${label}`)
        break
      case "describe":
        buttonName = this.cleanName(args[1])
        let description = this.cleanDescription(args.slice(2).join(" "))
        button = this.sector.getButton(buttonName)
        if (!button) {
          caller.showChatError(`button ${buttonName} not found`)
          return
        }

        button.setDescription(description)
        caller.showChatSuccess(`button ${buttonName} description is ${description}`)
        break
      case "attach":
        buttonName = this.cleanName(args[1])
        button = this.sector.getButton(buttonName)
        if (!button) {
          caller.showChatError(`button ${buttonName} not found`)
          return
        }

        type = this.cleanName(args[2])
        klassName = this.sector.klassifySnakeCase(type)
        entityById = this.game.getEntityByNameOrId(args[2])
        if (!Mobs[klassName] && !Buildings[klassName] && !entityById) {
          caller.showChatError(`invalid entity ${args[2]} `)
          return
        }

        if (Mobs[klassName] || Buildings[klassName]) {
        button.attach(klassName)
        } else {
        button.attach(args[2])
        }
        caller.showChatSuccess(`${buttonName} attached to ${args[2]}`)
        break
      case "detach":
        buttonName = this.cleanName(args[1])
        button = this.sector.getButton(buttonName)
        if (!button) {
          caller.showChatError(`button ${buttonName} not found`)
          return
        }

        type = this.cleanName(args[2])
        klassName = this.sector.klassifySnakeCase(type)
        entityById = this.game.getEntityByNameOrId(args[2])
        if (!Mobs[klassName] && !Buildings[klassName] && !entityById) {
          caller.showChatError(`invalid entity ${args[2]} `)
          return
        }

        if (Mobs[klassName] || Buildings[klassName]) {
        button.detach(klassName)
        } else {
        button.detach(args[2])
        }
        caller.showChatSuccess(`${buttonName} dettached from ${args[2]}`)
        break
      default:
        caller.showChatError("No such subcommand /button " + subcommand)
        break
    }
    
  }


}

module.exports = ButtonCommand