const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class AssassinsKnife extends MeleeEquipment {

  onPostEquip() {
    this.sprite.texture = PIXI.utils.TextureCache['radio.png']
    this.sprite.rotation = Math.PI/2
    this.sprite.position.x = 70
    this.sprite.position.y = 20
  }
 
  onAttackAnimationStart() {
    this.sprite.texture = PIXI.utils.TextureCache['assassins_knife.png']
    this.sprite.rotation = 0
    this.sprite.position.x = 30
    this.sprite.position.y = 0
  }

  onAttackAnimationComplete() {
    this.sprite.texture = PIXI.utils.TextureCache['radio.png']
    this.sprite.rotation = Math.PI/2
    this.sprite.position.x = 70
    this.sprite.position.y = 20
  }
 
  getSpritePath() {
    return 'assassins_knife.png'
  }

  getType() {
    return Protocol.definition().BuildingType.AssassinsKnife
  }

  getConstantsTable() {
    return "Equipments.AssassinsKnife"
  }

}

module.exports = AssassinsKnife
