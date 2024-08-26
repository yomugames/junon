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
      player.sector.commandBlock.sendTempData(data)
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
  sendTempData(data) {
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "TempCommandBlockData", {
      operation: data.operation,
      value: data.value,
      tempId: data.tempId,
      parentId: data.parentId,
      type: data.type
    })
  }
  /*EditCommandBlock {
  operation: 'add',
  value: 'PlayerJoined',
  tempId: 'temp-cfeefdb8-c949-448f-a005-d86d79608476',
  parentId: 0,
  type: 'Trigger'
}
EditCommandBlock {
  operation: 'add',
  value: 'ifthenelse',
  tempId: 'temp-46b487cb-fd92-4579-bfe7-935a8aecda74',
  parentId: 1,
  type: 'ActionEntry'
}
EditCommandBlock {
  operation: 'add',
  value: 'if',
  tempId: 'temp-ff99d791-b52a-458c-9e5a-baa5b06d5771',
  parentId: 2,
  type: 'if'
}
EditCommandBlock {
  operation: 'add',
  value: 'else',
  tempId: 'temp-2e8b282c-5de4-4076-ad43-a804cfc34e77',
  parentId: 2,
  type: 'else'
}
EditCommandBlock {
  operation: 'add',
  value: 'then',
  tempId: 'temp-13b3e7c7-399e-456d-9076-7baf385c8ef3',
  parentId: 2,
  type: 'then'
}
EditCommandBlock {
  operation: 'add',
  tempId: 'temp-089c09e4-d72f-4e61-a3a8-1846f44c5fca',
  parentId: 3
}
EditCommandBlock {
  operation: 'add',
  value: 'commands',
  tempId: 'temp-d090b4e1-9cac-40be-9e9e-07ac274dbc28',
  parentId: 1,
  type: 'ActionEntry'
}
EditCommandBlock {
  operation: 'add',
  value: 'timer',
  tempId: 'temp-81cac2d0-259a-4489-9ea8-130804ef37b1',
  parentId: 1,
  type: 'ActionEntry'
}*/
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
