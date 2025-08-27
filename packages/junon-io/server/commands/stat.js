const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const EntityGroup = require("./../entities/entity_group")
const Helper = require("../../common/helper")
const Mobs = require("../entities/mobs/index")
const Buildings = require("../entities/buildings/index")
const Item = require("../entities/item")

class Stat extends BaseCommand {

  getUsage() {
    return [
      "/stat [mob|building|weapon|player]",
      "/stat [mob|building|weapon|player] <flags>",
      "/stat [mob|building|weapon|player] <stat>:*[multiply]"
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    const type = args[0]

    let keyValueArgs = args.slice(1)
    let keyValueMap = this.convertKeyValueArgsToObj(keyValueArgs)

    let klassName = this.sector.klassifySnakeCase(type)

    if (Object.keys(keyValueMap).length === 0) {
      // read only
      let mobKlass = Mobs[klassName]
      if (mobKlass) {
        caller.showChatSuccess(this.formatMobStat(mobKlass))
        return
      }

      let buildingKlass = Buildings[klassName]
      if (buildingKlass) {
        caller.showChatSuccess(this.formatBuildingStat(buildingKlass))
        return
      }

      let itemKlass = Item.getKlassByName(klassName)
      if (itemKlass && itemKlass.prototype.isWeapon()) {
        caller.showChatSuccess(this.formatWeaponStat(itemKlass))
        return
      }

      let player = this.game.getPlayerByNameOrId(type)
      if (player) {
        caller.showChatSuccess(this.formatEntityStat(player))
        return
      }

      let id = parseInt(type) 
      let entity = this.game.getEntity(id)
      if (entity) {
        caller.showChatSuccess(this.formatEntityStat(entity))
      }

      return
    }

    //assigning stat
    let mobKlass = Mobs[klassName]
    if (mobKlass) {
      let mobType = mobKlass.prototype.getType()
      let stat = this.getMobStat(mobType, mobKlass)
      this.modifyStat(stat, keyValueMap, caller)

      this.sector.setCustomMobStat(mobType, stat)
      caller.showChatSuccess(this.formatMobStat(mobKlass))
      return
    }

    let buildingKlass = Buildings[klassName]
    if (buildingKlass) {
      let buildingType = buildingKlass.prototype.getType()
      let stat = this.getBuildingStat(buildingType, buildingKlass)
      this.modifyStat(stat, keyValueMap, caller)

      this.sector.setCustomBuildingStat(buildingType, stat)
      caller.showChatSuccess(this.formatBuildingStat(buildingKlass))
      return
    }

    let itemKlass = Item.getKlassByName(klassName)
    if (itemKlass && itemKlass.prototype.isWeapon()) {
      let itemType = itemKlass.prototype.getType()
      let stat = this.getWeaponStat(itemType, itemKlass)
      this.modifyStat(stat, keyValueMap, caller)

      this.sector.setCustomItemStat(itemType, stat)
      caller.showChatSuccess(this.formatWeaponStat(itemKlass))
      return
    }

    let id = parseInt(type)
    let entity = this.game.getPlayerByNameOrId(type) || this.game.getEntity(id)
    if (entity) {
      if (!entity.isMob() && !entity.isBuilding() && !entity.isPlayer() && !entity.isItem()) return
      let stat = this.getEntityStat(entity)
      this.modifyStat(stat, keyValueMap, caller)
      if(stat.usage != null && entity.instance.usage != null) entity.instance.setUsage(stat.usage)
      this.sector.setCustomEntityStat(entity.id, stat)
      caller.showChatSuccess(this.formatEntityStat(entity))
    }
  }

  modifyStat(stat, keyValueMap, caller) {
    for (let key in stat) {
      if (keyValueMap[key]) {
        let value
        if (keyValueMap[key] && keyValueMap[key][0] === '*') {
          // multiplier
          value = stat[key] * parseInt(keyValueMap[key].slice(1))
        } else {
          value = parseInt(keyValueMap[key])
        }
        
        if (this.isStatValid(key, value)) {
          stat[key] = value
        } else if(key != "constructor") {
          caller.showChatError("valid value for " + key + " is " + this.getValidRange(key))
        }
      }
    }
  }

  getValidRange(key) {
    if (key === 'health') {
      return "[0-9999999]"
    } else if (key === 'damage') {
      return "[0-9999999]"
    } else if (key === 'speed') {
      return "[1-15]"
    } else if (key === 'reload') {
      return "[100-10000]"
    } else if (key === 'range') {
      return "[1-4096]"
    } else if (key === 'capacity') {
      return "[1-10000]"
    } else if (key === 'usage') {
      return "[0-10000]"
    }
  }

  isStatValid(key, value) {
    if (isNaN(value)) return false

    switch(key) {
      case 'health':
        return parseInt(value) >= 0 && parseInt(value) <= 9999999
      case 'damage':
        return parseInt(value) >= 0 && parseInt(value) <= 9999999
      case 'speed':
        return parseInt(value) >= 1 && parseInt(value) <= 15
      case 'range':
        return parseInt(value) >= 1 && parseInt(value) <= 4096
      case 'reload':
        return parseInt(value) >= 100 && parseInt(value) <= 10000
      case 'capacity':
        return parseInt(value) >= 1 && parseInt(value) <= 10000
      case 'usage':
        return parseInt(value) >= 0 && parseInt(value) <= 10000
      default: return;
    }
  }

  getMobStat(mobType,mobKlass) {
    if (this.sector.mobCustomStats[mobType]) {
      return this.sector.mobCustomStats[mobType]
    } else {
      return {
        health: mobKlass.prototype.getMaxHealth(),
        damage: mobKlass.prototype.getDamage(),
        speed: mobKlass.prototype.getSpeed(),
        range: mobKlass.prototype.getAttackRange()
      }
    }
  }

  getWeaponStat(itemType,itemKlass) {
    if (this.sector.itemCustomStats[itemType]) {
      return this.sector.itemCustomStats[itemType]
    } else {
      return {
        damage: itemKlass.prototype.getEquipmentDamage(),
        range: itemKlass.prototype.getRange(),
        reload: itemKlass.prototype.getReload(),
        capacity: itemKlass.prototype.getUsageCapacity()
      }
    }
  }

  getBuildingStat(buildingType,buildingKlass) {
    if (this.sector.buildingCustomStats[buildingType]) {
      return this.sector.buildingCustomStats[buildingType]
    }

    if (buildingKlass.prototype.isTower()) {
      return {
        health: buildingKlass.prototype.getMaxHealth(),
        damage: buildingKlass.prototype.getDamage(),
        range: buildingKlass.prototype.getAttackRange()
      }
    } else {
      return {
        health: buildingKlass.prototype.getMaxHealth()
      }
    }
  }

  getEntityStat(entity) {
    if (this.sector.entityCustomStats[entity.id]) {
      return this.sector.entityCustomStats[entity.id]
    }

    if (entity.isItem() && entity.isWeapon()) {
      return {
        damage: entity.getDamage(),
        range: entity.getAttackRange(),
        reload: entity.getReload(),
        usage: entity.instance.usage,
        capacity: entity.instance.getUsageCapacity()
      }
    } else if (entity.isTower()) {
      return {
        health: entity.getMaxHealth(),
        damage: entity.getDamage(),
        range: entity.getAttackRange()
      }
    } else if (entity.isBuilding()) {
      if (this.sector.entityCustomStats[entity.id]) {
        return {
          health: this.sector.entityCustomStats[entity.id].health
        }
      } else {
        return {
          health: entity.getMaxHealth()
        }
      }
    } else if (entity.isMob()) {
      return {
        health: entity.getMaxHealth(),
        damage: entity.getDamage(),
        speed: entity.getSpeed(),
        range: entity.getAttackRange()
      }
    } else if (entity.isPlayer()) {
      return {
        health: entity.getMaxHealth()
      }
    }
  }

  formatMobStat(klass) {
    let type = klass.prototype.getType()

    if (this.sector.mobCustomStats[type]) {
      return `health:${this.sector.mobCustomStats[type].health} ` + 
             `damage:${this.sector.mobCustomStats[type].damage} ` + 
             `speed:${this.sector.mobCustomStats[type].speed} ` + 
             `range:${this.sector.mobCustomStats[type].range}`
    } else {
      return `health:${klass.prototype.getMaxHealth()} ` + 
             `damage:${klass.prototype.getDamage()} ` + 
             `speed:${klass.prototype.getSpeed()} ` + 
             `range:${klass.prototype.getAttackRange()}`
    }
  }

  formatBuildingStat(klass) {
    let type = klass.prototype.getType()

    if (klass.prototype.isTower()) {
      if (this.sector.buildingCustomStats[type]) {
        return `health:${this.sector.buildingCustomStats[type].health} ` + 
               `damage:${this.sector.buildingCustomStats[type].damage} ` + 
               `range:${this.sector.buildingCustomStats[type].range}`
      } else {
        return `health:${klass.prototype.getMaxHealth()} ` + 
               `damage:${klass.prototype.getDamage()} ` + 
               `range:${klass.prototype.getAttackRange()}`
      }
    } else {
      if (this.sector.buildingCustomStats[type]) {
        return `health:${this.sector.buildingCustomStats[type].health} `
      } else {
        return `health:${klass.prototype.getMaxHealth()} ` 
      }
    }
  }

  formatWeaponStat(klass) {
    let type = klass.prototype.getType()

    if (this.sector.itemCustomStats[type]) {
      return `damage:${this.sector.itemCustomStats[type].damage} ` +
             `range:${this.sector.itemCustomStats[type].range} ` +
             `reload:${this.sector.itemCustomStats[type].reload} ` +
             `capacity:${this.sector.itemCustomStats[type].capacity}`
    } else {
      return `damage:${klass.prototype.getEquipmentDamage()} ` +
             `range:${klass.prototype.getRange()} ` +
             `reload:${klass.prototype.getReload()} ` +
             `capacity:${klass.prototype.getUsageCapacity()}`
    }
  }

  formatEntityStat(entity) {
    let stats = {}

    if (this.sector.entityCustomStats[entity.id]) {
      if (entity.isPlayer()) {
        stats['health'] = this.sector.entityCustomStats[entity.id].health
      } else if (entity.isMob()) {
        stats['health'] = this.sector.entityCustomStats[entity.id].health
        stats['damage'] = this.sector.entityCustomStats[entity.id].damage
        stats['speed']  = this.sector.entityCustomStats[entity.id].speed
        stats['range']  = this.sector.entityCustomStats[entity.id].range
      } else if (entity.isBuilding()) {
        if (entity.isTower()) {
          stats['health'] = this.sector.entityCustomStats[entity.id].health
          stats['damage'] = this.sector.entityCustomStats[entity.id].damage
          stats['range']  = this.sector.entityCustomStats[entity.id].range
        } else {
          stats['health'] = this.sector.entityCustomStats[entity.id].health
        }
      } else if (entity.isItem() && entity.isWeapon()) {
        stats['damage']   = this.sector.entityCustomStats[entity.id].damage
        stats['range']    = this.sector.entityCustomStats[entity.id].range
        stats['reload']   = this.sector.entityCustomStats[entity.id].reload
        stats['usage']    = entity.instance.usage
        stats['capacity'] = entity.instance.getUsageCapacity()
      }
    } else {
      if (entity.isMob()) {
        stats['health'] = entity.getMaxHealth()
        stats['damage'] = entity.getDamage()
        stats['speed'] = entity.getSpeed()
        stats['range'] = entity.getAttackRange()
      } else if (entity.isBuilding()) {
        stats['health'] = entity.getMaxHealth()
        if (entity.isTower()) {
          stats['damage'] = entity.getDamage()
          stats['range'] = entity.getAttackRange()
        }
      } else if (entity.isPlayer()) {
        stats['health'] = entity.getMaxHealth()
      } else if (entity.isWeapon()) {
        stats['damage'] = entity.getDamage()
        stats['range'] = entity.getAttackRange()
        stats['reload'] = entity.getReload()
        stats['usage'] = entity.instance.usage
        stats['capacity'] = entity.instance.getUsageCapacity()
      }
    }

    return Object.keys(stats).map((key) => {
      let value = stats[key]
      return `${key}:${value}`
    }).join(" ")
  }
}

module.exports = Stat