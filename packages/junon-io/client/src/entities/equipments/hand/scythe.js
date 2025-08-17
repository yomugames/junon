const MeleeEquipment = require("./melee_equipment")
const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")

class Pitchfork extends MeleeEquipment {

  getType() {
    return Protocol.definition().BuildingType.Pitchfork
  }

  getConstantsTable() {
    return "Equipments.Pitchfork"
  }

  use(player, targetEntity) {
    if (targetEntity && targetEntity.isCrop && targetEntity.isCrop()) {
      // interact with the crop (harvest/destroy fully grown)
      if (targetEntity.isFullyGrown && targetEntity.isFullyGrown()) {
        targetEntity.interact(player)

        // destroy left and right fully grown crops
        this._destroyNeighbors(player, targetEntity)
      }
    } else {
      // fallback to normal melee use
      super.use(player, targetEntity)
    }
  }

  _destroyNeighbors(player, target) {
    const x = target.getX()
    const y = target.getY()
    const room = target.room

    if (!room) return

    const neighbors = [
      room.getTile(x - 1, y),
      room.getTile(x + 1, y)
    ]

    neighbors.forEach(tile => {
      if (!tile) return

      const crop = tile.getBuilding && tile.getBuilding()

      if (crop && crop.isCrop && crop.isCrop() && crop.isFullyGrown && crop.isFullyGrown()) {
        if (crop.interact) {
          crop.interact(player)
        } else if (crop.breakBuilding) {
          crop.breakBuilding(player)
        }
      }
    })
  }
}

module.exports = Pitchfork