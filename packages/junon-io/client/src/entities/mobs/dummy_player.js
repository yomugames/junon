const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Equipper  = require("./../../../../common/interfaces/equipper")
const ClientHelper = require("./../../util/client_helper")
const Interpolator = require("./../../util/interpolator")
const Equipments = require("./../equipments/index")
const SocketUtil = require("./../../util/socket_util")


class DummyPlayer extends LandMob {
  constructor(game, data) {
    super(game, data)

    // this.characterSprite.tint = 0x444444 // dark + red line eyes maybe

    this.initEquipper()
  }

  getSpritePath() {
    return "human.png"
  }

  getSprite() {
    let sprite = super.getSprite()
    Interpolator.mixin(this.characterSprite)
    return sprite
  }

  getBaseRotationOffset() {
    return 0 * PIXI.DEG_TO_RAD
  }

  renderDeadBody() {
    this.addDizzyEyes(this.body)
    this.dizzySprite.width  = 25
    this.dizzySprite.height = 10
    this.dizzySprite.position.x = 25
    this.dizzySprite.position.y = 25
    this.dizzySprite.rotation = 90 * Math.PI/180

    this.openHands()
    this.removeEquipments()
  }

  getConstantsTable() {
    return "Mobs.DummyPlayer"
  }

  getType() {
    return Protocol.definition().MobType.DummyPlayer
  }

  showAction(entityMenu) {
    let actions = ""
    let permissionSelect = this.createRoleSelect(entityMenu)

    actions += permissionSelect
    entityMenu.querySelector(".entity_action").innerHTML = actions

    this.initPermissionSelect(entityMenu)
  }

  initPermissionSelect(entityMenu) {
    let permissionSelect = entityMenu.querySelector(".player_permissions_select")
    if (!permissionSelect) return
    permissionSelect.addEventListener("change", this.onDummyPlayerPermissionsSelectChanged.bind(this))

    if (this.content) {
      permissionSelect.value = this.content
    } else {
      permissionSelect.value = 0
    }
  }

  onDummyPlayerPermissionsSelectChanged(e) {
    let roleType = e.target.value
    let memberId = e.target.closest(".player_permissions_select").dataset.memberId 
    SocketUtil.emit("EditMob", { id: memberId, content: roleType })
  }

}

Object.assign(DummyPlayer.prototype, Equipper.prototype, {
  getDefaultSpriteColor() {
    return 0xd2b48c
  }
})


module.exports = DummyPlayer
