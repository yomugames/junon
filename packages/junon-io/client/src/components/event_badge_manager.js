const ClientHelper = require("../util/client_helper")
const Config = require('junon-common/config')
class EventBadgeManager {
    constructor(main) {
        this.main = main
        this.game = main.game
        this.menuEl = document.querySelector("#event_manager_container")
        this.initListeners()
    }

    initListeners() {
        document.querySelector("#badge_submit").addEventListener("click", this.onSubmitBtnClicked.bind(this))
        this.menuEl.querySelector(".cancel_btn").addEventListener("click", this.close.bind(this))
    }

    async onSubmitBtnClicked() {
        const url = Config[env].matchmakerUrl + "give_badge"
        const username = this.menuEl.querySelector("#badge_username_field").value
        if(!username) return
        const idToken = await this.main.getFirebaseIdToken()

        const data = {
            idToken: idToken,
            username: username
        }

        ClientHelper.httpPost(url, data, {
            success: (result) => {
                try {
                    let data = JSON.parse(result)
                    if(data.error) {
                        this.menuEl.querySelector("#event_badge_menu_info").innerText = data.error
                        return
                    }
                    if(data.success) {
                        this.menuEl.querySelector("#event_badge_menu_info").innerText = data.success
                    }
                } catch(e) {
                    this.menuEl.querySelector("#event_badge_menu_info").innerText = "Error."
                }
            }
        })
    }

    open() {
        document.querySelector("#event_manager_container").style.display = "block"
    }
    close() {
        document.querySelector("#event_manager_container").style.display = "none"
    }
}

module.exports = EventBadgeManager