const ActionContainer = () => {
}

ActionContainer.prototype = {
  initActionContainer(data) {
    this.actions = []
    this.parseActions(data.actions) 
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

  parseActions(actions) {
    if (!actions) return

    for (var i = 0; i < actions.length; i++) {
      let action = actions[i]
      this.commandBlock.getActionEntryFor(action.actionKey).build(this, action)
    }
  },

  createActionEntry(actionKey) {
    let actionEntry = this.commandBlock.getActionEntryFor(actionKey).build(this, { actionKey: actionKey }, false)
    actionEntry.submitSave()
  },

  hasActionEntry(name) {
    return this.actions.find((action) => {
      return action.actionKey === name
    })
  }
}
  


module.exports = ActionContainer