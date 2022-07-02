const Constants = require('../../common/constants.json')
const BaseTransientEntity = require("./base_transient_entity")

class Button extends BaseTransientEntity {
  constructor(sector, data = {}) {
    super(sector.game)
    this.sector = sector

    this.applyData(data)

    this.register()
    this.onStateChanged()
  }

  register() {
    this.sector.addButton(this)
  }

  applyData(data) {
    this.name = data.name
    this.label = data.label
    this.description = data.description
    this.attachments = {}
  }

  setLabel(label) {
    this.label = label
    this.onStateChanged()
  }

  setDescription(description) {
    this.description = description
    this.onStateChanged()
  }

  rename(newName) {
    this.name = newName
    this.onStateChanged()
  }

  attach(typeName) {
    this.attachments[typeName] = true
    this.onStateChanged()
  }

  detach(typeName) {
    delete this.attachments[typeName]
    this.onStateChanged()
  }

  onStateChanged() {
    this.game.forEachPlayer((player) => {
      this.getSocketUtil().emit(player.getSocket(), "ButtonUpdated", { button: this })
    })
  }

  remove() {
    super.remove()

    this.sector.removeButton(this)
    this.clientMustDelete = true
    this.onStateChanged()
  }

  prettyPrint() {
    let result = ""
    let keys = ['name', 'label', 'description']
    keys.forEach((key) => {
      let value = this[key]
      if (value) {
        result += `${key}: ${value} `
      }
    })

    let attachments = Object.keys(this.attachments).join(",")
    result += `attachments: ${attachments}`
    return result
  }

}

module.exports = Button
