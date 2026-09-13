const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const ExceptionReporter = require('junon-common/exception_reporter')


class SurvivalTool extends MeleeEquipment {
  use(player, targetEntity) {
    if (targetEntity && targetEntity.isMineable()) {
      this.mineResource(player, targetEntity)
      super.use(player, targetEntity, { skipAttack: true, shouldAnimate: false })
    } else if (targetEntity && targetEntity.isCrop())  {
      targetEntity.interact(player)
    } else if (this.canSalvage(player, targetEntity))  {
      targetEntity.breakBuilding(player)
      super.use(player, targetEntity, { skipAttack: true, shouldAnimate: false })
    } else {
      // use as melee weapon
      super.use(player, targetEntity)
    }

  }

  canSalvage(player, targetEntity) {
    let isBuilding = targetEntity && targetEntity.isBuilding()
    if (!isBuilding) return false

    let hasOwner = targetEntity.owner
    if (!hasOwner) return false

    if (targetEntity.hasCategory("storage") &&
        !player.canAccessStorage(targetEntity)) {
      return false
    }

    if (targetEntity.hasCategory("vending_machine") &&
        !player.isSectorOwner() &&
        !player.canAccessStorage(targetEntity)) {
      return false
    }

    let regionBuildPermission = player.getRegionBuildPermission(targetEntity.getX(),
                                                                targetEntity.getY(),
                                                                targetEntity.getRotatedWidth(),
                                                                targetEntity.getRotatedHeight())
    let byPassRoleBuildPermission
    if (regionBuildPermission) {
      if (!player.canBuildInRegion(regionBuildPermission)) {
        return false
      }

      byPassRoleBuildPermission = true
    }


    if (!byPassRoleBuildPermission && player.getRole() && !player.getRole().isAllowedTo("Deconstruct")) {
      return false
    }

    return targetEntity.canBeSalvagedBy(player)
  }

  getDrillRate() {
    return 1
  }

  getMiningLevel() {
    return this.getConstants().stats.miningLevel
  }

  hasMiningPrivilege(player) {
    if (player.sector.isLobby()) return true
    if (!player.getTeam()) return false

    return player.getRole().isAllowedTo("MineAsteroids")
  }

  mineResource(player, targetEntity) {
    if (!this.hasMiningPrivilege(player)) {
      player.showError("You dont have permission to mine asteroids")
      return
    }
    let asteroidLevel = targetEntity.getConstants().requiredLevel
    let toolLevel = this.getMiningLevel()
    if (asteroidLevel && toolLevel < asteroidLevel) {
      player.showError("You need a stronger tool to mine this")
      return
    }

    targetEntity.setLastMinedHealth(targetEntity.health)

    if (targetEntity.getConstants().defense) {
      targetEntity.damage(this.getDrillRate() - targetEntity.getConstants().defense, player)
    } else {
      targetEntity.damage(this.getDrillRate(), player)
    }

    // // extract every 3 times
    let increment = 5
    if (targetEntity.getLastMinedHealth() - targetEntity.getHealth() < increment) return

    let dropCount = Math.max(1,Math.floor((targetEntity.getLastMinedHealth() - targetEntity.getHealth()) / increment))
    targetEntity.setLastMinedHealth(targetEntity.health)

    let dropType = targetEntity.getDropType()

    let item = targetEntity.sector.createItem(dropType, {count: increment * dropCount * this.sector.miningSpeed })
    let isStoredSuccessfully = player.inventory.store(item, Constants.regularInventoryBaseIndex)
    if (!isStoredSuccessfully) {
      isStoredSuccessfully = player.inventory.store(item, Constants.quickInventoryBaseIndex)
    }

    if (!isStoredSuccessfully) {
      player.showError("Inventory Full")
    } else {
      this.game.triggerEvent("AsteroidMined", {
        type: dropType,
        player: player.getName(),
        remaining: targetEntity.health
      })
      this.getSocketUtil().emit(player.getSocket(), "GainResource", { amount: increment * dropCount * this.sector.miningSpeed, type: dropType })
    }
  }

  getType() {
    return Protocol.definition().BuildingType.SurvivalTool
  }

  isMiningEquipment() {
    return true
  }

  getConstantsTable() {
    return "Equipments.SurvivalTool"
  }
}

module.exports = SurvivalTool
