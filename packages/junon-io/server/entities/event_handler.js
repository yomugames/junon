/*
  eval is dangerous. add whitelist..
*/

const Trigger = require("./trigger")
const Protocol = require('../../common/util/protocol')
const Helper = require('../../common/helper')
const Constants = require('../../common/constants.json')

class EventHandler {
  constructor(sector) {
    this.sector = sector
    this.game = sector.game
    this.triggers = {}
    this.variables = {}
    this.scoreIndexByPlayer = {}
    this.logs = []
    this.commandDelay = 0

    this.BREAK_EXPRESSION = "debug" + "ger" // avoid git hook from detecting
    this.isRoundStarted = false
    this.isRoundStarting = false
  }

  getSocketUtil() {
    return this.game.server.socketUtil
  }

  delayNextCommands(seconds) {
    this.commandDelay += seconds
  }

  getMiniGame() {
    return this.sector.miniGame
  }

  displayRaidWarning() {
    this.game.forEachPlayer((player) => {
      this.game.eventManager.emitEvent(player, "RaidWarning")
    })
  }

  getPlacerId(entityId) {
    let entity = this.game.getEntity(entityId)
    if (!entity) return 0

    return entity.getPlacer() && entity.getPlacer().id
  }

  pauseGame() {
    this.game.pause()
  }

  pauseCooldown() {
    this.game.pauseCooldown()
  }

  shouldPreventTimer(timer) {
    if (timer.name === "RoundStartTimer") {
      return this.isRoundStarted
    }

    return false
  }

  triggerTimerStart(timer) {
    if (this.shouldPreventTimer(timer)) return

    let name = "Timer:" + timer.name + ":start"
    this.trigger(name)
    this.trigger("Timer:start", { name: timer.name })

    this.handleOfficialTimer(name)
  }

  getAliveTeam() {
    let alivePlayers = this.game.getAlivePlayers()
    let player = Object.values(alivePlayers)[0]
    return player.getTeam().name
  }

  getTeam(playerId) {
    return this.getTeamName(playerId)
  }

  getRole(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return ""

    return player.getRoleName()
  }

  isLoggedIn(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return false

    return player.isLoggedIn()
  }

  getScore(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return 0

    return player.score
  }

  _safeNumber(value) {
    if (value === null || value === undefined) return 0
    
    if (typeof value === 'boolean') return value ? 1 : 0
    
    const num = parseFloat(value)
    
    if (isNaN(num)) {
      const match = value.toString().match(/-?\d+(\.\d+)?/)
      return match ? parseFloat(match[0]) : 0
    }
    
    return num
  }

  _fixFloat(value, precision = 12) {
    const factor = Math.pow(10, precision)
    return Math.round(value * factor) / factor
  }

  add(...values) {
    return values.reduce((sum, val) => sum + this._safeNumber(val), 0)
  }

  subtract(...values) {
    if (values.length === 0) return 0
    const initial = this._safeNumber(values[0])
    return values.slice(1).reduce((result, val) => result - this._safeNumber(val), initial)
  }

  multiply(...values) {
    if (values.length === 0) return 0
    return values.reduce((product, val) => product * this._safeNumber(val), 1)
  }

  divide(...values) {
    if (values.length === 0) return 0
    const initial = this._safeNumber(values[0])
    
    return values.slice(1).reduce((result, val) => {
      const num = this._safeNumber(val)
      return num === 0 ? NaN : result / num
    }, initial)
  }

  round(value, precision = 0) {
    const num = this._safeNumber(value)
    const prec = this._safeNumber(precision)
    
    if (prec === 0) return this._fixFloat(Math.round(num))
    
    const factor = Math.pow(10, prec)
    const result = Math.round(num / factor) * factor
    return this._fixFloat(result, Math.max(12, -prec + 2))
  }

  modulo(value1, value2) {
    return parseInt(value1) % parseInt(value2)
  }

  pow(base, exponent) {
    return Math.pow(this._safeNumber(base), this._safeNumber(exponent))
  }

  root(value, degree = 2) {
    const numValue = this._safeNumber(value)
    const numDegree = this._safeNumber(degree)
    
    if (numValue < 0 && numDegree % 2 === 0) {
      return NaN
    }
    
    return Math.pow(numValue, 1 / numDegree)
  }

  abs(value) {
    return Math.abs(this._safeNumber(value))
  }

  log(value, base = Math.E) {
    const numValue = this._safeNumber(value)
    const numBase = this._safeNumber(base)
    
    if (numValue <= 0 || numBase <= 0 || numBase === 1) {
      return NaN
    }
    
    return Math.log(numValue) / Math.log(numBase)
  }

  floor(value, precision = 0) {
    const num = this._safeNumber(value)
    const prec = this._safeNumber(precision)
    
    if (prec === 0) return this._fixFloat(Math.floor(num))
    
    const factor = Math.pow(10, prec)
    const result = Math.floor(num / factor) * factor
    return this._fixFloat(result, Math.max(12, -prec + 2))
  }

 ceil(value, precision = 0) {
    const num = this._safeNumber(value)
    const prec = this._safeNumber(precision)
    
    if (prec === 0) return this._fixFloat(Math.ceil(num))
    
    const factor = Math.pow(10, prec)
    const result = Math.ceil(num / factor) * factor
    return this._fixFloat(result, Math.max(12, -prec + 2))
  }

  min(...values) {
    if (values.length === 0) return Infinity
    return Math.min(...values.map(v => this._safeNumber(v)))
  }
  
  max(...values) {
    if (values.length === 0) return -Infinity
    return Math.max(...values.map(v => this._safeNumber(v)))
  }

  sin(degrees) {
    const deg = this._safeNumber(degrees)
    return this._fixFloat(Math.sin(deg * Math.PI / 180))
  }

  cos(degrees) {
    const deg = this._safeNumber(degrees)
    return this._fixFloat(Math.cos(deg * Math.PI / 180))
  }

  tan(degrees) {
    const deg = this._safeNumber(degrees)
    if (Math.abs(deg % 180) === 90) return NaN
    return this._fixFloat(Math.tan(deg * Math.PI / 180))
  }

  asin(value) {
    const num = this._safeNumber(value)
    if (num < -1 || num > 1) return NaN
    return this._fixFloat(Math.asin(num) * 180 / Math.PI)
  }

  acos(value) {
    const num = this._safeNumber(value)
    if (num < -1 || num > 1) return NaN
    return this._fixFloat(Math.acos(num) * 180 / Math.PI)
  }

  atan(value) {
    const num = this._safeNumber(value)
    return this._fixFloat(Math.atan(num) * 180 / Math.PI)
  }

  getAngle(entityId) {
    let player = this.getPlayer(entityId)
    let angle = 0

    if (player && typeof player.angle === 'number') {
      angle = player.angle
    } else {
      let entity = this.game.getEntity(entityId)
      if (entity && typeof entity.angle === 'number') {
        angle = entity.angle
      }
    }

    angle = ((angle % 360) + 360) % 360
    return angle
  }

  length(value) {
    return value.toString().length
  }

  getEquip(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return ""

    let item = player.getActiveItem()
    if (!item) return ""

    return item.getTypeName()
  }

  getEquipId(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return ""

    let item = player.getActiveItem()
    if (!item) return ""

    return item.getId()
  }

  getArmorEquip(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return ""

    let equipment = player.getArmorEquip()
    if (!equipment) return ""

    return equipment.getTypeName()
  }

  getPlatformByCoords(row, col) {
    let platform = this.sector.platformMap.get(row, col)
    if(!platform) return ''
    let id = platform.id

    if(id) return id

    return ''
  }

  getStructureByCoords(row, col) {
    let structure = this.sector.structureMap.get(row, col)
    if(!structure) return ''
    let id = structure.id

    if(id) return id

    return ''
  }

  getOxygen(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return 0

    return player.getOxygen()
  }

  getStamina(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return 0

    return player.stamina
  }

  getSpeed(entityId) {
    let player = this.getPlayer(entityId)
    if (player) return player.speed

    let entity = this.game.getEntity(entityId)
    if (entity.isMob()) {
      return entity.speed
    }

    return 0
  }

  getRegionPlayerCount(regionName) {
    let region = this.sector.getRegion(regionName)
    if (!region) return 0

    return region.getPlayerCount()
  }

  getEquipCount(entityId) {
    let player = this.getPlayer(entityId)
    if (!player) return 0

    if (!player.getActiveItem()) {
      return 0
    }

    return player.getActiveItem().count
  }

  getInventoryItemCount(entityId, typeName) {
    let player = this.getPlayer(entityId)
    if (!player) return 0

    return player.getInventoryItemCount(typeName)
  }

  getContent(entityId) {
    let entity = this.game.getEntity(entityId)
    let content = entity.content
    if(!entity || !content) return ''

    return content    
  }

  getRegion(entityId) {
    let player = this.getPlayer(entityId)
    if (player) {
      if (player.getRegion()) {
        return player.getRegion().name
      } else {
        return ""
      }
    }

    let entity = this.game.getEntity(entityId)
    if (entity && typeof entity.getRegion === 'function') {
      if (entity.getRegion()) {
        return entity.getRegion().name
      } else {
        return ""
      }
    }

    return ""
  }

  getTeamMemberCount(teamName) {
    let team = this.game.getTeamByName(teamName)
    if (!team) return 0

    return team.getMemberCount()
  }

  getRoleMemberCount(roleName) {
    return this.getAlivePlayerCountForRole(roleName)
  }

  getHunger(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return 0

    return player.hunger
  }

  getOwner(entityId) {
    let entity = this.game.getEntity(entityId)
    if (!entity) return ""

    if (!entity.getOwner()) return ""

    return entity.getOwner().name
  }

  getTeamName(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return ""

    if (!player.getTeam()) return ""

    return player.getTeam().name
  }

  getHostileMobCount() {
    return this.sector.getHostileMobCount()
  }

  getFriendlyMobCount() {
    return this.sector.neutralMobCount
  }

  increasePlayerScore(playerId, amount) {
    let player = this.getPlayer(playerId)
    if (player) {
      player.increaseScore(amount)
    }
  }

  getPlayerScore(playerId) {
    let player = this.getPlayer(playerId)
    if (player) {
      return player.score
    } else {
      return 0
    }
  }

  getGold(player) {
    return this.getPlayerGold(player)
  }

  getPlayerGold(playerId) {
    let player = this.getPlayer(playerId)
    if (player) {
      return player.gold
    } else {
      return 0
    }
  }

  getLevel(entityId) {
    let entity = this.game.getEntity(entityId)
    if (!entity) return 0

    return entity.level
  }

  getEntityTypeName(entityId) {
    let entity = this.game.getEntity(entityId)
    if (!entity) return ""

    return entity.getTypeName()
  }

  getScoreIndex(playerId) {
    return this.scoreIndexByPlayer[playerId]
  }

  setScoreIndex(playerId, index) {
    this.scoreIndexByPlayer[playerId] = index
  }

  allocateScoreIndexToPlayers(startIndex = 1) {
    let index = startIndex

    this.game.forEachPlayer((player) => {
      this.setScoreIndex(player.id, index)
      index++
    })
  }

  getTeamIndex(playerId) {
    let player = this.game.players[playerId]
    if (!player) return 0

    if (!player.getTeam()) return 0

    return player.getTeam().scoreIndex || 0
  }

  getAngle(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return 0
    return player.angle
  }

  getTeamColor(playerId) {
    let player = this.game.players[playerId]
    if (!player) return 'f'

    if (!player.getTeam()) return 'f'

    return player.getTeam().scoreColor || 'f'
  }

  assignSpaceSuitColor(playerId) {
    let colors = this.getNonTakenSuitColors()
    let index = Math.floor(Math.random() * colors.length)
    let color = colors[index]

    this.changeSuitColor(playerId, color)
  }

  getNonTakenSuitColors() {
    return this.getAvailableSuitColors().filter((color) => {
      let isColorTaken = false

      this.game.forEachPlayer((player) => {
        if (player.getArmorEquipment() &&
            player.getArmorEquipment().content === color) {
          isColorTaken = true
        }
      })

      return !isColorTaken
    })
  }

  reduceFov() {
    this.game.forEachPlayer((player) => {
      if (player.getRole().name === 'crew') {
        player.setViewDistance(Constants.tileSize * 4)
      }
    })
  }

  restoreFov() {
    this.game.forEachPlayer((player) => {
      player.setViewDistance(Constants.tileSize * 12)
    })
  }

  getAvailableSuitColors() {
    return ["gray", "red", "green", "blue", "orange", "purple", "yellow", "black"]
  }

  changeSuitColor(playerId, color) {
    let player = this.game.players[playerId]
    if (!player) return

    player.changeSuitColor(color)
  }

  spawnPlayerCorpse(playerId) {
    let player = this.game.players[playerId]
    if (!player) return

    this.sector.spawnCorpse({ player: player, type: "Human", x: player.getX(), y: player.getY(), name: player.name })
  }

  throwPlayerInventory(playerId) {
    let player = this.game.players[playerId]
    if (!player) return

    player.throwAllInventory()
  }

  throwPlayerInventoryExceptSurvivalTool(playerId) {
    let player = this.game.players[playerId]
    if (!player) return

    player.throwAllInventoryExceptSurvivalTool()
  }

  triggerTimerTick(timer) {
    if (this.shouldPreventTimer(timer)) return

    let name = "Timer:" + timer.name + ":tick"
    let params = {
      "seconds": timer.tick,
      "remaining": timer.duration - timer.tick
    }
    this.trigger(name, params)

    params["name"] = timer.name

    this.trigger("Timer:tick", params)
  }


  triggerTimerEnd(timer) {
    if (this.shouldPreventTimer(timer)) return

    let name = "Timer:" + timer.name + ":end"
    this.trigger(name)
    this.trigger("Timer:end", { name: timer.name })

    this.handleOfficialTimer(name)
  }

  handleOfficialTimer(name) {
    if (name === "Timer:RoundStartTimer:end") {
      this.isRoundStarted = true
      this.roundStartTimestamp = this.game.timestamp
      this.game.onRoundStarted()
    }

    if (name === "Timer:RoundStartTimer:start") {
      this.isRoundStarting = true
    }
  }

  formatTime(seconds) {
    return this.stringifyTimeShort(seconds)
  }

  stringifyTimeShort(seconds) {
    return Helper.stringifyTimeShort(seconds)
  }

  hasReachedMaxVariableCount() {
    return Object.keys(this.variables).length >= 100
  }

  loadVariables(variables) {
    for (let key in variables) {
      this.variables[key] = variables[key]
    }
  }

  setVariable(key, value) {
    this.variables[key] = value
  }

  getVariable(key) {
    return this.variables[key]
  }

  hasVariable(key) {
    return this.variables.hasOwnProperty(key)
  }

  removeVariable(key) {
    delete this.variables[key]
  }

  addTrigger(data) {
    new Trigger(this, data)
  }

  getRailStopCount(entityId) {
    let entity = this.game.getEntity(entityId)
    if (!entity.railNetwork) return 0

    return Object.keys(entity.railNetwork.stops).length
  }

  getRoom(id) {
    return this.sector.roomManager.rooms[id]
  }

  isWatered(id) {
    let entity = this.game.getEntity(id)
    if (!entity) return false

    return !!entity.isWatered
  }

  getLocale(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return "en"
    return player.locale
  }

  getRole(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return ""
    if (!player.getRole()) return ""
    return player.getRole().name
  }

  getPlayer(playerId) {
    let player = this.game.getPlayerByNameOrId(playerId)
    if (!player) return null
    return player
  }

  getPlayerName(playerId) {
    let player = this.getPlayer(playerId)
    if (!player) return null
    return player.getName()
  }

  getAllPlayers() {
    return Object.values(this.game.players).map((player) => {
      return { playerId: player.id }
    })
  }

  getFollowingId(entityId) {
    let mob = this.game.getEntity(entityId)
    if (!mob) return
    if (!mob.master) return

    return mob.master.getId()
  }

  getHealth(entityId) {
    let player = this.getPlayer(entityId)
    if (player) {
      return player.health
    }

    let entity = this.game.getEntity(entityId)
    if (!entity) return 0

    return entity.health
  }

  getRow(entityId) {
    let player = this.getPlayer(entityId)
    if (player) {
      return player.getRow()
    }

    let entity = this.game.getEntity(entityId)
    if (!entity) return 0

    return entity.getRow()
  }

  getCol(entityId) {
    let player = this.getPlayer(entityId)
    if (player) {
      return player.getCol()
    }

    let entity = this.game.getEntity(entityId)
    if (!entity) return 0

    return entity.getCol()
  }

  getMaxHealth(entityId) {
    let player = this.getPlayer(entityId)
    if (player) {
      return player.getMaxHealth()
    }

    let entity = this.game.getEntity(entityId)
    if (!entity) return 0

    return entity.getMaxHealth()
  }

  getMaxOxygen(entityId) {
    let player = this.getPlayer(entityId)
    if (player) {
      return player.getMaxOxygen()
    }

    return 0
  }

  getBuildingType(entityId) {
    let entity = this.game.getEntity(entityId)

    if (!entity) return ""

    if (typeof entity.getTypeName === 'function') {
      return entity.getTypeName()
    }

    return entity.type || ""
  }

  getEntityType(entityId) {
    let player = this.game.getPlayerByName(entityId)
    if (player) {
      return "Player"
    }

    let entity = this.game.getEntity(entityId)

    if (!entity) return ""

    if (entity.isPlayer()) {
      return "Player"
    }

    if (typeof entity.getTypeName === 'function') {
      return entity.getTypeName()
    }

    return entity.type || ""
  }

  hasEffect(entityId, effectName) {
    let player = this.getPlayer(entityId)
    if (player) {
      return player.hasEffect(effectName) ? true : false
    }
    
    let entity = this.game.getEntity(entityId)
    if (!entity) return false
      return entity.hasEffect(effectName) ? true : false
  }

  getTotalMobCount() {
    const hostileCount = this.sector.getHostileMobCount();
    const friendlyCount = this.sector.neutralMobCount;
    return hostileCount + friendlyCount;
  }

  getDay() {
    return this.game.sector.getDayCount()
  }

  getHour() {
    return this.game.sector.getHour()
  }

  getMaxStamina(entityId) {
    let player = this.getPlayer(entityId)
    if (player) {
      return player.getMaxStamina()
    }

    return 0
  }

  getMaxHunger(entityId) {
    let player = this.getPlayer(entityId)
    if (player) {
      return player.getMaxHunger()
    }

    return 0
  }

  startVote() {
    this.sector.voteManager.start()
  }

  endRoundStart() {
    this.isRoundEnding = true
    this.game.forEachPlayer((player) => {
      this.getSocketUtil().emit(player.getSocket(), "EndGame", { isCountdown: true })
    })
  }

  isPublicGame() {
    return !this.sector.isPrivate
  }

  endRound() {
    this.game.forEachPlayer((player) => {
      this.getSocketUtil().emit(player.getSocket(), "EndGame", {})
    })

    this.game.onRoundEnded()
  }

  getPlayerCount() {
    return this.game.getPlayerCount()
  }

  getChunkRegionAt(row, col) {
    return this.sector.getChunkRegionAt(row, col)
  }

  getSeedAt(row, col) {
    let entity = this.sector.distributionMap.get(row, col)
    if (!entity) return 0
    return entity.id
  }

  getAlivePlayerCount() {
    return Object.keys(this.game.getAlivePlayers()).length
  }

  getAlivePlayerCountForRole(role) {
    let alivePlayers = this.game.getAlivePlayers((player) => {
      return player.getRole() && player.getRole().name === role
    })
    return Object.keys(alivePlayers).length
  }

  isConditionMet(conditions, params) {
    let result = false

    if (!conditions) return false

    conditions.forEach((condition) => {
      if (condition.comparison) {
        result = this.evalComparison(condition.comparison, params)
      } else if (condition.and) {
        result = result && this.evalComparison(condition.and.comparison, params)
      }
    })

    return result
  }

  evalComparison(comparison, params) {
    if (comparison.commandBlock) {
      // from user input
      return this.safeEvalComparison(comparison, params)
    } else {
      let expression = [comparison.value1, comparison.operator, comparison.value2].join(" ")
      expression = this.interpolate(expression, params)
      return eval(expression)
    }
  }

  safeEvalComparison(comparison, params) {
    let safeValue1 = this.interpolate(comparison.value1, params, { dontQuoteString: true })
    let safeValue2 = this.interpolate(comparison.value2, params, { dontQuoteString: true })
    let operator = comparison.operator
    let result

    switch(operator) {
      case "==":
        result = safeValue1 == safeValue2
        break
      case "!=":
        result = safeValue1 != safeValue2
        break
      case ">":
        result = parseInt(safeValue1) > parseInt(safeValue2)
        break
      case "<":
        result = parseInt(safeValue1) < parseInt(safeValue2)
        break
      case ">=":
        result = parseInt(safeValue1) >= parseInt(safeValue2)
        break
      case "<=":
        result = parseInt(safeValue1) <= parseInt(safeValue2)
        break
      case "=~":
        result = !!safeValue1.toString().includes(safeValue2.toString())
        break
      default:
        return false
    }

    let message = `[${result}] ` + [safeValue1, operator, safeValue2].join(" ")
    this.queueLog({ type: 'condition', message: message })

    return result
  }

  getObjectivesCountForRole(role) {
    let count = 0

    for (let name in this.sector.objectives) {
      let objective = this.sector.objectives[name]
      if (objective.isForRole(role)) {
        count++
      }
    }

    return count
  }

  getCompletedObjectivesCount(role) {
    let count = 0

    for (let name in this.sector.objectives) {
      let objective = this.sector.objectives[name]
      if (objective.isCompleted && objective.isForRole(role)) {
        count++
      }
    }

    return count
  }

  trigger(eventName, params) {
    let trigger = this.triggers[eventName]
    if (!trigger) return

    let paramsJson = JSON.stringify(params)
    this.queueLog({ type: 'event', message: eventName })
    this.queueLog({ type: 'params', message: paramsJson })

    try {
      if (trigger.constructor.name === 'Trigger') {
        this.runActions(trigger.actions, params)
        return
      }


      let triggerMap = trigger
      for (let id in triggerMap) {
        let trigger = triggerMap[id]

        if (trigger.objective) {
          params = Object.assign({}, params, trigger.objective.params)
        }

        if (trigger.condition) {
          if (debugMode && trigger.break) {
            eval(this.BREAK_EXPRESSION)
          }

          if (this.isConditionMet(trigger.condition, params)) {
            this.runActions(trigger.actions, params)
          }
        } else {
          this.runActions(trigger.actions, params)
        }
      }
    } catch(e) {
      this.game.captureException(e)
      this.queueLog({ type: 'error', message: 'unknown error' })
    }
  }

  updateTaskCompleted() {
    let taskCompleted = this.getCompletedObjectivesCount('crew')
    let totalTasks = this.getObjectivesCountForRole('crew')

    this.game.forEachPlayer((player) => {
      this.getSocketUtil().emit(player.getSocket(), "UpdateStats", {
        totalTasks: totalTasks,
        taskCompleted: taskCompleted
      })
    })
  }

  runIfThenElse(object, params) {
    if (debugMode && object.break) {
      eval(this.BREAK_EXPRESSION)
    }

    if (this.isConditionMet(object.if, params)) {
      this.runActions(object.then, params)
    } else {
      this.runActions(object.else, params)
    }
  }

  runActions(actions, params) {
    actions.forEach((action) => {
      this.runAction(action, params)
    })
  }

  setHealth(entityId, health) {
    let entity = this.game.getEntity(entityId)
    if (!entity) return

    if (typeof entity.setHealth === 'function') {
      entity.setHealth(entityId, health)
    }
  }

  getFlameCount() {
    return this.sector.getFlameCount()
  }

  runAction(action, params) {
    this.commandDelay = 0 // always reset command delay at beginning

    if (action.timer) {
      if (action.timer.shouldRemove) {
        this.game.removeTimer(action.timer)
      } else {
        this.game.addTimer(action.timer)
      }
    } else if (action.ifthenelse) {
      this.runIfThenElse(action.ifthenelse, params)
    } else if (action.commands) {
      action.commands.forEach((command) => {
        let newCommand

        if (command.commandBlock) {
          newCommand = this.interpolate(command.value, params, { dontQuoteString: true })
        } else {
          newCommand = this.interpolate(command, params)
        }

        this.queueLog({ type: 'command', message: newCommand })
        this.game.executeCommand(this.sector, newCommand, this.commandDelay)
      })
    } else if (action.rawCommands) {
      action.rawCommands.forEach((rawCommand) => {
        this.game.executeCommand(this.sector, rawCommand, this.commandDelay)
      })
    } else if (action.function) {
      let newFunction = this.interpolate(action.function, params)
      eval(newFunction)
    } else if (action.forEach) {
      let iterator = eval(action.forEach.iterator)
      iterator.forEach((params) => {
        this.runActions(action.forEach.actions, params)
      })
    }
  }

  queueLog(data) {
    let creator = this.game.getCreator()
    if (!creator) return

    this.logs.push(data)
  }

  flushLogs() {
    const isOneSecondInterval = this.game.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    if (this.logs.length > 0) {
      this.forEachPlayersWithCommands((player) => {
        this.getSocketUtil().emit(player.getSocket(), "CommandEventLogList", { logs: this.logs })
      })

      this.logs = []
    }
  }

  forEachPlayersWithCommands(cb) {
    for (let id in this.game.players) {
      let player = this.game.players[id]
      if (player.hasCommandsPermission()) {
        cb(player)
      }
    }
  }

  isChance(percent) {
    return Math.random() <= percent
  }

  random(min, max) {
    if (!max) {
      max = parseInt(min)
      if (isNaN(max)) return 0
      return Math.floor(Math.random() * max)
    }

    min = parseInt(min)
    max = parseInt(max)
    if (isNaN(min) || isNaN(max)) return 0

    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  isVariableInvalid(key) {
    return key.match(/[^a-zA-Z0-9_$]/)
  }

  interpolateVariables(result, params, options = {}) {
    for (let key in params) {
      if (this.isVariableInvalid(key)) continue

      let value = params[key]

      if (typeof value === 'string') {
        if (!options.dontQuoteString) {
          value = "'" + value + "'" // so it'll be evaled as string instead of variable
        }
      }

      let regexp = new RegExp("\\{" + key + "\\}", "g")
      result = result.replace(regexp, value)

      regexp = new RegExp("\\$" + key + "\\b", "g")
      result = result.replace(regexp, value)
    }

    return result
  }

  getFunctionList() {
    return Object.keys(this.getFunctionTable())
  }

  getFunctionTable() {
    return {
      "$getGold": true,
      "$getTeam": true,
      "$getScore": true,
      "$getEquip": true,
      "$getRole": true,
      "$getHealth": true,
      "$getStamina": true,
      "$getSpeed": true,
      "$getOxygen": true,
      "$getHunger": true,
      "$getMaxHealth": true,
      "$getMaxStamina": true,
      "$getMaxOxygen": true,
      "$getMaxHunger": true,
      "$getOwner": true,
      "$random": true,
      "$formatTime": true,
      "$getTeamMemberCount": true,
      "$getRoleMemberCount": true,
      "$getPlayerCount": true,
      "$getRow": true,
      "$getCol": true,
      "$getRegionPlayerCount": true,
      "$getRegion": true,
      "$getEquipCount": true,
      "$getInventoryItemCount": true,
      "$getArmorEquip": true,
      "$add": true,
      "$subtract": true,
      "$multiply": true,
      "$divide": true,
      "$round": true,
      "$modulo": true,
      "$pow": true,
      "$root": true,
      "$abs": true,
      "$log": true,
      "$min": true,
      "$max": true,
      "$floor": true,
      "$ceil": true,
      "$isLoggedIn": true,
      "$getEquipId": true,
      "$getBuildingType": true,
      "$getDay": true,
      "$getHour": true,
      "$getContent": true,
      "$getPlatformByCoords": true,
      "$getStructureByCoords": true,
      "$hasEffect": true,
      "$getTotalMobCount": true,
      "$getAngle": true,
      "$sin": true,
      "$cos": true,
      "$tan": true,
      "$asin": true,
      "$acos": true,
      "$atan": true,
      "$getEntityType" : true,
    }
  }

  buildFunctionMatchRegex() {
    let list = this.getFunctionList().map((funcName) => {
      return funcName.replace("$", "\\$")
    })

    let functions = "(" + list.join("|") + ")"
    let argument = "\\((.*?)\\)"
    let regex = new RegExp(functions + argument, "g")
    return regex
  }

  runFunction(funcName, args) {
    let actualFuncName = funcName.replace("$", "")
    let func = this[actualFuncName]
    if (!func) return

    return func.call(this, ...args)
  }

  hasFunction(funcName) {
    return this.getFunctionTable()[funcName]
  }

  interpolateFunctions(result) {
    let chars = result.split("")
    let functionBuffer = ""
    let resultBuffer = ""

    for (var i = 0; i < chars.length; i++) {
      let char = chars[i]
      let isEndOfString = i === chars.length - 1
      if (isEndOfString) {
        if (functionBuffer.length > 0) {
          functionBuffer += char
          let result = this.parseAndEvalExpression(functionBuffer)
          functionBuffer = ""
          resultBuffer += result
        } else {
          resultBuffer += char
        }
      } else if (char === " ") {
        if (functionBuffer.length > 0) {
          let result = this.parseAndEvalExpression(functionBuffer)
          functionBuffer = ""
          resultBuffer += result
          resultBuffer += char
        } else {
          resultBuffer += char
        }
      } else if (functionBuffer.length > 0 || char === "$") {
        functionBuffer += char
      } else {
        resultBuffer += char
      }
    }

    return resultBuffer
  }

  parseAndEvalExpression(expression) {
    let stack = []
    let characters = expression.split("")
    let keyword = ""

    for (var i = 0; i < characters.length; i++) {
      let character = characters[i]
      if (character === '(') {
        stack.push(keyword)
        stack.push("(")
        keyword = ""
        // end functionName
      } else if (character === ",") {
        if (keyword) {
          stack.push(keyword)
          keyword = ""
        }
      } else if (character === ")") {
        if (keyword) {
          stack.push(keyword)
          keyword = ""
        }

        let args = []
        let arg
        let isFuncFound = false
        while (!isFuncFound && stack.length > 0) {
          arg = stack.pop()

          if (arg === "(") {
            isFuncFound = true
            arg = stack.pop() // func name
            args.unshift(arg)
          } else {
            args.unshift(arg)
          }

        }

        if (isFuncFound) {
          let funcName = args.shift()
          if (this.hasFunction(funcName)) {
            let result = this.runFunction(funcName, args)
            stack.push(result)
          } else {
            this.queueLog({ type: 'error', message: "Does not have function named: " + funcName })
          }
        } else {
        }
      } else {
        keyword += character
      }
    }

    return stack[0]
  }

  interpolate(value, params, options = {}) {
    let result = value.trim()

    let parameters = Object.assign({}, params, this.variables)

    result = this.interpolateVariables(result, parameters, options)
    result = this.interpolateFunctions(result)

    if (!this.isImportedFromCommandBlock) {
      result = result.replace(/{.*?}/g, (x) => {
        try {
          let evaluated = eval(x)
          return evaluated
        } catch(e) {
          return ''
        }
      })
    }

    return result
  }

  importFromCommandBlock(commandBlock) {
    // from the command block
    this.triggers = {}

    commandBlock.triggers.forEach((trigger) => {
      this.isImportedFromCommandBlock = true
      this.triggers[trigger.event] = trigger
    })
  }

  clear() {
    this.triggers = {}
  }

}

module.exports = EventHandler
