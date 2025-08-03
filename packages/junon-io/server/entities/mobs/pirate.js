const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')
const EquipmentInventory = require("./../equipment_inventory")
const Item = require("./../item")

class Pirate extends LandMob {

  preApplyData() {
    this.initEquipment()
  }

  onPostInit() {
    if (!this.weaponType) {
      this.initWeapon()
    }
  }

  initEquipment() {
    this.equipments = new EquipmentInventory(this, 4)
  }

  findWanderTarget() {
    if (this.sector.isLobby()) return // dont wander
    
    super.findWanderTarget()
  }

  initWeapon() {
    if (!this.equipments) return

      // but it still references the same equipment instance
    let item = new Item(this, "StunBaton", { isUnbreakable: true })
    this.equipments.storeAt(Protocol.definition().EquipmentRole.Hand, item)
  }

  hasMeleeWeapon() {
    if (!this.equipments) return false

    let equipment = this.equipments.get(Protocol.definition().EquipmentRole.Hand)
    if (!equipment) return false
    return equipment.hasCategory("melee_weapon")
  }

  onHealthZero() {
    super.onHealthZero()

    let lastHitBy = this.game.getEntity(this.attackerId)

    if (this.isDestroyed() && lastHitBy && lastHitBy.isPlayer()) {
      lastHitBy.walkthroughManager.handle("kill_guard")
    }
  }

  isFriendlyUnit(targetEntity) {
    // needs to be unfriendly so it can destroy doors
    if (targetEntity.hasCategory("door")) return false

    return super.isFriendlyUnit(targetEntity)
  }

  getType() {
    return Protocol.definition().MobType.Pirate
  }

  getConstantsTable() {
    return "Mobs.Pirate"
  }

  canBeKnocked() {
    return false
  }

  onHitEntity(entity) {
    super.onHitEntity(entity)

    // open doors if closed
    if (entity.hasCategory("door")) {
      // if (!this.desiredAttackTarget) return
      // if (!this.isObstacleBlockingTarget(this.desiredAttackTarget, this.getRange())) return

      if (this.canDestroyDoor(entity)) {
        this.setDesiredAttackTarget(entity)
      } else if (!entity.isOpen) {
        entity.open()
      }
    }
  }

  getStructureAttackPriority() {
    return ["OxygenTank"]
  }

  performAttack(attackTarget) {
    let radian = Math.atan2(attackTarget.getY() - this.getY(), attackTarget.getX() - this.getX())
    let deg = Math.floor(radian * (180 / Math.PI))
    this.setAngle(deg)

    if (this.getWeapon()) {
      this.getWeapon().use(this, attackTarget)
    }
  }

  remove() {
    super.remove()

    if (this.equipments) {
      this.equipments.getStorageItems().forEach((item) => {
        item.remove()
      })
    }
  }

}

module.exports = Pirate
