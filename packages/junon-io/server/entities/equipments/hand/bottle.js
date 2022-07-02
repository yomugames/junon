const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Drainable = require('./../../../../common/interfaces/drainable')

class Bottle extends MeleeEquipment {

  onEquipmentConstructed() {
    this.initDrainable()
  }

  use(user, targetEntity, options = {}) {
    let success
    let target = this.getTargets(user, Constants.tileSize)[0]
    success = this.useOnTarget(user, target)
    options.shouldAnimate = success
    super.use(user, targetEntity, options)
  }

  // range is the radius
  getTargets(player, meleeRange) {
    const xp = meleeRange * Math.cos(player.getRadAngle())
    const yp = meleeRange * Math.sin(player.getRadAngle())

    const relativeBox = player.getRelativeBox()
    relativeBox.pos.x = Math.floor(relativeBox.pos.x + (xp - meleeRange))
    relativeBox.pos.y = Math.floor(relativeBox.pos.y + (yp - meleeRange))
    relativeBox.w = meleeRange*2
    relativeBox.h = meleeRange*2

    // search platform tiles
    let hits = player.sector.platformMap.hitTestTile(relativeBox)
    let drainableHit = hits.find((hit) => {
      return hit.entity && hit.entity.isBottleFillable()
    })

    // search buildings
    if (!drainableHit) {
      hits = player.sector.structureMap.hitTestTile(relativeBox)
      drainableHit = hits.find((hit) => {
        return hit.entity && hit.entity.isBottleFillable()
      })
    }

    // search terrain tiles
    if (!drainableHit) {
      hits = player.sector.groundMap.hitTestTile(relativeBox)
      drainableHit = hits.find((hit) => {
        return hit.entity && hit.entity.isBottleFillable()
      })
    }

    return drainableHit ? [drainableHit.entity] : []
  }

  useOnTarget(player, target) {
    this.draw(player, target)

    return true
  }

  inject(entity) {
    if (!entity.isInjectable()) return

    // this.applySample(this.getContent(), entity)
    this.drain(20)
  }

  applySample(sample, entity) {
    // if (entity.isInjectableContainer()) {
    //   entity.setContent(sample)
    // }
  }

  drainSample() {
    let sample = this.getContent()
    this.setContent(null)
    this.setUsage(0)
    return sample
  }

  onUsageChanged() {
    super.onUsageChanged()

    if (this.usage === 0 && this.constructor.name !== 'Bottle') {
      this.convertToBottle()
    }
  }

  isLegacyBottleWithWater() {
    return this.content === "Water"
  }

  draw(user, entity) {
    if (!entity) return
    if (!entity.isBottleFillable()) return
    if (!this.isLegacyBottleWithWater() && this.isFull()) {
      return
    }

    let sample = entity.drainSample()
    if (sample) {
      if (!this.isSampleValid(sample)) return

      if (sample === 'Blood') {
        if (this.constructor.name !== 'BloodBottle') {
          this.convertToBloodBottle()
        } else {
          this.fill(sample, 20)
        }

      } else if (sample === 'Water') {
        if (this.constructor.name !== 'WaterBottle') {
          this.convertToWaterBottle()
        } else {
          this.fill(sample, this.getUsageCapacity())
        }

        if (user.isPlayer()) {
          user.progressTutorial("main", 5)
          user.walkthroughManager.handle("collect_water")
        }
      }
    }
  }

  convertToBottle() {
    let owner = this.owner
    let prevStorageIndex = this.item.storageIndex

    // convert into bloodbottle
    this.item.remove()
    let newItem = owner.createItem("Bottle")
    if (owner.inventory) {
      owner.inventory.storeAt(prevStorageIndex, newItem)
    }
    owner.setHandEquipment(newItem)
  }

  convertToBloodBottle() {
    let owner = this.owner
    let prevStorageIndex = this.item.storageIndex

    // convert into bloodbottle
    this.item.remove()
    let newItem = owner.createItem("BloodBottle")
    if (owner.inventory) {
      owner.inventory.storeAt(prevStorageIndex, newItem)
    }
    owner.setHandEquipment(newItem)
    newItem.instance.setUsage(10)
  }

  convertToWaterBottle() {
    let owner = this.owner
    let prevStorageIndex = this.item.storageIndex

    // convert into bloodbottle
    this.item.remove()
    let newItem = owner.createItem("WaterBottle")
    if (owner.inventory) {
      owner.inventory.storeAt(prevStorageIndex, newItem)
    }

    owner.setHandEquipment(newItem)
    newItem.instance.setUsage(newItem.instance.getUsageCapacity())
  }

  isSampleValid(sample) {
    return true
  }

  shouldBeFullOnSpawn() {
    return false
  }

  hasEnoughWater() {
    return false
  }

  getType() {
    return Protocol.definition().BuildingType.Bottle
  }

  getConstantsTable() {
    return "Equipments.Bottle"
  }

  getUsageCapacity() {
    return this.getResourceCapacity("liquid")
  }
}

module.exports = Bottle
