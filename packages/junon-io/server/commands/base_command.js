const Helper = require('../../common/helper')
const Constants = require('../../common/constants.json')

class BaseCommand {
  constructor(game) {
    this.game = game
    this.sector = game.sector
  }

  getUsage() {
    return []
  }

  perform() {
    throw "must implement perform"  
  }

  isDelayable() {
    return true
  }

  isJson(text) {
    try {
      JSON.parse(text)
      return true
    } catch(e) {
      return false
    }
  }

  convertKeyValueArgsToObj(keyValueArgs) {
    let obj = {}

    keyValueArgs.forEach((keyValue) => {
      if (keyValue) {
        let key = keyValue.split(":")[0]
        let value = keyValue.split(":")[1]
        obj[key] = value
      }
    })

    return obj
  }

  canExecute(caller) {
    if (!caller.isPlayer()) return true

    let player = caller  
    // validate player can exec command
    if (this.isEnabled()) {
      if (player.isAdminMode) return true
      if (this.game.isMiniGame()) return false

      if (this.isNonSandboxCommand()) return true
      if (!this.game.isPeaceful()) return false

      if (player.isSectorOwner()) return true

      if (this.allowOwnerOnly()) {
        if (player.hasCommandsPermission()) return true
        return false
      }
    } else {
      if (!player.isAdminMode) return false
    }

    return true
  }

  allowOwnerOnly() {
    return false
  }

  execute(caller, args, message) {
    if (!this.canExecute(caller)) return

    if (caller.isPlayer()) {
      this.sector.addCommandLog({
        owner: caller.getTeam(),
        username: caller.name,
        command: "/" + message
      })
    }

    if (this.isArgumentRequired() && args.length === 0 && caller.isPlayer()) {
      this.getUsage().forEach((usage) => {
        caller.showChatSuccess(usage)
      })

      return
    }

    this.perform(caller, args)
  }

  showUsage(caller) {
    this.getUsage().forEach((usage) => {
      caller.showChatSuccess(usage)
    })
  }

  isEnabled() {
    return true
  }

  isArgumentRequired() {
    return true
  }

  isNonSandboxCommand() {
    return false
  }

  getEntitiesByTargetSelector(selector) {
    let match = selector.match(/@(\w+)(\[.+\])?/)
    let range = match[1]
    let condition = match[2]

    let result = []

    if (range === "b") {
      if (this.isRangeSelectorValid(condition)) {
        result = this.getAllBuildingsMatchingCondition(condition)
      } else {
        result = this.getAllBuildings()
      }
    } else if (range === "m") {
      if (this.isRangeSelectorValid(condition)) {
        result = this.getAllMobsMatchingCondition(condition)
      } else {
        result = this.getAllMobs()
      }
    }

    return result
  }


  isRangeSelectorValid(condition) {
    if (!condition) return false
    return condition.match("=") || condition.match("<") || condition.match(">")
  }

  getPlayersByTargetSelector(selector) {
    let match = selector.match(/@(\w+)(\[.+\])?/)
    if (!match) return []
    let range = match[1]
    let condition = match[2]

    let result = []

    if (range === "a") {
      // all
      if (this.isRangeSelectorValid(condition)) {
        result = this.getAllPlayersMatchingCondition(condition)
      } else {
        result = this.getAllPlayers()
      }
    } else if (range === "r") {
      // random
      if (this.isRangeSelectorValid(condition)) {
        result = [this.getRandomPlayerMatchingCondition(condition)]
      } else {
        result = [this.getRandomPlayer()]

      }
    }

    return result
  }

  getRandomPlayer() {
    let players = this.getAllPlayers()
    let index = Math.floor(Math.random() * players.length)
    return players[index]
  }

  getAllPlayers() {
    return Object.values(this.game.players)
  }

  getAllBuildings() {
    return this.game.sector.buildingTree.all()
  }

  getAllMobs() {
    return this.game.sector.mobTree.all()
  }

  getRandomPlayerMatchingCondition(conditions) {
    return this.getAllPlayersMatchingCondition(conditions, { random: true })[0]
  }

  getConditionList(conditions) {
    let conditionList = []
    conditions = conditions.replace("[", "")
    conditions = conditions.replace("]", "")

    conditions.split(",").forEach((condition) => {
      let match = condition.match(/(.*)(<=|<|>|>=|=!|==|=)(.*)/)
      let key = match[1]
      let operator = match[2]
      let value = match[3]
      let object = { key: key, operator: operator, value: value }
      conditionList.push(object)
    })

    // 'c' count key filter should always be last
    let sorted = conditionList.sort((a, b) => {
      if (a.key === 'c') return 1
      if (b.key === 'c') return -1
    })

    return sorted
  }

  getInitialPlayers(conditionList) {
    let regionCondition = conditionList.find((object) => {
      return object.key === "region"
    })

    let players = []
    if (regionCondition) {
      players = this.regionFilter("players", regionCondition.operator, regionCondition.value)
    } else {
      players = this.game.getPlayerList()
    }

    return players
  }

  regionFilter(group, operator, value) {
    if (operator === "=!") {
      let result = {}

      for (let name in this.sector.regions) {
        let region = this.sector.regions[name]
        if (region.name !== value) {
          let entities = region.getEntitiesByGroup(group)
          entities.forEach((entity) => {
            result[entity.id] = entity
          })
        }
      }
      return Object.values(result)
    } else {
      let region = this.sector.getRegion(value)
      if (region) {
        return region.getEntitiesByGroup(group)
      } else {
        return []
      }
    }
  }


  getInitialBuildings(conditionList) {
    let regionCondition = conditionList.find((object) => {
      return object.key === "region"
    })

    let buildings = []
    if (regionCondition) {
      buildings = this.regionFilter("buildings", regionCondition.operator, regionCondition.value)
    } else {
      buildings = this.getAllBuildings()
    }

    return buildings
  }

  getInitialMobs(conditionList) {
    let regionCondition = conditionList.find((object) => {
      return object.key === "region"
    })

    let mobs = []
    if (regionCondition) {
      mobs = this.regionFilter("mobs", regionCondition.operator, regionCondition.value)
    } else {
      mobs = this.getAllMobs()
    }

    return mobs
  }

  getAllPlayersMatchingCondition(conditions, options = {}) {
    let conditionList = this.getConditionList(conditions)
    let players = this.getInitialPlayers(conditionList)

    if (options.random) {
      Helper.shuffleArray(players)
    }

    let collection = players

    for (let index in conditionList) {
      let object = conditionList[index]
      let key = object.key
      let operator = object.operator
      let value = object.value

      let result = []

      if (key === "c") {
        collection = this.countFilter(collection, operator, value)
      } else if (key === "role") {
        collection = this.roleFilter(collection, operator, value)
      } else if (key === "team") {
        collection = this.teamFilter(collection, operator, value)
      } else if (key === "locale") {
        collection = this.localeFilter(collection, operator, value)
      } else if (key === "health") {
        collection = this.healthFilter(collection, operator, value)
      } else if (key === "stamina") {
        collection = this.staminaFilter(collection, operator, value)
      } else if (key === "oxygen") {
        collection = this.oxygenFilter(collection, operator, value)
      } else if (key === "hunger") {
        collection = this.hungerFilter(collection, operator, value)
      } else if (key === "speed") {
        collection = this.speedFilter(collection, operator, value)
      } else if (key === "gold") {
        collection = this.goldFilter(collection, operator, value)
      } else if (key === "score") {
        collection = this.scoreFilter(collection, operator, value)
      }
    }

    return collection
  }


  getAllBuildingsMatchingCondition(conditions, options = {}) {
    let conditionList = this.getConditionList(conditions)

    let collection = this.getInitialBuildings(conditionList)

    for (let index in conditionList) {
      let object = conditionList[index]
      let key = object.key
      let operator = object.operator
      let value = object.value

      let result = []

      if (key === "c") {
        collection = this.countFilter(collection, operator, value)
      } else if (key === "type") {
        collection = this.typeFilter(collection, operator, value)
      } else if (key === "health") {
        collection = this.healthFilter(collection, operator, value)
      } else if (key === "owner") {
        collection = this.ownerFilter(collection, operator, value)
      } else if (key === "team") {
        collection = this.teamFilter(collection, operator, value)
      }
    }

    return collection
  }

  getAllMobsMatchingCondition(conditions, options = {}) {
    let conditionList = this.getConditionList(conditions)
    let collection = this.getInitialMobs(conditionList)

    for (let index in conditionList) {
      let object = conditionList[index]
      let key = object.key
      let operator = object.operator
      let value = object.value

      let result = []

      if (key === "c") {
        collection = this.countFilter(collection, operator, value)
      } else if (key === "type") {
        collection = this.typeFilter(collection, operator, value)
      } else if (key === "health") {
        collection = this.healthFilter(collection, operator, value)
      } else if (key === "hunger") {
        collection = this.hungerFilter(collection, operator, value)
      } else if (key === "owner") {
        collection = this.ownerFilter(collection, operator, value)
      } else if (key === "team") {
        collection = this.teamFilter(collection, operator, value)
      } else if (key === "speed") {
        collection = this.speedFilter(collection, operator, value)
      }
    }

    return collection
  }

  countFilter(collection, operator, value) {
    let result = []

    //count
    let count = parseInt(value)
    let i = 0
    collection.forEach((player) => {
      if (i < count) {
        result.push(player)
        i++
      }
    })

    return result
  }

  ownerFilter(collection, operator, value) {
    let result = []

    let name = value
    collection.forEach((entity) => {
      let ownerNameWithoutSpace = entity.getOwnerName().replace(/\s+/g, "")
      if (operator === "=!") {
        if (ownerNameWithoutSpace !== name) {
          result.push(entity)
        }
      } else {
        if (ownerNameWithoutSpace === name) {
          result.push(entity)
        }
      }
    })

    return result
  }

  normalizeSeedName(targetType) {
    Object.keys(Constants.Crops).forEach((seedName) => {
      let plantName = seedName.replace("Seed", "Plant")
      targetType = targetType.replace(plantName, seedName)
    })

    return targetType
  }

  typeFilter(collection, operator, value) {
    let result = []

    let targetType = this.sector.klassifySnakeCase(value)

    targetType = this.normalizeSeedName(targetType)

    collection.forEach((entity) => {
      if (operator === "=!") {
        if (entity.getTypeName() !== targetType) {
          result.push(entity)  
        }
      } else {
        if (entity.getTypeName() === targetType) {
          result.push(entity)  
        }
      }
    })

    return result
  }

  roleFilter(collection, operator, value) {
    let result = []

    let targetRole = value
    collection.forEach((player) => {
      if (operator === "=!") {
        if (!player.getRole()) {
          result.push(player)
        } else if (player.getRole().name !== targetRole) {
          result.push(player)  
        }
      } else {
        if (player.getRole() && player.getRole().name === targetRole) {
          result.push(player)  
        }
      }
    })

    return result
  }

  teamFilter(collection, operator, value) {
    let result = []

    let targetTeam = value
    collection.forEach((entity) => {
      if (operator === "=!") {
        if (!entity.getTeam()) {
          result.push(entity)
        } else if (entity.getTeam().name !== targetTeam) {
          result.push(entity)  
        }
      } else {
        if (entity.getTeam() && entity.getTeam().name === targetTeam) {
          result.push(entity)  
        }
      }
    })

    return result
  }

  localeFilter(collection, operator, value) {
    let result = [] 

    let locale = value

    collection.forEach((player) => {
      if (operator === "=!") {
        if (player.locale !== locale) {
          result.push(player)
        }
      } else {
        if (player.locale === locale) {
          result.push(player)
        }
      }
    })

    return result
  }

  healthFilter(collection, operator, value) {
    let result = []

    value = parseInt(value)

    collection.forEach((entity) => {
      if (this.logicalMatch(entity.getHealth(), operator, value)) {
        result.push(entity)
      }
    })

    return result
  }

  speedFilter(collection, operator, value) {
    let result = []

    value = parseInt(value)

    collection.forEach((entity) => {
      if (this.logicalMatch(entity.getSpeed(), operator, value)) {
        result.push(entity)
      }
    })

    return result
  }

  goldFilter(collection, operator, value) {
    let result = []

    value = parseInt(value)

    collection.forEach((entity) => {
      if (this.logicalMatch(entity.getGold(), operator, value)) {
        result.push(entity)
      }
    })

    return result
  }

  scoreFilter(collection, operator, value) {
    let result = []

    value = parseInt(value)

    collection.forEach((entity) => {
      if (this.logicalMatch(entity.score, operator, value)) {
        result.push(entity)
      }
    })

    return result
  }

  staminaFilter(collection, operator, value) {
    let result = []

    value = parseInt(value)

    collection.forEach((entity) => {
      if (this.logicalMatch(entity.getStamina(), operator, value)) {
        result.push(entity)
      }
    })

    return result
  }

  hungerFilter(collection, operator, value) {
    let result = []

    value = parseInt(value)

    collection.forEach((entity) => {
      if (this.logicalMatch(entity.getHunger(), operator, value)) {
        result.push(entity)
      }
    })

    return result
  }

  oxygenFilter(collection, operator, value) {
    let result = []

    value = parseInt(value)

    collection.forEach((entity) => {
      if (this.logicalMatch(entity.getOxygen(), operator, value)) {
        result.push(entity)
      }
    })

    return result
  }

  logicalMatch(left, operator, right) {
    if (operator === "=!") {
      return left !== right
    } else if (operator === "<") {
      return left < right
    } else if (operator === "<=") {
      return left <= right
    } else if (operator === ">") {
      return left > right
    } else if (operator === ">=") {
      return left >= right
    } else if (operator === "=") {
      return left === right
    }
  }

  getPlayersBySelector(selector) {
    if (!selector) return []
      
    if (selector[0] === "@") {
      return this.getPlayersByTargetSelector(selector)
    } else {
      return [this.game.getPlayerByNameOrId(selector)].filter((player) => { 
        return player 
      })
    }
  }

  getEntitiesBySelector(selector) {
    if (!selector) return []
      
    let players = this.getPlayersBySelector(selector)
    if (players.length > 0) return players

    if (selector[0] === "@") {
      return this.getEntitiesByTargetSelector(selector)
    } else {
      return [this.game.getEntity(selector)].filter((entity) => { 
        return entity 
      })
    }
  }

}

module.exports = BaseCommand