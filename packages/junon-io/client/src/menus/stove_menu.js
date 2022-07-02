const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Item = require("./../entities/item")
const Foods = require("./../entities/foods/index")
const Equipments = require("./../entities/equipments/index")
const Helper = require("./../../../common/helper")

/*
    while element references only inventory, it actually changes hotbar/quick_inventory as well
*/
class StoveMenu extends BaseMenu {
  onMenuConstructed() {
    this.el.querySelector(".food_selection_container").addEventListener("click", this.onFoodSelectionClick.bind(this) , true)

    this.progressBar = this.el.querySelector(".stove_progress_bar_fill")

    this.el.querySelector(".cook_btn").addEventListener("click", this.onCookBtnClick.bind(this) , true)
  }

  onCookBtnClick(e) {
    if (this.disabled) return
    SocketUtil.emit("InteractTarget", { id: this.entity.id })
  }

  onUsageChanged(usage) {
    let progressWidth = (usage / 100) * this.getProgressMaxWidth()
    this.progressBar.style.width = progressWidth + "px"
  }

  getProgressMaxWidth() {
    return 150
  }

  onFoodSelectionClick(e) {
    let el = e.target.closest(".food_selection")
    if (!el) return

    this.changeFoodSelection(el.dataset.type)
  }

  selectFood(el) {
    let selectedItem = this.el.querySelector(".food_selection.selected")
    if (selectedItem) {
      selectedItem.classList.remove("selected")
    }

    el.classList.add("selected")
  }

  changeFoodSelection(type) {
    SocketUtil.emit("EditBuilding", { id: this.entity.id, content: type })
  }

  open(options = {}) {
    super.open()

    this.disabled = options.disabled
    this.entity = options.entity
    this.render()
  }

  render() {
    if (!this.entity) return

    if (this.disabled) {
      this.el.querySelector(".stove_status_message").innerText = this.disabled
      this.el.querySelector(".stove_progress_bar").style.display = 'none'
    } else {
      this.el.querySelector(".stove_status_message").innerText = ""
      this.el.querySelector(".stove_progress_bar").style.display = 'inline-block'
    }

    this.renderFoodSelection()
    this.renderSelected()
  }

  renderFoodSelection() {
    let el = ""
    for (let name in Foods.Cooked) {
      let foodKlass = Foods.Cooked[name]
      if (foodKlass.prototype.hasRequirements()) {
        el += this.createFoodSelection(foodKlass)
      }
    }

    this.el.querySelector(".food_selection_container").innerHTML = el
  }

  renderSelected() {
    if (!this.entity) return
      
    let type = this.entity.content
    if (!type) return

    let foodSelection = this.el.querySelector(".food_selection[data-type='" + type + "']") 
    if (foodSelection) {
      this.el.querySelector(".food_selection_name").innerText = foodSelection.dataset.name
      this.selectFood(foodSelection)

      this.clearRequirements()

      const requirements = Item.getCraftRequirements(type, this.game.player)
      requirements.forEach((requirement) => {
        let row = this.createRequirementRow(requirement)
        this.el.querySelector(".crafting_requirements").innerHTML += row
      })

      if (this.disabled || (this.hasMissingRequirements(requirements))) {
        this.el.querySelector(".cook_btn").dataset.disabled = true
      } else {
        this.el.querySelector(".cook_btn").dataset.disabled = ""
      }

    }
  }

  createFoodSelection(klass) {
    let imagePath = "/assets/images/" + klass.prototype.getSpritePath()

    const el = "<div class='food_selection' data-type='" + klass.getType() + "' data-name='" + i18n.t(klass.getTypeName()) + "' >" +
                    "<img class='food_image' src='" + imagePath + "'>" +
                "</div>"

    return el
  }

}

module.exports = StoveMenu