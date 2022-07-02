const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")

class SignMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".edit_sign_message_btn").addEventListener("click", this.onEditSignMessageBtnClick.bind(this))
    this.el.querySelector(".sign_message_input").addEventListener("blur", this.onSignMessageInputBlur.bind(this))
    this.el.querySelector(".sign_message_input").addEventListener("keyup", this.onSignMessageInputKeyup.bind(this))

    this.el.querySelector(".cancel_sign_edit_btn").addEventListener("click", this.onCancelSignEditBtnClick.bind(this))
    this.el.querySelector(".done_sign_edit_btn").addEventListener("click", this.onDoneSignEditBtnClick.bind(this))
  }

  open(options = {}) {
    super.open(options)

    this.hideSignMessageInput()

    this.entity = options.entity
    this.render(this.entity)
  }

  onSignMessageInputBlur(e) {
  }

  onSignMessageInputKeyup(e) {

  }

  onCancelSignEditBtnClick() {
    this.hideSignMessageInput()
  }

  onDoneSignEditBtnClick() {
    let text = this.el.querySelector(".sign_message_input").value
    this.setSignMessage(text)
    this.hideSignMessageInput()
  }

  hideSignMessageInput() {
    this.el.querySelector(".sign_message_input").style.display = 'none'
    this.el.querySelector(".sign_message").style.display = 'block'

    this.el.querySelector(".edit_sign_message_btn").style.display = 'inline-block'
    this.el.querySelector(".cancel_sign_edit_btn").style.display = 'none'
    this.el.querySelector(".done_sign_edit_btn").style.display = 'none'
  }

  showSignMessageInput() {
    this.el.querySelector(".sign_message_input").style.display = 'block'
    this.el.querySelector(".sign_message_input").value = this.signText
    this.el.querySelector(".sign_message").style.display = 'none'

    this.el.querySelector(".edit_sign_message_btn").style.display = 'none'
    this.el.querySelector(".cancel_sign_edit_btn").style.display = 'inline-block'
    this.el.querySelector(".done_sign_edit_btn").style.display = 'inline-block'
  }

  render(sign) {
    this.signText = sign.getText()

    if (this.signText.length === 0) {
      this.el.querySelector(".sign_message").innerText = "(Empty)"
    } else {
      this.el.querySelector(".sign_message").innerText = this.signText
    }
    
  }

  onEditSignMessageBtnClick() {
    this.showSignMessageInput()
  }

  setSignMessage(text) {
    SocketUtil.emit("EditBuilding", { id: this.entity.id, content: text })
  }


}



module.exports = SignMenu 