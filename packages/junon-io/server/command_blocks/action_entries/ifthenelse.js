const ActionEntry = require("./action_entry")
const If = require('./if')
const Else = require('./else')
const Then = require('./then')

class IfThenElse extends ActionEntry {
  static create(parent, data) {
    if (!this.isValid(parent, data.actionKey)) return

    return new IfThenElse(parent, data)
  }

  static isValid(parent, actionKey) {
    return true
  }

  handleActionValues(data) {
    this.ifthenelse = {
      if: null,
      else: null,
      then: null
    }

    if (data.ifthenelse) {
      this.ifthenelse.if = new If(this, data.ifthenelse.if)
      this.ifthenelse.then = new Then(this, data.ifthenelse.then)
      this.ifthenelse.else = new Else(this, data.ifthenelse.else)
    }
  }

  addChildNode(data, player) {
    let node
    if (data.type === 'if') {
      node = new If(this, data)
      this.ifthenelse.if = node
    } else if (data.type === 'else') {
      node = new Else(this, data)
      this.ifthenelse.else = node
    } else if (data.type === 'then') {
      node = new Then(this, data)
      this.ifthenelse.then = node
    }

    if (node) {
      this.getSocketUtil().broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
        id: node.id,
        operation: "add",
        value: "",
        tempId: data.tempId,
        parentId: data.parentId
      })
    }
  }

  editChildNode(data) {

  }

  getChildren() {
    return [this.ifthenelse.if, this.ifthenelse.then, this.ifthenelse.else]
  }

  toJson() {
    return {
      id: this.id,
      actionKey: this.actionKey,
      ifthenelse: {
        if: this.ifthenelse.if.toJson(),
        then: this.ifthenelse.then.toJson(),
        else: this.ifthenelse.else.toJson()
      }
    }
  }


}

module.exports = IfThenElse
