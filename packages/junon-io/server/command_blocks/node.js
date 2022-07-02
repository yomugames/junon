const BaseTransientEntity = require("../entities/base_transient_entity")

class Node {

  // must implement
  static isValid(event) {
    throw new Error("must implement isValid")
  }

  constructor(game, data) {
    this.id = game.generateId("commandBlock")
    this.game = game
    this.commandBlock = game.sector.commandBlock

    this.registerNode()
  }

  getSocketUtil() {
    return this.game.server.socketUtil
  }

  registerNode() {
    this.commandBlock.registerNode(this)
    this.onNodeChanged()
  }

  unregisterNode() {
    this.commandBlock.unregisterNode(this)
    this.onNodeChanged()
  }

  remove() {
    let children = this.getChildren()
    while (children[0]) {
      let node = children.pop()
      node.remove()
    }

    this.unregisterNode()
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
      operation: "delete",
      id: this.id
    })
  }

  getChildren() {
    return []
  }

  onNodeChanged() {
    this.commandBlock.onNodeChanged()
  }

}

module.exports = Node
