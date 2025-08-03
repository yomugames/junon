
const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')
const EquipmentInventory = require("./../equipment_inventory")
const Item = require("./../item")
const p2 = require("p2")
const vec2 = p2.vec2

class Firebat extends LandMob {

  preApplyData() {
    this.initEquipment()
  }

  onPostInit() {
    if (!this.weaponType) {
      this.initWeapon("FlameThrower")
    }
  }

  initEquipment() {
    this.equipments = new EquipmentInventory(this, 4)
  }

  initWeapon(weaponName) {
    let item = new Item(this, weaponName)
    this.equipments.storeAt(Protocol.definition().EquipmentRole.Hand, item)
  }

  hasMeleeWeapon() {
    let equipment = this.equipments.get(Protocol.definition().EquipmentRole.Hand)
    if (!equipment) return false
    return equipment.hasCategory("melee_weapon")
  }

  onHealthZero() {
    super.onHealthZero()
  }

  isFriendlyUnit(targetEntity) {
    // needs to be unfriendly so it can destroy doors
    if (targetEntity.hasCategory("door")) return false

    return super.isFriendlyUnit(targetEntity)
  }

  getType() {
    return Protocol.definition().MobType.Firebat
  }

  getConstantsTable() {
    return "Mobs.Firebat"
  }

  canBeKnocked() {
    return false
  }

  onHitEntity(entity) {
    super.onHitEntity(entity)

    // open doors if closed
    if (entity.hasCategory("door")) {
      if (!this.desiredAttackTarget) return
      if (!this.isObstacleBlockingTarget(this.desiredAttackTarget, this.getRange())) return

      if (this.canDestroyDoor(entity)) {
        this.setDesiredAttackTarget(entity)
      } else if (!entity.isOpen) {
        entity.open()
      }
    }
  }

  canDestroyDoor(target) {
    if (target.isOpen) return false

    return true
  }

  performAttack(attackTarget) {
    let radian = Math.atan2(attackTarget.getY() - this.getY(), attackTarget.getX() - this.getX())
    let deg = Math.floor(radian * (180 / Math.PI))
    this.setAngle(deg)

    let attackTargetVelocity = attackTarget.getBodyVelocity()

    let oneSecondTimestampDuration = Constants.physicsTimeStep

    let futureX = attackTarget.getX() + (attackTargetVelocity[0] * oneSecondTimestampDuration)
    let futureY = attackTarget.getY() + (attackTargetVelocity[1] * oneSecondTimestampDuration)
    const futureRow = Math.floor(futureY / Constants.tileSize)
    const futureCol = Math.floor(futureX / Constants.tileSize)

    let tile = this.getContainer().pathFinder.getTile(futureRow, futureCol)
    if (!tile) return // empty space

    // let target = this.game.pointFromDistance(this.getX(), this.getY(), 32*2, radian)

    this.getWeapon().use(this, null, { 
      targetX: futureX,
      targetY: futureY
    })
  }

  getStructureAttackPriority() {
    return ["FuelTank"]
  }

  applyTargetSelectionStrategy(targets) {
    let spikeTrap = targets.find((target) => {
      return target.hasCategory("spike_trap") && this.isPathFindTargetReachable(target)
    })

    if (spikeTrap) return spikeTrap

    return super.applyTargetSelectionStrategy(targets)
  }

  getWeaponItem() {
    return this.equipments.get(Protocol.definition().EquipmentRole.Hand)
  }

  getWeapon() {
  if (!this.equipments) {
    return null;
  }

  let item = this.equipments.get(Protocol.definition().EquipmentRole.Hand)
  if (!item) return null
  return item.instance || item.getKlass(item.type)
}

  remove() {
    super.remove()

    this.equipments.getStorageItems().forEach((item) => {
      item.remove()
    })
  }

}

module.exports = Firebat
