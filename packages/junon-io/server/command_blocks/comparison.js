const Node = require("./node")

class Comparison extends Node {
  constructor(parent, data) {
    super(parent.game, data)

    this.parent = parent
    this.parent.addCondition(this)

    this.parseData(data)
  }

  parseData(data) {
    this.value1 = data.value1 || ""
    this.operator = data.operator || "=="
    this.value2 = data.value2 || ""
  }

  getChildren() {
    return []
  }

  getConditionType() {
    return "comparison"
  }

  edit(text, player) {
    let key = text.split(":")[0]
    let value = text.split(":")[1]

    if (key === 'value1') {
      this.value1 = value
      this.onValueChanged(key, value)
    }

    if (key === 'operator') {
      let operators = ["==", "!=", ">", "<", ">=", "<=", "=~"]
      if (operators.indexOf(value) !== -1) {
        this.operator = value
        this.onValueChanged(key, value)
      }
    }

    if (key === 'value2') {
      this.value2 = value
      this.onValueChanged(key, value)
    }

  }

  onValueChanged(key, value) {
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
      operation: "edit",
      id: this.id,
      value: [key, value].join(":")
    })

    this.onNodeChanged()
  }

  remove() {
    this.parent.removeCondition(this)
    super.remove()
  }

  toJson() {
    return {
      comparison: {
        id: this.id,
        value1: this.value1,
        operator: this.operator,
        value2: this.value2
      }
    }
  }
}

module.exports = Comparison
