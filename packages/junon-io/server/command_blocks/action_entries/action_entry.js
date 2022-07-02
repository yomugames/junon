const Node = require("../node")

class ActionEntry extends Node {
  static build(parent, data) {
    return this.create(parent, data)
  }

  static create(parent, data) {
    throw new Error("must implement ActionEntry.create")
  }

  static isValid(parent, actionKey) {
    throw new Error("must implement ActionEntry.isValid")
  }

  constructor(parent, data) {
    super(parent.game, data)

    this.parent = parent

    this.actionKey = data.actionKey

    this.handleActionValues(data)

    this.parent.addAction(this)
  }

  handleActionValues(data) {
    throw new Error("must implement handleActionValues")
  }

  editChildNode(data) {

  }

  remove() {
    this.parent.removeAction(this)
    super.remove()
  }


}

module.exports = ActionEntry
