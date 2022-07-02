const ColorPickerMenu = require("./color_picker_menu")

class SuitColorMenu extends ColorPickerMenu {
  getEntityTypeName() {
    return "Suit"
  }
}

module.exports = SuitColorMenu 
