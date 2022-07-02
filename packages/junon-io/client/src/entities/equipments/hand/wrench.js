const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const ClientHelper = require("./../../../util/client_helper")


class Wrench extends MeleeEquipment {

  repositionSprite() {
    super.repositionSprite()
  }

  getSpritePath() {
    return 'wrench.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Wrench
  }

  getConstantsTable() {
    return "Equipments.Wrench"
  }

  getAnimationTween() {
    let halfRotation = 90 * (Math.PI / 180)
    let userRotation = Math.PI/2
    let startRotation = userRotation
    let midRotation   = userRotation - (halfRotation)
    let endRotation   = userRotation - (halfRotation * 2)
    let rotation = { rotation: startRotation }

    const swing = new TWEEN.Tween(rotation)
        .to({ rotation: endRotation  }, 400)
        .onUpdate(() => {
          let progress = Math.abs(rotation.rotation - startRotation)
          if (progress > halfRotation) {
            let backIncrement = progress - halfRotation
            let backRotation = midRotation + backIncrement

            this.sprite.rotation = backRotation
          } else {
            this.sprite.rotation = rotation.rotation
          }
        })
        .onRepeatCycleComplete(() => {
          let userRotation = Math.PI/2

          startRotation = userRotation
          midRotation   = userRotation - (halfRotation)
          endRotation   = userRotation - (halfRotation * 2)
          rotation = { rotation: startRotation }

          swing._object = rotation
          swing._valuesEnd = { rotation: endRotation }

        })
        .onComplete(() => {
          this.sprite.rotation = startRotation
        })



    return swing
  }

}

module.exports = Wrench
