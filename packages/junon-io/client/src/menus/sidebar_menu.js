const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const ClientHelper = require("./../util/client_helper")

class SidebarMenu extends BaseMenu {
  onMenuConstructed() {
    this.rows = []
  }

  initListeners() {
    super.initListeners()

  }

  open(options = {}) {
    this.el.style.display = 'block'
  }

  close() {
    this.el.style.display = 'none'
  }

  setVisible(isVisible) {
  }

  setRowText(row, text) {
    this.rows[row] = text

    this.onTextUpdated()
    if (this.isEmpty()) {
      this.close()
    } else {
      this.open()
    }
  }

  isEmpty() {
    let result = true

    for (let row in this.rows) {
      let text = this.rows[row]
      if (text && text.length > 0) {
        result = false
        break
      }
    }

    return result
  }

  onTextUpdated() {
    this.el.querySelector(".sidebar_text").innerHTML = this.buildSidebarText()
  }

  buildSidebarText() {
    let maxRows = 15

    let result = "<ul>"
    for (var i = 0; i < maxRows; i++) {
      let text = this.rows[i]
      if (!text) {
        result += "<li></li>"
      } else {
        result = result + "<li>" + this.buildTextEl(text) + "</li>"
      }
    }

    result += "</ul>"

    return result
  }

  buildTextEl(text) {
    const htmlSafeText = ClientHelper.escapeHTML(text)
    let characters = htmlSafeText.split('')
    let result = ""
    let buffer = ""
    let isTagOpen = false

    for (var i = 0; i < characters.length; i++) {
      let char = characters[i]
      if (char === '§') {
        if (isTagOpen) {
          buffer += "</span>"
        }

        result += buffer // flush buffer
        let colorCode = characters[i + 1]
        i++
        buffer = `<span class='color_text' data-code='${colorCode}'>`
        isTagOpen = true
      } else {
        buffer += char
      }
    }

    if (buffer.length > 0) {
      result += buffer
    }
    
    return result
  }

  isModal() {
    return false
  }

  cleanup() {
    this.rows = []
    this.el.querySelector(".sidebar_text").innerHTML = ""
  }
}



module.exports = SidebarMenu 