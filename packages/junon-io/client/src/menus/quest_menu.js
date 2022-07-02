const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const ClientHelper = require("./../util/client_helper")

class QuestMenu extends BaseMenu {

  onMenuConstructed() {
    this.objectives = {}
  }

  isModal() {
    return false
  }

  setObjectives(objectives) {
    for (let name in objectives) {
      let objective = objectives[name]
      this.objectives[name] = objective
    }

    this.renderObjectives()
  }

  update(data) {
    if (data.isCompleted) {
      if (this.objectives[data.name]) {
        this.objectives[data.name].isCompleted = true
      }
    } else {
      this.objectives[data.name] = data
    }

    this.renderObjectives()
  }

  open() {
    this.el.style.display = 'block'
  }

  renderObjectives() {
    let el = ""

    for (let id in this.objectives) {
      let quest = this.objectives[id]  
      let description = quest.description
      if (quest.translations[window.language]) {
        description = quest.translations[window.language]
      }

      el += this.createQuestEl(id, description, quest.isCompleted)
    }

    this.el.querySelector(".quest_list").innerHTML = el

    if (Object.keys(this.objectives).length > 0) {
      this.open()
    }
  }

  createQuestEl(id, text, isCompleted) {
    let statusKlass = ""

    if (isCompleted) {
      statusKlass = "completed"
    }

    return "<div class='quest_row custom_checkbox_container " + statusKlass + "' data-id='" + id + "'>" + 
      "<input type='checkbox'>" +
      "<span class='checkmark'></span>" +
      "<div class='quest_label'>" + text + "</div>" +
    "</div>"
  }

  hide() {
    this.cleanup()
  }

  cleanup() {
    this.el.querySelector(".quest_list").innerHTML = ""
    document.querySelector("#quest_menu").style.display = 'none'
    this.objectives = {}
  }

}

module.exports = QuestMenu