const SocketUtil = require("../../util/socket_util")

class Node {

  constructor(game, data) {
    this.game = game
    this.commandBlock = game.commandBlockMenu

    this.id = data.id || "temp-" + this.game.generateId()
    this.registerNode()
  }

  finishAdd(data) {
    this.replaceId(data.id)
  }

  appendChildEl(el) {
    this.el.appendChild(el)
  }

  repositionTooltip(el, boundingRect) {
    let tooltip = document.querySelector("#command_block_tooltip")

    const bottomMargin = 25
    let left = boundingRect.x + el.offsetWidth / 2 
    let top  = boundingRect.y - tooltip.offsetHeight  - bottomMargin
    const margin = 25

    left = Math.max(margin, left) // cant be lower than margin
    left = Math.min(window.innerWidth - tooltip.offsetWidth - margin, left) // cant be more than than margin

    if (top < margin) {
      // show at bottom instead
      top = boundingRect.y + (bottomMargin * 2)
    }
    top = Math.max(margin, top) // cant be lower than margin
    top = Math.min(window.innerHeight - tooltip.offsetHeight - margin, top) // cant be more than than margin

    tooltip.style.left = left + "px"
    tooltip.style.top  = top  + "px"
  }


  registerNode() {
    this.commandBlock.registerNode(this)
  }

  unregisterNode() {
    this.commandBlock.unregisterNode(this)
  }

  remove() {
    this.unregisterNode()
    this.el.parentElement.removeChild(this.el)
  }

  replaceId(id) {
    this.unregisterNode()
    this.id = id
    this.el.dataset.id = this.id
    this.registerNode()
  }

  submitDelete() {
    if (this.isTempId()) return

    SocketUtil.emit("EditCommandBlock", {
      operation: "delete", 
      id: this.id
    })
  }

  getNodeType() {

  }

  getNodeValue() {

  }

  getParentId() {
    return this.parent.id
  }

  submitSave() {
    let data = {
      operation: "add",
      tempId: this.id,
      parentId: this.getParentId(),
      value: this.getNodeValue(),
      type: this.getNodeType()
    }

    SocketUtil.emit("EditCommandBlock", data)
  }

  isTempId() {
    return isNaN(this.id)
  }

}

module.exports = Node