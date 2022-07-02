const BaseEffect = require("./base_effect")
const Constants = require("./../../../../common/constants.json")
const ClientHelper = require("./../../util/client_helper")

class Smoke extends BaseEffect {

  getConstantsTable() {
    return "Effects.Smoke"
  }

  getSprite() {
    return null
  }

  onPostInit() {
    this.tween = this.getSmokeTween()
    this.tween.start()
  }  

  remove() {
    super.remove()
  }

  getSmokeTween() {
    let position = { position: 0 }
    let counter = 0

    const tween = new TWEEN.Tween(position)
        .to({ position: Constants.tileSize * 3 }, 3000)
        .onUpdate(() => {
          if (counter >= 10) {
            counter = 0
            let x = this.affectedEntity.getX()
            let y = this.affectedEntity.getY()
            let smoke = this.game.createSmoke({ 
              x: x, 
              y: y - Constants.tileSize/2, 
              color: 0xcccccc, 
              minWidth: 15, 
              maxWidth: 35,
              moveTo: { x: Constants.tileSize * 3, y: -(Constants.tileSize * 3) }
            })
          }

          counter += 1
        })
        .repeat(Infinity)

    return tween
  }



}

module.exports = Smoke
