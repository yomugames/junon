const ClientHelper = require("../util/client_helper")
const KeyboardMap = require("../entities/keyboard_map")
const Cookies = require("js-cookie")
const Constants = require("./../../../common/constants.json")
const Helper = require("./../../../common/helper")
const Config = require("junon-common/config")

class BanManager {
  constructor(main) {
    this.main = main
    this.game = main.game

    this.initListeners()
  }

  initListeners() {
    document.querySelector(".global_ban_btn").addEventListener("click", this.onGlobalBanBtnClick.bind(this))
    document.querySelector("#ban_manager_container .cancel_btn").addEventListener("click", this.onCancelClick.bind(this))
  }

  async onGlobalBanBtnClick(e) {
    let username = document.querySelector(".ban_user_form .ban_username input").value
    let dayCount = document.querySelector(".ban_user_form .ban_duration input").value
    let reason   = document.querySelector(".ban_user_form .ban_reason input").value
    let idToken = await this.main.getFirebaseIdToken()

    let data = {
      idToken: idToken,
      username: username,
      dayCount: dayCount,
      reason: reason
    }

    let url = Config[env].matchmakerUrl + "create_ban" 

    ClientHelper.httpPost(url, data, {
      success: (result) => {
        try {
          let data = JSON.parse(result)
          if (data.error) {
            document.querySelector(".ban_status_message").innerText = data.error
            return
          }
          if (data.success) {
            document.querySelector(".ban_status_message").innerText = data.success
          }
        } catch(e) {
          document.querySelector(".ban_status_message").innerText = "Ban error"
        }
      },
      error: () => {
        document.querySelector(".ban_status_message").innerText = "Ban error"
      }
    })

  }

  async open(options = {}) {
    if (!this.main.isLoggedIn()) return

    this.show()

    let idToken = await this.main.getFirebaseIdToken()

    let url = Config[env].matchmakerUrl + "bans?idToken=" + idToken + "&uid=" + this.main.uid

    ClientHelper.httpRequest(url, {
      success: (data) => {
        try {
          let result = JSON.parse(data)
          this.renderBans(result)
        } catch(e) {
          alert("Error fetching bans")
        }
      },
      error: (data) => {
        alert("Error fetching bans")
      }
    })

  }

  renderBans(result) {
    if (result.error) {
      document.querySelector(".ban_status_message").innerText = "Unauthorized"
      return
    }

    document.querySelector(".ban_status_message").innerText = ""

    if (result.success) {
      let ipBanList = result.success
      let el = ""

      for (var i = 0; i < ipBanList.length; i++) {
        let ipBan = ipBanList[i]
        el += this.createIpBanEl(ipBan)
      }

      document.querySelector(".global_ban_list_body").innerHTML = el
    }
  }

  createIpBanEl(ipBan) {
    let date = new Date(ipBan.createdAt)
    let formattedDate = (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear()
    if (ipBan.createdAt === null) {
      formattedDate = ""
    }

    return "<div class='ip_ban_row' data-ip='" + ipBan.ip + "''>" + 
      "<div class='ip_ban_col ip_ban_username'>" + (ipBan.username || ipBan.ip) + "</div>" +
      "<div class='ip_ban_col ip_ban_daycount'>" + (ipBan.dayCount || "") + "</div>" +
      "<div class='ip_ban_col ip_ban_reason'>" + (ipBan.reason || "") + "</div>" +
      "<div class='ip_ban_col ip_ban_date'>" + formattedDate + "</div>" +
    "</div>"
  }

  show() {
    document.querySelector("#ban_manager_container").style.display = 'block'
  }

  hide() {
    document.querySelector("#ban_manager_container").style.display = 'none'
  }

  onCancelClick() {
    this.hide()
  }

}

module.exports = BanManager
