const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const ClientHelper = require("./../util/client_helper")

class TutorialMenu extends BaseMenu {

  onMenuConstructed() {
    this.tutorialIndex = {}
    this.tutorialIndex["main"] = 0
    this.tutorialIndex["corpse"] = 0
  }

  getMaxTutorialSteps(name) {
    return Object.keys(Constants.Tutorial[name]).length
  }

  isModal() {
    return false
  }

  createTutorialCategory(name) {
    this.tutorialIndex[name] = 0
  }

  fadeIn(name) {
    let element = document.querySelector(".tutorial_text." + name)
    let fadeInTween = ClientHelper.getFadeTween(element, 0, 1, 0, 3000)
    fadeInTween.start()
  }

  onCancelBtnClick() {
    document.querySelector("#tutorial_toggle_btn").style.display = 'block'
    this.close()
  }

  update(data) {
    if (typeof this.tutorialIndex[data.name] === "undefined") {
      this.fadeIn(data.name)
    }

    this.tutorialIndex[data.name] = data.tutorialIndex
    this.updateTutorialText(data.name)

    this.hideIfComplete()
  }

  hideIfComplete() {
    if (this.isTutorialComplete()) {
      this.hide()       
    }
  }

  isTutorialComplete() {
    let content = ""
    Array.from(document.querySelectorAll(".tutorial_text")).forEach((tutorialText) => {
      content += tutorialText.innerText
    })

    return content.length === 0
  }

  open() {
    this.updateTutorialText("main")

    this.el.style.display = 'block'
  }

  hide() {
    this.cleanup()
  }

  cleanup() {
    document.getElementById("tutorial_menu").style.display = 'none'
  }

  updateTutorialText(name) {
    let index = this.tutorialIndex[name]

    if (index === -1 || index === this.getMaxTutorialSteps(name)) {
      this.el.querySelector(".tutorial_text." + name).innerText = ""
    } else {
      let text = Constants.Tutorial[name][index]
      this.el.querySelector(".tutorial_text." + name).innerText = text
    }
  }

}

module.exports = TutorialMenu