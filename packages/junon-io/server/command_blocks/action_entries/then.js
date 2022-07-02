const Node = require("../node")
const ActionContainer = require("../action_container")

class Then extends Node {
  constructor(parent, data) {
    super(parent.game, data)

    this.parent = parent
    this.initActionContainer(data)
  }

  forEach(cb) {
    for (var i = 0; i < this.actions.length; i++) {
      let action = this.actions[i]
      cb(action)
    }
  }

  toJson() {
    return {
      id: this.id,
      actions: this.actions.map((actionEntry) => {
        return actionEntry.toJson()
      })
    }
  }


}

Object.assign(Then.prototype, ActionContainer.prototype, {
})


module.exports = Then
