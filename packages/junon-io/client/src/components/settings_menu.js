const ClientHelper = require("../util/client_helper")
const KeyboardMap = require("../entities/keyboard_map")
const Cookies = require("js-cookie")
const Constants = require("./../../../common/constants.json")
const Helper = require("./../../../common/helper")

class SettingsMenu {
  constructor(main) {
    this.main = main
    this.game = main.game

    this.displayVolume()
    this.displayKeybindings()

    this.loadKeyBindingsFromStorage()

    this.initListeners()
  }

  initListeners() {
    document.querySelector(".key_bindings_container").addEventListener("click", this.onKeyBindingsContainerClick.bind(this), true)
    document.querySelector(".key_bindings_container").addEventListener("keyup", this.onKeyBindingsContainerKeyup.bind(this), true)

    document.querySelector(".effects_volume_slider").addEventListener("change", this.onEffectsVolumeSliderChange.bind(this))
    document.querySelector(".effects_volume_slider").addEventListener("input", this.onEffectsVolumeSliderChange.bind(this))

    document.querySelector(".background_volume_slider").addEventListener("change", this.onBackgroundVolumeSliderChange.bind(this))
    document.querySelector(".background_volume_slider").addEventListener("input", this.onBackgroundVolumeSliderChange.bind(this))
  }

  displayVolume() {
    const volume = Cookies.get("effects_volume") || Constants.defaultVolume

    document.querySelector(".effects_volume_value").innerText = volume
    document.querySelector(".effects_volume_slider").value = volume * 10

    const backgroundVolume = Cookies.get("background_volume") || Constants.defaultBackgroundVolume

    document.querySelector(".background_volume_value").innerText = backgroundVolume
    document.querySelector(".background_volume_slider").value = backgroundVolume * 10
  }

  onEffectsVolumeSliderChange(e) {
    let volume = parseInt(e.target.value) / 10
    Cookies.set("effects_volume", volume)
    document.querySelector(".effects_volume_value").innerText = volume
    
    this.game.setEffectsVolume(volume)
  }

  onBackgroundVolumeSliderChange(e) {
    let volume = parseInt(e.target.value) / 10
    Cookies.set("background_volume", volume)
    document.querySelector(".background_volume_value").innerText = volume
    
    this.game.setBackgroundVolume(volume)
  }

  onKeyBindingsContainerKeyup(e) {
    let keyCode = ClientHelper.getKeycode(e)
    if (keyCode === 27) {
      // escape - user is trying to leave settings menu
      return
    }

    if (!this.currentKeyBindingRow) return
    
    let keyBindingLabel = this.currentKeyBindingRow.dataset.label
    Cookies.set(keyBindingLabel, keyCode)
    this.setNewKeyBinding(keyBindingLabel, keyCode)
  }

  setNewKeyBinding(keyBindingLabel, keyBinding) {
    this.game.keyBindings[keyBindingLabel] = keyBinding
    let selector = ".key_bindings_row[data-label='" + keyBindingLabel + "'] .key_binding_value"
    document.querySelector(selector).innerText = KeyboardMap[keyBinding]

    this.onKeyBindingChanged(keyBindingLabel, keyBinding)
  }

  onKeyBindingChanged(keyBindingLabel, keyBinding) {
    if (keyBindingLabel === "interact") {
      document.querySelector("#player_action_tooltip #shortcut_btn").innerText = KeyboardMap[keyBinding]
    }
  }

  onKeyBindingsContainerClick(e) {
    // let currentKeyBindingRow 
    // if (this.currentKeyBinding) {
    //   currentKeyBindingRow = document.querySelector(".key_bindings_row[data-key-binding='" + this.currentKeyBinding +"']")
    //   currentKeyBindingRow.querySelector(".key_binding_value")
    // }

    if (this.currentKeyBindingRow) {
      // reset edit mode
      let keyBindingLabel = this.currentKeyBindingRow.dataset.label
      let keyBinding = this.game.keyBindings[keyBindingLabel]
      this.currentKeyBindingRow.querySelector(".key_binding_value").innerText = KeyboardMap[keyBinding]
      this.currentKeyBindingRow = null
    }
    
    if (e.target.className === 'key_binding_value') {
      e.target.innerText = "Press any Key"
      let keyBindingRow = e.target.closest(".key_bindings_row")
      this.currentKeyBindingRow = keyBindingRow
    } else {

    }
  }

  displayKeybindings() {
    for (let command in this.game.keyBindings) {
      let keyBinding = this.game.keyBindings[command]
      let translatedCommand = i18n.t(Helper.capitalizeWords(command))
      let el = document.createElement("div")
      el.className = "key_bindings_row"
      el.dataset.label = command
      el.innerHTML += "<div class='key_binding_label'>" + translatedCommand + "</div>"
      el.innerHTML += "<div class='key_binding_value' tabindex='0'>" + KeyboardMap[keyBinding] + "</div>"

      document.querySelector(".key_bindings_container").appendChild(el)
    }
  }

  loadKeyBindingsFromStorage() {
    for (let keyBindingLabel in this.game.keyBindings) {
      let savedKeybinding = Cookies.get(keyBindingLabel)
      if (savedKeybinding) {
        this.setNewKeyBinding(keyBindingLabel, parseInt(savedKeybinding))
      }
    }
  }

  show() {
    document.querySelector(".settings_container").style.display = 'block'
  }

  hide() {
    document.querySelector(".settings_container").style.display = 'none'
  }


}

module.exports = SettingsMenu