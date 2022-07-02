const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")
const Helper = require('../../../../common/helper')

class Mop extends MeleeEquipment {
  use(player, targetEntity) {
    super.use(player, targetEntity)

    // damage enemy within range
    const meleeRange = this.getRange()
    const xp = meleeRange * Math.cos(player.getRadAngle())
    const yp = meleeRange * Math.sin(player.getRadAngle())
    const meleeCircle = { x: player.getX() + xp, y: player.getY() + yp, radius: meleeRange }

    const meleeBox = player.getNeighborBoundingBox(Constants.tileSize)
    const relativeBox = { pos: { x: meleeBox.minX, y: meleeBox.minY }, 
      w: (meleeBox.maxX - meleeBox.minX),
      h: (meleeBox.maxY - meleeBox.minY)
    }

    const buildings = player.sector.buildingTree.search(meleeBox)
    const terrains = player.sector.groundMap.hitTestTile(relativeBox).filter((hit) => {
      return hit.entity
    }).map((hit) => {
      return hit.entity
    }) 

    const platforms = buildings.concat(terrains).filter((entity) => {
      if (entity.hasCategory("platform") || entity.hasCategory("terrain")) {
        return Helper.testCircleCircle(meleeCircle, entity.getCircle())
      } else {
        return false
      }
    })

    platforms.forEach((platform) => {
      let hasDirtPrev = platform.hasDirt()
      platform.clean()
      let hasDirtCurr = platform.hasDirt()

      if (hasDirtPrev && !hasDirtCurr) {
        this.game.triggerEvent("PlatformCleaned", { 
          entityId: platform.getId(),
          playerId: player.getId(), 
          player: player.getName(), 
          row: platform.getRow(),
          col: platform.getCol()
        })
      }
    })

  }

  getType() {
    return Protocol.definition().BuildingType.Mop
  }

  getConstantsTable() {
    return "Equipments.Mop"
  }
}

module.exports = Mop
