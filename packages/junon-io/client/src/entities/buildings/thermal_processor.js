const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")
const SocketUtil = require("../../util/socket_util")
const BaseBuilding = require("./base_building")

class ThermalProcessor extends BaseBuilding {
  setInputStorage(storage) {
    const entries = Array.isArray(storage) ? storage : Object.values(storage || {})
    this.hasDrug = entries.some((item) => item && (item.index === 0 || entries.indexOf(item) === 0))
    this.updateThermalControls()
  }

  syncWithServer(data) {
    super.syncWithServer(data)
    this.updateThermalControls()
  }

  openMenu() {
    this.game.processorMenu.open("Thermal Processor", this, this.getMenuDescription(), false)
    this.addThermalControls()
  }

  getMenuDescription() {
    return this.content || super.getMenuDescription()
  }

  onContentChanged() {
    let menu = this.game.processorMenu
    if (menu.isOpen() && menu.storageId === this.id) menu.setDescription(this.getMenuDescription())
  }

  setIsHeating(isHeating) {
    this.isHeating = isHeating
    this.updateThermalControls()
  }

  setHeatingIntensity(heatingIntensity) {
    heatingIntensity = Number(heatingIntensity)
    if (!Number.isFinite(heatingIntensity) || heatingIntensity < 1) return
    this.heatingIntensity = Math.max(1, Math.min(100, Math.round(heatingIntensity)))
    this.updateThermalControls()
  }

  setResourceStorages(resourceStorages) {
    super.setResourceStorages(resourceStorages)
    this.fuelUsage = resourceStorages && resourceStorages.fuel ? resourceStorages.fuel.usage : 0
    this.updateThermalControls()
  }

  updateThermalControls() {
    const controls = this.game.processorMenu.el.querySelector(".thermal_processor_controls")
    if (!controls) return
    const toggle = controls.querySelector(".thermal_processor_toggle")
    toggle.checked = !!this.isHeating
    toggle.disabled = false
    const storedIntensity = Number(this.heatingIntensity)
    const intensity = Number.isFinite(storedIntensity) ? Math.max(1, Math.min(100, storedIntensity)) : 50
    controls.querySelector(".thermal_processor_intensity").value = String(intensity)
    const capacity = this.getResourceCapacity("fuel") || 1
    const usage = Math.max(0, Math.min(capacity, this.fuelUsage || 0))
    controls.querySelector(".thermal_processor_fuel_fill").style.width = `${usage / capacity * 100}%`
  }

  addThermalControls() {
    const menu = this.game.processorMenu
    const storage = menu.el.querySelector(".processor_storage")
    if (!storage || menu.el.querySelector(".thermal_processor_controls")) return
    const controls = document.createElement("div")
    controls.className = "thermal_processor_controls"
    controls.innerHTML = "<div class='thermal_processor_action_row' style='display: flex; align-items: center; gap: 8px; margin-top: 4px; margin-bottom: 4px;'><div class='thermal_processor_toggle_row' style='position: relative; display: inline-block;'><button type='button' style='background-color: #a83715;'>Begin Heating</button><input type='checkbox' class='thermal_processor_toggle' style='position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer;'></div>" +
      "<button type='button' class='thermal_processor_temperature' style='background-color: #ffe45b;'>Check Temperature</button></div>" +
      "<div class='thermal_processor_fuel_row'><div class='thermal_processor_fuel_bar'><div class='thermal_processor_fuel_fill'></div></div></div>" +
      "<div class='thermal_processor_intensity_label'>Heat Intensity</div>" +
      "<div class='thermal_processor_intensity_row'><input type='range' min='1' max='100' value='50' class='thermal_processor_intensity' style='width: 300px; accent-color: #d64545;'></div>"
    storage.insertAdjacentElement("afterend", controls)
    const fuelBar = controls.querySelector(".thermal_processor_fuel_bar")
    fuelBar.style.cssText = "display: inline-block; width: 300px; height: 12px; margin-left: 8px; border: 1px solid #777; background: #3a3a3a; vertical-align: middle;"
    controls.querySelector(".thermal_processor_fuel_fill").style.cssText = "height: 100%; width: 0; background: #f28c28; transition: width 0.15s linear;"
    this.updateThermalControls()
    controls.querySelector(".thermal_processor_toggle").addEventListener("change", (event) => {
      const requestedHeating = event.target.checked
      SocketUtil.emit("EditBuilding", { id: this.id, action: "toggleHeating", isHeating: requestedHeating })
    })
    controls.querySelector(".thermal_processor_intensity").addEventListener("input", (event) => {
      const intensity = Number(event.target.value)
      this.setHeatingIntensity(intensity)
      SocketUtil.emit("EditBuilding", { id: this.id, action: "setHeatingIntensity", intensity: this.heatingIntensity })
    })
    controls.querySelector(".thermal_processor_temperature").addEventListener("click", () => {
      SocketUtil.emit("EditBuilding", { id: this.id, action: "checkTemperature" })
    })
  }

  getType() { return Protocol.definition().BuildingType.ThermalProcessor }
  getConstantsTable() { return "Buildings.ThermalProcessor" }

  postBuildingConstructed() {
    super.postBuildingConstructed()
    this.unassignLighting()
  }

  onPowerChanged() {
    this.buildingSprite.texture = PIXI.utils.TextureCache[this.getSpritePath()]
    this.toggleLight()
    this.updateThermalControls()
  }

  toggleLight() {
    if (this.isPowered) this.assignLighting()
    else this.unassignLighting()
  }

  getSpritePath() {
    return this.isPowered ? "thermal_processor.png" : "thermal_processor_off.png"
  }
}

module.exports = ThermalProcessor
