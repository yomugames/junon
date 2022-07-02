const Command = require("./command")
const Trigger = require("./trigger")
const ActionEntries = require("./action_entries/index")

class CommandBlock {

  constructor(sector) {
    this.game = sector.game
    this.sector = sector

    this.triggers = []
    this.nodes = {}
    this.isEnabled = true
  }

  getSocketUtil() {
    return this.game.server.socketUtil
  }

  applyData(json) {
    this.isEnabled = json.isEnabled
    this.parseTriggers(json.triggers)
  }

  getActionEntryFor(actionKey) {
    return ActionEntries.forType(actionKey)
  }

  hasTrigger(name) {
    return this.triggers.find((trigger) => {
      return trigger.event === name
    })
  }

  parseTriggers(triggers) {
    for (var i = 0; i < triggers.length; i++) {
      let trigger = triggers[i]
      triggers[i] = new Trigger(this, trigger)
    }
  }

  addTrigger(trigger) {
    this.triggers.push(trigger)
  }

  removeTrigger(trigger) {
    let index = this.triggers.indexOf(trigger)
    if (index !== -1) {
      this.triggers.splice(index, 1)
    }
  }

  createTrigger(data, player) {
    let trigger = Trigger.create(this, { event: data.value })

    if (trigger) {
      this.getSocketUtil().broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
        id: trigger.id,
        operation: "add",
        value: trigger.event,
        tempId: data.tempId
      })
    }
  }

  edit(data, player) {
    if (data.operation === 'enable') {
      this.isEnabled = data.value === 'true'
      this.onEnabledChanged()
    } else if (data.operation === 'add') {
      if (data.parentId === 0 && data.type === "Trigger") {
        this.createTrigger(data, player)
      } else {
        let node = this.getNode(data.parentId)
        if (node) {
          node.addChildNode(data, player)
        }
      }
    } else if (data.operation === 'edit') {
      let targetNode = this.getNode(data.id)
      if (targetNode) {
        targetNode.edit(data.value, player)
      }
    } else if (data.operation === 'delete') {
      let targetNode = this.getNode(data.id)
      if (targetNode) {
        targetNode.remove()
      }
    }
  }

  onEnabledChanged() {
    if (this.isEnabled) {
      this.sector.importCommandBlockToEventHandler()
    } else {
      this.sector.removeEventHandlerTriggers()
    }

    this.getSocketUtil().broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
      operation: "enable",
      value: this.isEnabled ? "true" : "false"
    })
  }

  onNodeChanged() {
    this.sector.importCommandBlockToEventHandler()
  }

  getNode(id) {
    return this.nodes[id]
  }

  registerNode(node) {
    this.nodes[node.id] = node
  }

  unregisterNode(node) {
    delete this.nodes[node.id]
  }

  toJson() {
    return {
      isEnabled: this.isEnabled,
      triggers: this.triggers.map((trigger) => {
        return trigger.toJson()
      })
    }
  }

}

module.exports = CommandBlock
