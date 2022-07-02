const BaseEntity = require("./base_entity")
const Constants = require("./../../../common/constants.json")

class Button {
  constructor(game, data) {
    this.id = data.id
    this.game = game
    this.sector = game.sector

    this.onButtonCreated()
  }

  onButtonCreated() {
    this.sector.addButton(this)
  }

  remove() {
    this.sector.removeButton(this)
  }

  syncWithServer(data) {
    this.name = data.name
    this.label = data.label
    this.description = data.description
    this.attachments = data.attachments
  }

  isAttachedTo(klassName) {
    return this.attachments[klassName]
  }

  buildHTML(entity) {
    let label = this.label || this.name

    return "<div class='ui_btn' data-name='" + this.name + "' data-description='" + this.description + "'>" + 
             label + 
             "<div class='button_tooltip'></div>" +
           "</div>"
  }

}

module.exports = Button