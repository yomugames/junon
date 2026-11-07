const ClientHelper = require("../util/client_helper")
const Config = require('junon-common/config')
const ModeratorGiveableBadges = require('junon-common/moderator_giveable_badges')
class EventBadgeManager {
    constructor(main) {
        this.main = main
        this.game = main.game
        this.menuEl = document.querySelector("#event_manager_container")
        this.badgeSelect = this.menuEl.querySelector("#badge_select")
        this.populateBadgeOptions()
        this.initListeners()
    }

    populateBadgeOptions() {
        const placeholder = document.createElement("option")
        placeholder.value = ""
        placeholder.textContent = "Select a badge"
        placeholder.disabled = true
        placeholder.selected = true
        this.badgeSelect.appendChild(placeholder)

        for (const badge of ModeratorGiveableBadges) {
            const option = document.createElement("option")
            option.value = badge.id
            option.textContent = badge.name
            this.badgeSelect.appendChild(option)
        }
    }

    initListeners() {
        document.querySelector("#badge_submit").addEventListener("click", this.onSubmitBtnClicked.bind(this))
        this.menuEl.querySelector(".cancel_btn").addEventListener("click", this.close.bind(this))
    }

    async onSubmitBtnClicked() {
        const url = Config[env].matchmakerUrl + "give_badge"
        const username = this.menuEl.querySelector("#badge_username_field").value
        const badgeId = this.badgeSelect.value
        const badge = ModeratorGiveableBadges.find((entry) => entry.id === badgeId)
        const info = this.menuEl.querySelector("#event_badge_menu_info")
        if(!username) {
            info.innerText = "Enter a username."
            return
        }
        if(!badge) {
            info.innerText = "Select a badge."
            return
        }
        info.innerText = ""
        const idToken = await this.main.getFirebaseIdToken()

        const data = {
            idToken: idToken,
            username: username,
            badgeId: badgeId
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