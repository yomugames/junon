const BaseMenu = require("./base_menu")
const LightPath = require("./../entities/light_path")

class LightPathMenu extends BaseMenu {

  isModal() {
    return false
  }


  open(entity) {
    super.open()
    
    if (this.lightPath) {
      this.lightPath.remove()
    }

    let data = {
      goal: {
        row: entity.getRow(), 
        col: entity.getCol()
      },
      container: this.game.sector,
      locations: []
    }

    entity.lightings.forEach((lighting) => {
      let location = {
        row: lighting.row,
        col: lighting.col,
        distance: lighting.distance
      }

      data.locations.push(location)
    })

    this.lightPath = new LightPath(this.game, data)
    this.lightPath.show()
  }

  close() {
    super.close()
    if (this.lightPath) {
      this.lightPath.remove()
    }
  }

}

module.exports = LightPathMenu
