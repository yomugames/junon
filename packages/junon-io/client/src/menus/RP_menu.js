const RPItems = require("../entities/RPItems/index")
const BaseMenu = require("./base_menu");

class RPMenu extends BaseMenu {
  open() {
    super.open()

    this.render()
  }

  render() {
    let el = ""
    for (let name in RPItems) {
      let RPItemKlass = RPItems[name];
      el += this.createRPSelection(RPItemKlass)

    }
    this.el.querySelector(".product_container").innerHTML += el
  }

  createRPSelection(klass) {
    let imagePath = "/assets/images/" + klass.prototype.getSpritePath();
    const el = "<div class='food_selection' data-type='" + klass.getType() + "' data-name='" + i18n.t(klass.getTypeName()) + "' >" +
      "<img class='food_image' src='" + imagePath + "'>" +
      "</div>"

    return el
  }

}

module.exports = RPMenu