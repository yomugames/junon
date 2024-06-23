
const ActionContainer = () => {
}

ActionContainer.prototype = {
  initActionContainer(data) {
    this.actions = []
    this.parseActions(data.actions)
  },

  hasAction(name) {
    return this.actions.find((action) => {
      return action.actionKey === name
    })
  },

  addAction(action) {
    this.actions.push(action)
  },

  removeAction(action) {
    let index = this.actions.indexOf(action)
    if (index !== -1) {
      this.actions.splice(index, 1)
    }
  },

  getChildren() {
    return this.actions
  },

  parseActions(actions) {
    if (!actions) return

    for (var i = 0; i < actions.length; i++) {
      let action = actions[i]
      let klass = this.commandBlock.getActionEntryFor(action.actionKey)
      if (klass) {
        let actionEntry = klass.build(this, action)
      }
    }
  },

  addChildNode(data, player) {
    let tempId = data.tempId
    let value = data.value
    let actionKey = value
    let actionEntry = this.commandBlock.getActionEntryFor(actionKey).build(this, { actionKey: actionKey})
    if (actionEntry) {
      this.getSocketUtil().broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
        id: actionEntry.id,
        operation: "add",
        value: actionEntry.actionKey,
        tempId: tempId,
        parentId: data.parentId
      })
    }
  }

}

module.exports = ActionContainer

