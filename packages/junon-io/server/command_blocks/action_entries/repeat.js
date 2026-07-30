const ActionEntry = require("./action_entry")
const ActionContainer = require("../action_container")

class Repeat extends ActionEntry {

  constructor(parent, data) {
    super(parent, data)
    console.log("SERVER Repeat created", data)
  }

  static create(parent, data) {
    if (!this.isValid(parent, data.actionKey)) return

    return new Repeat(parent, data)
  }

  static isValid(parent, actionKey) {
    return true
  }

  handleActionValues(data) {
    /*this.times = data.times || 1*/
    this.times = 5

    this.initActionContainer(data)
  }

  editChildNode(data) {

  }

  toJson() {
    console.log("Repeat.toJson()",this.times) //Temporary
    return {
      id: this.id,
      actionKey: this.actionKey,
      times: this.times,
      actions: this.actions.map((actionEntry) => {
        return actionEntry.toJson()
      })
    }
  }

}

Object.assign(Repeat.prototype, ActionContainer.prototype, {
})

module.exports = Repeat