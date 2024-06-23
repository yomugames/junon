const Node = require("../node")
const Comparison = require("../comparison")

class If extends Node {
  constructor(parent, data) {
    super(parent.game, data)

    this.parent = parent

    this.parseData(data)
  }

  parseData(data) {
    this.conditions = []

    if (data.conditions) {
      for (var i = 0; i < data.conditions.length; i++) {
        let condition = data.conditions[i]
        if (condition.comparison) {
          new Comparison(this, condition.comparison)
        }
      }
    }
  }

  getChildren() {
    return this.conditions
  }

  forEach(cb) {
    for (var i = 0; i < this.conditions.length; i++) {
      let condition = this.conditions[i]
      let data = {}
      data[condition.getConditionType()] = condition
      cb(data)
    }
  }

  addCondition(condition) {
    this.conditions.push(condition)
  }

  removeCondition(condition) {
    let index = this.conditions.indexOf(condition)
    if (index !== -1) {
      this.conditions.splice(index, 1)
    }
  }

  addChildNode(data, player) {
    let node = new Comparison(this, data)

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

  toJson() {
    return {
      id: this.id,
      conditions: this.conditions.map((condition) => {
        return condition.toJson()
      })
    }
  }

}

module.exports = If
