const BaseEntity = require('./../base_entity')
const Constants = require('../../../common/constants.json')
const Destroyable = require('../../../common/interfaces/destroyable')
const Attacker = require('../../../common/interfaces/attacker')
const Movable = require('../../../common/interfaces/movable')
const Owner = require('../../../common/interfaces/owner')
const Upgradable = require('../../../common/interfaces/upgradable')
const ShipMountable = require('../../../common/interfaces/ship_mountable')
const Faithable = require('../../../common/interfaces/faithable')
const Taintable = require('../../../common/interfaces/taintable')
const Helper = require('../../../common/helper')
const Protocol = require('../../../common/util/protocol')
const Pickup = require('../pickup')
const Buildings = require("../buildings/index")
const Terrains = require("../terrains/index")
const Goal = require("./../../ai/goal")
const Corpse = require("./../corpse")
const EventBus = require('eventbusjs')
const ExceptionReporter = require('junon-common/exception_reporter')
const Item = require("../item")

const p2 = require("p2")
const vec2 = p2.vec2

class BaseMob extends BaseEntity {
  constructor(sector, data) {
    super(sector, data)

    this.angle = this.getDefaultAngle()
    this.status = this.getDefaultStatus()
    this.activity = Constants.maxMobActivity

    this.goals = []
    this.wallQueue = []
    this.unreachableGoals = {}
    this.regions = {}

    this.type = this.getType()
    this.container = sector
    this.onMasterRemovedListener = this.onMasterRemoved.bind(this)
    this.onMasterDiedListener = this.onMasterDied.bind(this)

    this.MAX_LEAVE_DURATION = 10

    this.initTaintable({ shouldPopulate: true })
    this.initFaithable()
    this.initDestroyable()
    this.initAttacker()
    this.initMovable()
    this.initBehavior()

    this.preApplyData()
    this.applyData(data)

    this.linkSector()
    this.linkMobManager()
    this.onPositionChanged({ isGridPositionChanged: true })
    this.onPostInit()

    this.executeTurn()
  }

  preApplyData() {

  }

  initBehavior() {
    this.behavior = null
  }

  setIsWorking(isWorking) {
    this.isWorking = isWorking
  }

  setBehaviorByName(behaviorName) {
    let behavior = Protocol.definition().BehaviorType[behaviorName]
    if (!behavior) {
      this.game.captureException(new Error("Invalid behaviorName: " + behaviorName))
      return
    }

    this.setBehavior(behavior)
  }

  setBehavior(behavior) {
    if (this.behavior !== behavior) {
      this.behavior = behavior
      this.onBehaviorChanged()
    }
  }

  hasBehavior(behavior) {
    return this.behavior === behavior
  }

  onBehaviorChanged() {
    this.requireImmediatePlan = this.behavior === Protocol.definition().BehaviorType.Idle

    this.onStateChanged("behavior")
  }

  applyData(data) {
    this.angle = data.angle || 0

    if (data.health) {
      this.health = data.health
    }

    if (data.isKnocked) {
      this.isKnocked = data.isKnocked
    }

    if (data.name) {
      this.name = data.name
    }

    if (data.level) {
      this.setLevel(data.level)
    }

    if (data.isDormant && !this.ignoreSaveFileDormant()) {
      this.isDormant = data.isDormant
    }

    this.resurrectCount = data.resurrectCount || 0

    if (data.isRevived) {
      this.isRevived = data.isRevived
    }

    if (data.isUnbound) {
      this.isUnbound = data.isUnbound
    }

    if (data.tasks) {
      this.tasks = data.tasks
    } else if (this.getDefaultTasks()) {
      this.tasks = this.getDefaultTasks()
    }

    if (data.isLivestock) {
      this.isLivestock = data.isLivestock
    }

    if (data.hasOwnProperty("counter")) {
      this.counter = data.counter
    } else {
      this.counter = true
    }

    if (data.effects) {
      for (let effectName in data.effects) {
        let level = data.effects[effectName]
        if (level) {
          this.setEffectLevel(effectName, level)
        }
      }
    }

    if (data.hasOwnProperty("hunger"))  this.hunger = data.hunger
    if (data.hasOwnProperty("stamina")) this.stamina = data.stamina
    if (data.hasOwnProperty("oxygen"))  this.oxygen = data.oxygen

    if (data.containerId) {
      this.ship = this.game.getEntity(data.containerId)
      this.setRelativePosition(data.relativeX, data.relativeY)
    }

    if (data.entityGroupId) {

    }

    if (data.name) {
      this.setName(data.name)
    }

    if (data.owner) {
      let owner = this.game.getEntity(data.owner.id)
      this.setOwner(owner)
      this.setFaith(Constants.Faith.Obedient)
    }

    if (data.master) {
      let master = this.game.getEntity(data.master.id)
      if (master && !master.isPlayerData()) {
        this.setMaster(master)
      }
    }

    if (data.hasOwnProperty("status")) {
      this.status = data.status
    }

    if (data.attackables) {
      this.attackables = data.attackables
    }

    if (data.mapDisplay) {
      this.mapDisplay = data.mapDisplay
    }

    if (data.hasOwnProperty("allowTaming")) {
      this.allowTaming = data.allowTaming
    }

    if (data.hasOwnProperty("hunger"))  this.hunger = data.hunger
    if (data.hasOwnProperty("stamina")) this.stamina = data.stamina
    if (data.hasOwnProperty("oxygen"))  this.oxygen = data.oxygen

    if (data.raid) {
      let raid = this.game.getEntity(data.raid.id)
      if (raid) {
        this.setRaid(raid)
        raid.addToMobGroup(this)
      }
    }

    if (data.equipments) {
      for (let index in data.equipments.storage) {
        let itemData = data.equipments.storage[index]
        let item = new Item(this, itemData.type, itemData)
        this.equipments.storeAt(itemData.index, item)
      }
    }

    if (debugMode) {
      this.applyGoalsData(data)
    }

  }

  applyGoalsData(data) {
    if (data.goals) {
      for (var i = 0; i < data.goals.length; i++) {
        let goal = data.goals[i]

        let entity
        if (goal.targetEntity) {
          entity = this.game.getEntity(goal.targetEntity.id)
        } else {
          entity = goal
        }

        if (entity) {
          this.debugMobBehavior("[addGoalTarget] applyData: " + entity.constructor.name + ":" + entity.getId())
          this.addGoalTarget(entity)
        }
      }
    }
  }

  getDefaultTasks() {
    return 0
  }

  onCommandSpawned(caller) {
    if (this.hasCategory("trader")) {
      this.setOwner(this.game.getCreatorTeam())
      this.setDormant(true)
      this.setAngle(90)
    }
  }

  editTask(taskType, isEnabled) {
    if (!isEnabled) {
      // and operation against bit index with 0 while rest is 1
      let disableMask = ~(1 << taskType)

      this.tasks = this.tasks & disableMask
    } else {
      // or operation against bit index with 1 while rest is 0
      let enableMask = (1 << taskType)

      this.tasks = this.tasks | enableMask
    }

    this.onStateChanged("tasks")
  }

  resetTasks() {
    this.tasks = 0
  }

  isTaskEnabled(taskType) {
    return (this.tasks >> taskType) % 2 === 1
  }

  debugMobBehavior(message) {
    if (!debugMode) return

    let team = this.game.getCreatorTeam()
    let separator = "@__@"
    let log = this.getId() + separator + message
    if (team && team.leader) {
      this.getSocketUtil().emit(team.leader.getSocket(), "RenderDebug", { type: 'mob', data: log })
    }
  }

  getTurnSpeed() {
    return 30
  }

  setEntityGroup(entityGroup) {
    this.entityGroup = entityGroup
  }

  consumeStamina() {
    // nothing
  }

  getDefaultStatus() {
    if (this.getConstants().isNonHostile) {
      return Protocol.definition().MobStatus.Neutral
    } else {
      return Protocol.definition().MobStatus.Hostile
    }
  }

  setRaid(raid) {
    this.raid = raid
  }

  ignoreSaveFileDormant() {
    return false
  }

  onPostInit() {
    // nothing by default
  }

  getRaid() {
    return this.raid
  }

  touchActivity() {
    // this.setDormant(false)
    this.activity = Constants.maxMobActivity
  }

  isNotActive() {
    return this.activity === 0
  }

  reduceActivity() {
    this.activity -= 1
    if (this.activity < 0) this.activity = 0
  }

  getDespawnBoundingBox() {
    var padding = Constants.tileSize * Constants.mobDespawnRadiusTileCount
    var minX = this.getX() - padding
    var maxX = this.getX() + padding
    var minY = this.getY() - padding
    var maxY = this.getY() + padding

    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }
  }

  getDefaultAngle() {
    return Math.floor(Math.random() * 180)
  }

  getAlliance() {
    return (this.owner && this.owner.getAlliance()) || "BaseMob"
  }

  getPlayer() {
    if (!this.owner) return null
    if (this.owner.isPlayer()) return this.owner

    if (this.owner.isTeam()) {
      return this.owner.getLeader()
    }

    return null
  }

  interact(user) {
    const item = user.getActiveItem()

    if (item && item.isSyringe()) {
      item.use(user, this)
    } else if (this.isDestroyed()) {
      user.attemptDrag(this)
    }
  }

  isInjectable() {
    return true
  }

  createItem(type, options = {}) {
    return new Item(this, type, options)
  }

  setStatus(status) {
    if (this.status !== status) {
      this.onPreStatusChanged()
      this.status = status
      this.onStatusChanged()
    }
  }

  getName() {
    return "Mob " + this.id
  }

  getInteractDistance() {
    return Constants.tileSize * 3
  }

  takeAlong(player) {
    // can only take along after mob has been released, or is not taken yet
    if (!this.isOwnedBy(player)) return
    if (this.master) return

    if (player.isGuest()) {
      player.showError("Guests are not allowed to do that")
      return
    }

    this.setMaster(player)
  }

  onTamed(tamer) {
    this.game.triggerEvent("MobTamed", {
      entityId: this.getId(),
      entityType: this.getTypeName(),
      playerId: tamer.getId(),
      player: tamer.getName()
    })
  }

  showError() {

  }

  release(player) {
    if (this.master !== player) return

    this.game.triggerEvent("MobRelease", {
      entityId: this.getId(),
      entityType: this.getTypeName(),
      playerId: player.getId(),
      player: player.getName()
    })

    this.setMaster(null)
  }

  isTamable() {
    if (typeof this.allowTaming !== 'undefined') {
      return this.allowTaming
    }

    return this.getConstants().isTamable
  }

  increaseHealthViaFeed(player, item) {
    this.nextFeedTimestamp = this.game.timestamp + this.getFeedTimestampInterval()
    this.lastFeedBy = player

    this.triggerMobFeed(player, item)
    item.use(player, this)
  }

  triggerMobFeed(player, item) {
    let data = {
      entityId: this.getId(),
      entityType: this.getTypeName(),
      itemType: item.getTypeName(),
      playerId: player.getId(),
      player: player.getName()
    }

    this.game.triggerEvent("MobFeed", data)
  }

  setLivestock(isLivestock) {
    this.isLivestock = isLivestock

    this.onStateChanged("isLivestock")
  }

  hasNeed() {
    return this.game.needs[this.getId()]
  }

  satisfiesNeed(item) {
    let need = this.game.needs[this.getId()]
    return item.type === need
  }

  feed(player, item) {
    if (this.nextFeedTimestamp) {
      if (this.game.timestamp < this.nextFeedTimestamp) {
        return
      }
    }

    if (this.hasNeed() && this.satisfiesNeed(item)) {
      this.getSocketUtil().broadcast(this.sector.getSocketIds(), "Animate", { entityId: this.getId(), animation: "heart" })
      this.game.triggerEvent("NeedSatisfied", { entityId: this.getId(), itemType: item.type, actorId: player.getId() })
      item.consume()
      this.nextFeedTimestamp = this.game.timestamp + this.getFeedTimestampInterval()
      this.lastFeedBy = player
      this.triggerMobFeed(player, item)
      return
    }

    if (!item.isFood()) return
    if (!item.isEdible()) return
    if (!this.isTamable()) return

    if (this.hasOwner()) {
      if (this.health < this.getMaxHealth()) {
        this.increaseHealthViaFeed(player, item)
      }

      return
    }

    if (!player.getTeam()) return

    if (player.getTeam().isTameLimitReached(1)) {
      if (this.game.timestamp - player.tameLimitErrorShown > (Constants.physicsTimeStep * 5)) {
        player.tameLimitErrorShown = this.game.timestamp
        player.showError("Taming Limit Reached")
      }
      return
    }

    this.nextFeedTimestamp = this.game.timestamp + this.getFeedTimestampInterval()
    this.lastFeedBy = player

    this.triggerMobFeed(player, item)

    item.use(player, this)
  }

  getFeedTimestampInterval() {
    let ticksPerSecond = Constants.physicsTimeStep
    let fiveSeconds = 5

    return ticksPerSecond * fiveSeconds
  }

  isHostile() {
    return this.status === Protocol.definition().MobStatus.Hostile
  }


  onPreStatusChanged() {
    if (this.shouldBroadcastMapPosition()) {
      this.addChangedMapPosition(this, { isRemoved: true })
    }
  }

  getTeam() {
    if (!this.owner) return null
    if (!this.owner.isTeam()) return null
    return this.owner
  }

  onStatusChanged() {
    if (this.status === Protocol.definition().MobStatus.Guardian) {
      if (this.lastFeedBy) {
        if (this.lastFeedBy.isPlayer()) {
          this.lastFeedBy.walkthroughManager.handle("tame_slime")
        }
        this.setMaster(this.lastFeedBy.getTeamApprovedMember())
        this.setOwner(this.lastFeedBy.getTeam())
        this.onTamed(this.lastFeedBy)
      }
    } else if (this.status === Protocol.definition().MobStatus.Obedient) {
      if (this.lastFeedBy) {
        if (this.lastFeedBy.isPlayer()) {
          this.lastFeedBy.walkthroughManager.handle("tame_slime")
        }
        this.setMaster(this.lastFeedBy.getTeamApprovedMember())
        this.setOwner(this.lastFeedBy.getTeam())
        this.onTamed(this.lastFeedBy)
      }
    } else {
      this.setMaster(null)
      this.setOwner(null)
    }

    this.onStateChanged("status")
  }

  makeObedient() {
    this.setFaith(Constants.Faith.Obedient)
  }

  isHuman() {
    return !!this.getConstants().isHuman
  }

  setOwner(owner) {
    let prevOwner = this.owner
    if (this.owner !== owner) {
      this.owner = owner
      this.onOwnerChanged(prevOwner, owner)
    }
  }

  setName(name) {
    this.name = name
  }

  autocreateName() {
    return true
  }

  getGroup() {
    if (this.isTamable()) return "tames"
    if (this.hasCategory('worker')) return "slaves"
    if (this.hasCategory('bot')) return "bots"
  }

  onOwnerChanged(prevOwner, owner) {
    if (prevOwner) {
      prevOwner.unregisterOwnership(this.getGroup(), this)
    }

    if (owner) {
      owner.registerOwnership(this.getGroup(), this)
    }

    if (this.owner) {
      if (!this.name && this.autocreateName()) {
        this.setName(this.game.generateName())
      }

      if (this.owner.isPlayerData()) {
        this.setMaster(null)
      }

      if (this.isNightMob()) {
        this.getMobManager().removeFromNightMobs(this)
      }
    } else {
      this.setName(null)
      this.setMaster(null)
      this.setFaith(0)
    }
    this.onStateChanged("owner")
  }

  onNameChanged() {
    this.onStateChanged("name")
  }

  onContentChanged() {
    this.onStateChanged("content")
  }

  stopFollowing() {
    if (!this.master) return

    this.master.setFollower(null)

    const prevMaster = this.master
    if (prevMaster) {
      this.debugMobBehavior("[removeGoalTarget] stopFollowing: " + prevMaster.constructor.name + ":" + prevMaster.getId())
    }

    this.removeOnMasterRemovedListener()
    this.removeOnMasterDiedListener()

    this.master = null
    this.removeGoalTarget(prevMaster)
  }

  startFollowing(entity) {
    this.setBehaviorByName("Idle")
    this.requireImmediatePlan = false
    this.isWandering = false
    this.master = entity
    this.master.setFollower(this)
    this.debugMobBehavior("[addNonWanderingGoalTarget] startFollowing: " + this.master.constructor.name + ":" + this.master.getId())
    this.addNonWanderingGoalTarget(this.master)

    this.addOnMasterRemovedListener()
    this.addOnMasterDiedListener()

    this.game.triggerEvent("MobFollow", { entityId: this.getId(), actorId: this.master.getId() })
  }

  addOnMasterRemovedListener(){
    EventBus.addEventListener(`${this.game.getId()}:entity:removed:${this.master.getId()}`,
                              this.onMasterRemovedListener)
  }

  removeOnMasterRemovedListener(){
    EventBus.removeEventListener(`${this.game.getId()}:entity:removed:${this.master.getId()}`,
                                  this.onMasterRemovedListener)
  }

  addOnMasterDiedListener(){
    EventBus.addEventListener(`${this.game.getId()}:entity:died:${this.master.getId()}`,
                               this.onMasterDiedListener)
  }

  removeOnMasterDiedListener(){
    EventBus.removeEventListener(`${this.game.getId()}:entity:died:${this.master.getId()}`,
                                  this.onMasterDiedListener)
  }

  onMasterRemoved() {
    this.setMaster(null)
  }

  onMasterDied() {
    this.setMaster(null)
  }

  setMaster(entity) {

    // reset targets
    this.desiredAttackTarget = null
    this.attackTarget = null

    // reset prev goals
    this.goals.forEach((goal) => {
      goal.remove()
    })

    if (entity) {
      if (entity.hasFollower()) {
        entity.follower.stopFollowing()
      }

      this.startFollowing(entity)
    } else {
      this.stopFollowing()
    }

    this.onMasterChanged()
  }

  onMasterChanged() {
    this.onStateChanged("master")
  }

  // for pathfinder to treat player mob goal as platform
  getTileType() {
    return Buildings.SteelFloor.getType()
  }

  hasOwner() {
    return this.owner
  }

  isPet() {
    return this.isTamable()
  }

  setAlliance(alliance) {
    this.alliance = alliance
  }

  drainSample() {
    let damage = Math.floor(this.getMaxHealth() / 3)
    this.setHealth(this.health - damage)
    return this.constructor.name
  }

  linkSector() {
    this.sector.addMob(this)

    if (this.ship && this.isPilot) {
      this.ship.setSector(this.sector)
    }
  }

  linkMobManager() {
    this.sector.mobManager.linkMob(this)
  }

  setLevel(level) {
    this.level = level
    this.setHealth(this.getMaxHealth())
  }

  getBloodSpillChance() {
    return 1 - (this.health / this.getMaxHealth()) // lower health, more chance of spilling
  }

  shouldBroadcastMapPosition() {
    if (this.mapDisplay) return true
    if (this.isRaidMember()) return true
    if (this.getTypeName() === "Spider" && this.isHostile()) return true
    if (this.getTypeName() === "Messenger") return true
    if (this.hasCategory("worker")) return true

    return false
  }

  isBroadcastMapIntervalReached() {
    if (this.isRaidMember()) return true
    if (this.getTypeName() === "Messenger") return true

    let result = false

    if (!this.lastMapBroadcastTimestamp) {
      result = true
      this.lastMapBroadcastTimestamp = this.game.timestamp
    } else {
      let elapsedTimestamp = this.game.timestamp - this.lastMapBroadcastTimestamp
      if (elapsedTimestamp > Constants.physicsTimeStep * 3) {
        result = true
        this.lastMapBroadcastTimestamp = this.game.timestamp
      }
    }

    return result
  }

  mobMount(user) {
    this.game.triggerEvent("MobMount", {
      entityId: this.getId(),
      entityType: this.getTypeName(),
      playerId: user.getId(),
      player: user.getName()
    })
    this.mount(user)

    if (user.isPlayer()) {
      user.onStateChanged()
    }

  }

  mobUnmount() {
    if (!this.passenger) return

    const user = this.passenger

    this.game.triggerEvent("MobUnmount", {
      entityId: this.getId(),
      entityType: this.getTypeName(),
      playerId: user.getId(),
      player: user.getName()
    })

    this.unmount()

    if (user.isPlayer()) {
      user.onStateChanged()
    }
  }

  remove() {
    this.deinitAttacker()

    if (this.hasCategory("mountable")) {
      this.unmount()
    }

    if (this.shouldBroadcastMapPosition()) {
      this.addChangedMapPosition(this, { isRemoved: true })
    }

    this.sector.removeEntityFromTreeByName(this, "mobs")
    this.unregisterFromChunkRegion()

    this.goals.forEach((goal) => {
      goal.remove()
    })

    if (this.ship) {
      this.ship.removeMob(this)
    }

    if (this.entityGroup) {
      this.entityGroup.removeChild(this)
    }

    if (this.ship && this.isPilot) {
      this.ship.destroyAllBuildings()
    }

    if (this.master) {
      this.master.setFollower(null)
    }

    if (this.owner) {
      this.owner.unregisterOwnership(this.getGroup(), this)
    }

    this.sector.removeMob(this)

    this.clientMustDelete = true

    super.remove()

    this.onStateChanged()
  }

  cleanupAfterDelay() {
    this.postDeathCounter = this.postDeathCounter || 2

    if (this.postDeathCounter <= 0) {
      this.remove()
    }

    this.postDeathCounter -= 1
  }

  shouldCreateDeadBody() {
    if (!this.sector.settings.isCorpseEnabled) return false
    return this.resurrectCount <= 3
  }

  createCorpse() {
    let corpse = new Corpse(this.getContainer(), { x: this.getX(), y: this.getY(), type: this.getType(), angle: this.getAngle(), owner: this.owner, resurrectCount: this.resurrectCount })

    if (this.owner) {
      corpse.setName(this.name)
    }

    let lastHitBy = this.game.getEntity(this.attackerId)
    if (lastHitBy) {
      let player = lastHitBy.getPlayer()
      if (player) {
        player.progressTutorial("corpse", -1)
        if (this.getTypeName() === "Slime" || this.getTypeName() === "BioRaptor") {
          player.progressTutorial("main", 13)
        }
      }
    }

    return corpse
  }

  executeTurn() {
    if (this.isDormant) return
    if (this.isKnocked) {
      if (this.isKnockExpired()) {
        this.setIsKnocked(false)
      }
      return
    }
    if (this.ship && this.isPilot) return // dont do anything

    this.attackNearbyOpponents()
  }

  initPhysics(x, y) {
    super.initPhysics(x, y)
  }

  hasPhysics() {
    return true
  }

  applyKnockBackVelocity() {
    if (this.shouldKnockBack) {
      this.body.velocity[0] = -this.direction * this.getSpeed() // knockback
    } else {
      this.body.velocity[0] = this.direction * this.getSpeed()
    }

    if (this.shouldKnockBack && this.isOnGround) {
      this.shouldKnockBack = false // landed, so reset knockback
    }
  }

  ensureNoOverlap() {
    const collidedMobs = this.sector.mobTree.search(this)
    collidedMobs.forEach((mob) => {
      let diff = vec2.create()
      vec2.subtract(diff, mob.body.position, this.body.position)
      let distance = vec2.distance(mob.body.position, this.body.position)
      if (distance === 0) distance = 1 // cant be 0 to avoid zero division
      let overlapAmount = this.getWidth() / 2 + mob.getWidth() / 2 - distance
      if (overlapAmount > 0) {
        let adjustment = vec2.create()
        vec2.scale(adjustment, diff, overlapAmount/distance)
        vec2.add(this.body.position, this.body.position, adjustment)
        this.setXYFromBodyPosition()
      }
    })
  }

  setWave(wave) {
    this.wave = wave
  }

  hasInfiniteAmmo() {
    return true
  }

  getMobManager() {
    return this.sector.mobManager
  }

  getWalkablePlatform() {
    let tile = super.getStandingPlatform()
    // if (!tile) {
    //   tile = new Terrains.Sky(this.sector, this.getRow(), this.getCol())
    // }

    return tile
  }


  isNotHeadingToTarget(sourceEntity, targetEntity) {
    let targetRadian = Math.atan2(targetEntity.getY() - sourceEntity.getY(), targetEntity.getX() - sourceEntity.getX())
    let allowableAngleDiff = 10 * Math.PI / 180
    return Math.abs(Helper.angleDeltaSigned(sourceEntity.getRadAngle(), targetRadian)) > allowableAngleDiff
  }

  changeBasicWanderDirection(targetEntityToMove, angle) {
    this.isChangingDirection = false
    this.isMovingStraight = true

    const numSecondsToWander = Math.floor(Math.random() * 4) + 4
    this.timeToStop = this.game.timestamp + Constants.physicsTimeStep * numSecondsToWander

    if (angle) {
      targetEntityToMove.setAngle(angle)
    } else {
      const angleRandomizer = Math.floor(Math.random() * 180)
      const baseDifference = 45
      const randomRotation = this.getAngle() + angleRandomizer + baseDifference
      targetEntityToMove.setAngle(randomRotation)
    }
  }

  basicWander(targetEntityToMove) {
    let attraction = this.getAttraction()
    if (attraction) {
      let isTooFarFromAttraction =  this.game.distanceBetween(this, attraction) > (Constants.tileSize * 4)
      if (isTooFarFromAttraction ) {
        let isNotGoingToAttraction = this.isNotHeadingToTarget(targetEntityToMove, attraction)
        if (isNotGoingToAttraction) {
          let targetRadian = Math.atan2(attraction.getY() - targetEntityToMove.getY(), attraction.getX() - targetEntityToMove.getX())
          let deg = Math.floor(targetRadian * (180 / Math.PI))
          this.changeBasicWanderDirection(targetEntityToMove, deg)
        }

      }
    }

    if (this.isChangingDirection) {
      this.changeBasicWanderDirection(targetEntityToMove)
    } else if (this.isMovingStraight) {

      targetEntityToMove.setVelocityBasedOnAngle()

      if (this.game.timestamp >= this.timeToStop) {
        this.isMovingStraight = false
        this.isStopping = true

        const numSecondsToStop = Math.floor(Math.random() * 2) + 1
        this.timeToRepeat = this.game.timestamp + Constants.physicsTimeStep * numSecondsToStop
      }
    } else if (this.isStopping) {
      // stop moving
      targetEntityToMove.dampenVelocity()

      if (this.game.timestamp >= this.timeToRepeat) {
        this.isStopping = false
        this.isIdle = true
        this.stopIdlingTime = this.game.timestamp + (Constants.physicsTimeStep * 3)
        this.isChangingDirection = true
      }
    }

    return false
  }

  getAttraction() {
    return this.attraction
  }

  setAttraction(attraction) {
    this.attraction = attraction
  }

  findReachableWanderEntity() {
    let tile = this.getWalkablePlatform()
    if (!tile) return null

    let attraction = this.getAttraction()
    let entity
    if (attraction) {
      // flip/flow between attraction goal and random goal to simulate hovering around attraction area
      if (this.isWanderingToAttraction) {
        entity = this.getRandomNeighborChunkRegionTile()
        this.isWanderingToAttraction = false
      } else {
        entity = attraction
        this.isWanderingToAttraction = true
      }
    } else {
      entity = this.getRandomNeighborChunkRegionTile()
    }

    if (this.isPathFindTargetReachable(entity)) {
      return entity
    } else {
      return null
    }
  }

  getRandomNeighborChunkRegionTile() {
    let chunkRegion = this.getChunkRegion()
    if (!chunkRegion) return null

    let neighborChunkRegions = chunkRegion.getNeighbors()
    if (neighborChunkRegions.length === 0) {
      return chunkRegion.getWanderTile()
    }

    let randomIndex = Math.floor(Math.random() * neighborChunkRegions.length)
    let randomChunkRegion = neighborChunkRegions[randomIndex]

    return randomChunkRegion.getWanderTile()
  }

  findWanderTarget() {
    this.isWandering = true

    let attraction = this.getAttraction()
    if (attraction && !attraction.isPathFindable()) {
      this.enterBasicWanderingMode()
      return
    }

    if (this.game.isPvP() || this.isPet()) {
      this.enterBasicWanderingMode()
      return
    }

    let entity = this.findReachableWanderEntity()

    if (entity) {
      this.debugMobBehavior("[addGoalTarget] findWanderTarget: " + entity.constructor.name + ":" + entity.getId() + " @ " + entity.getCoord())
      this.addGoalTarget(entity)
      this.exitBasicWanderingMode()
    } else {
      this.enterBasicWanderingMode()
    }
  }

  enterBasicWanderingMode() {
    this.isBasicWanderMode = true

    this.isChangingDirection = true
    this.isStopping = false
    this.isMovingStraight = false
  }

  exitBasicWanderingMode() {
    this.isBasicWanderMode = false

    this.isChangingDirection = false
    this.isStopping = false
    this.isMovingStraight = false
  }

  move(deltaTime) {
    this.consumeFire()
    this.consumePoison()
    this.consumeParalyze()
    this.consumeWeb()
    this.consumeMiasma()
    this.consumeDrunk()
    this.consumeSpin()
    this.consumeFear()

    if (this.isKnocked) return
    if (this.isPilot) return
    if (this.isDestroyed()) return

    if (this.isDormant) return

    this.planAction()

    this.moveEntity(this)
  }

  getPathLocation() {
    return [this.getRow(), this.getCol()].join("-")
  }

  isInNewPathLocation() {
    return this.getPathLocation() !== this.lastPathLocation
  }

  isDraggable() {
    return true
  }

  addNonWanderingGoalTarget(goalTarget, callback) {
    let goal = this.addGoalTarget(goalTarget, { callback: callback })

    this.isWandering = false
    this.isIdle = false

    return goal
  }

  onEquipmentStorageChanged(item, index) {
    if (this.getHandItem() && !this.getHandItem().isBuilding() ) {
      this.weaponType = this.getHandItem().getType()
    } else {
      this.weaponType = Protocol.definition().BuildingType.None
    }

    // ensure owned by mob
    if (item && item.getOwner() !== this) {
      item.setOwner(this)
    }


    this.onStateChanged("weaponType")
  }

  getHandItem() {
    return this.equipments.get(Protocol.definition().EquipmentRole.Hand)
  }

  canReachGoal(goal) {
    if (!goal) return false

    return this.canReachEntity(goal.getTargetEntity())
  }

  canReachEntity(entity) {
    let direction = this.getDirectionToReach(entity)
    if (!direction) return false

    let isZeroDirection = direction[0] === 0 && direction[1] === 0
    if (isZeroDirection) return false

    return true
  }

  addGoalTarget(goalTarget, options = {}) {
    let invalidGoalTarget = typeof goalTarget.getFlowField !== 'function'
    if (invalidGoalTarget) return

    const mostRecentGoal = this.goals[this.goals.length - 1]
    const isDifferentFromLast = mostRecentGoal && mostRecentGoal.getTargetEntity() !== goalTarget

    let goal

    if (!mostRecentGoal || isDifferentFromLast) {
      goal = new Goal({ sourceEntity: this, targetEntity: goalTarget, callback: options.callback, isExact: options.isExact })
      this.goals.push(goal)
    }

    this.onGoalTargetAdded()

    return goal
  }

  removeGoalAt(index) {
    const goal = this.goals[index]
    if (!goal) return

    this.goals.splice(index, 1)
  }

  removeGoal(goal) {
    const index = this.goals.indexOf(goal)
    this.removeGoalAt(index)
    this.onGoalTargetRemoved(goal)
  }

  removeGoalTarget(entity) {
    const goal = this.goals.find((goal) => { return goal.hasTargetEntity(entity) })
    if (goal) {
      goal.remove()
    }
  }

  onGoalTargetAdded() {
    this.onStateChanged("goalTargets")
  }

  onGoalTargetRemoved(goal) {
    if (this.entityGroup) {
      this.entityGroup.onGoalTargetRemoved()
    }

    this.onStateChanged("goalTargets")
  }

  rearrangeGoals(latestGoal) {
    if (!latestGoal) return

    if (this.isLandMob && this.canFly()) {
      let newGoal = this.rearrangeGoalsToPreferLandTarget(latestGoal)
      if (newGoal) {
        return newGoal
      }
    }

    return latestGoal
  }

  rearrangeGoalsToPreferLandTarget(latestGoal) {
    let latestGoalIndex = this.goals.length - 1

    if (this.requiresFlyingToReach(latestGoal.getTargetEntity())) {
      let index = -1

      for (var i = this.goals.length - 1; i >= 0; i--) {
        let goal = this.goals[i]
        if (goal !== latestGoal &&
            !this.requiresFlyingToReach(goal.getTargetEntity())) {
          index = i
          break
        }
      }

      if (index !== -1) {
        if (this.desiredAttackTarget === latestGoal.getTargetEntity()) {
          let newGoal = this.goals[index]

          this.setDesiredAttackTarget(null)

          let checkTrap = true
          let allowWall = true
          let canDamage = this.canDamage(newGoal.getTargetEntity(), checkTrap, allowWall)
          if (canDamage) {
            this.setDesiredAttackTarget(newGoal.getTargetEntity())
          } else {
            this.setDesiredAttackTarget(null)
          }

          return newGoal
        }
      }

    }
  }

  getLatestGoal() {
    let result = null
    let lastIndex  = this.goals.length - 1
    let goal = this.goals[lastIndex]
    if (!goal) return null

    if (goal.isInvalid()) {
      this.debugMobBehavior("[removeGoal] getLatestGoal invalidGoal: " + goal.getTargetEntity().constructor.name + ":" + goal.getTargetEntity().getId())
      goal.remove()
      return this.getLatestGoal()
    } else {
      return goal
    }
  }

  getStructureAttackPriority() {
    return []
  }

  getForceFromAngle(radian) {
    let steer = vec2.create()
    let desired = vec2.create()

    if (radian !== null) {
      desired[0] = this.getSpeed() * Math.cos(radian)
      desired[1] = this.getSpeed() * Math.sin(radian)
    } else {
      desired[0] = 0
      desired[1] = 0
    }

    vec2.sub(steer, desired, this.body.velocity)

    return steer
  }

  getPathFinder() {
    return this.getSector().pathFinder
  }

  getDirectionToReach(entity) {
    return this.getPathFinder().getDirectionToReach(this, entity)
  }

  getDirectionToReachSync(entity) {
    return this.getPathFinder().getDirectionToReachSync(this, entity)
  }

  setActiveFood() {

  }

  hasActiveFood() {
    return false
  }

  hasReachedGoal(goal) {
    let goalTarget = goal.getTargetEntity()
    let distanceFromGoal = this.game.distance(this.getX(), this.getY(), goalTarget.getX(), goalTarget.getY())

    if (this.master && this.master === goalTarget) {
      let structure = this.sector.structureMap.get(this.master.getRow(), this.master.getCol())
      if (structure && structure.hasCategory("rail_stop") ) {
        return distanceFromGoal <= Constants.tileSize
      } else {
        return distanceFromGoal <= Constants.tileSize * 2
      }
    } else if (this.isNPC()) {
      if (goal.requiresExactPosition()) {
        return distanceFromGoal <= Constants.tileSize / 4
      } else if (goalTarget.hasCategory("corpse")) {
        // sometimes theyre in butcher table, need longer reach
        return distanceFromGoal <= Constants.tileSize * 2.5
      } else if (goalTarget.hasCategory("large_dining_table") || goalTarget.hasCategory("mining_drill")) {
        // sometimes theyre in butcher table, need longer reach
        return distanceFromGoal <= Constants.tileSize * 3
      } else {
        return distanceFromGoal <= Constants.tileSize * 2
      }
    } else {
      return distanceFromGoal <= Constants.tileSize
    }
  }

  isNPC() {
    return !!this.getConstants().isNPC
  }

  requiresFlyingToReach(entity) {
    return !this.isOnSameBiome(entity) || !this.isOnSameContinent(entity)
  }

  isOnSameBiome(entity) {
    if (entity.getStandingPlatform()) {
      return this.getStandingPlatform() // also on ground
    } else {
      return !this.getStandingPlatform() // not on ground as well
    }
  }

  isOnSameContinent(entity) {
    if (entity.isBuilding() && entity.isStructure()) {
      let continent = this.getContinent()
      if (!continent) return true

      let entityContinents = entity.getContinents()
      return entityContinents[continent.getId()]
    } else {
      return this.getContinent() === entity.getContinent()
    }

  }

  isPathFindTargetReachable(entity) {
    if (!entity) return false
    if (entity.isDestroyed() || entity.isInvisible()) return false

    if (this.shouldRestrictBiomeMovement()) {
      if (!this.isOnSameBiome(entity)) return false
      if (!this.isOnSameContinent(entity)) return false
    }

    let direction = this.getDirectionToReach(entity)
    if (!direction) return false

    let isZeroDirection = direction[0] === 0 && direction[1] === 0
    return !isZeroDirection
  }

  isPathFindTargetReachableSync(entity) {
    if (!entity) return false

    if (this.shouldRestrictBiomeMovement()) {
      if (!this.isOnSameBiome(entity)) return false
      if (!this.isOnSameContinent(entity)) return false
    }

    let direction = this.getDirectionToReachSync(entity)
    if (!direction) return false

    let isZeroDirection = direction[0] === 0 && direction[1] === 0
    return !isZeroDirection
  }

  wanderAround(targetEntityToMove) {
    if (this.isBasicWanderMode) {
      if (this.getLatestGoal()) {
        this.exitBasicWanderingMode()
      } else {
        return this.basicWander(targetEntityToMove)
      }
    } else {
      return this.flowFieldBasedWander()
    }
  }

  flowFieldBasedWander() {
    let shouldContinue

    let roll = Math.random()
    if (roll < 0.05) {
      this.changeWanderTarget()
      shouldContinue = true
    } else if (roll < 0.1) {
      this.isIdle = true
      this.stopIdlingTime = this.game.timestamp + (Constants.physicsTimeStep * 3)
      shouldContinue = false
    } else {
      shouldContinue = true
    }

    let attraction = this.getAttraction()
    if (attraction) {
      let isTooFarFromAttraction =  this.game.distanceBetween(this, attraction) > (Constants.tileSize * 4)
      let isNotGoingToAttraction = this.getLatestGoal() ? this.getLatestGoal().targetEntity !== attraction : true
      if (isTooFarFromAttraction && isNotGoingToAttraction) {
        this.changeWanderTarget()
      }
    }

    return shouldContinue
  }

  limitBiomeMovement(targetEntityToMove) {
    // unlimited by default
    return false
  }

  changeWanderDirection(targetEntityToMove) {
    if (this.isBasicWanderMode) {
      this.changeBasicWanderDirection(targetEntityToMove)
    } else {
      this.changeWanderTarget(targetEntityToMove)
    }
  }

  planAction() {
    if (!this.planner) return
    if (this.master) return // we only want to follow master

    let interval = (this.requireImmediatePlan ? 1 : 5)

    const isIntervalReached = this.game.timestamp % (Constants.physicsTimeStep * interval) === 0
    if (!isIntervalReached) return

    this.requireImmediatePlan = false

    // dont plan unless idle
    if (!this.hasBehavior(Protocol.definition().BehaviorType.Idle)) {
      return
    }

    if (!this.owner) return

    this.planner.execute()
  }

  isStuck() {
    let platform = this.getStandingPlatform()
    return platform && platform.hasObstacleOnTop()
  }

  moveEntity(targetEntityToMove, deltaTime) {
    let pathPos

    if (this.requireImmediatePlan) return // dont move, let mob decide what to do first

    if (this.isIdle) {
      if (this.game.timestamp > this.stopIdlingTime) {
        this.isIdle = false
      }

      return
    }

    if (this.isCustomVelocity) {
      this.body.velocity[0] = 0
      this.body.velocity[1] = 0
      return
    }

    if (this.attackTarget) { // stop immediately when already attacking
      let targetRadian = Math.atan2(this.attackTarget.getY() - targetEntityToMove.getY(), this.attackTarget.getX() - targetEntityToMove.getX())

      targetEntityToMove.steerTowardsAngle(targetRadian)

      targetEntityToMove.stopMoving()

      return
    }

    let goal = this.getLatestGoal()

    if (!goal) {
      goal = this.getSuddentlyReachableGoal()
      if (goal) {
        this.debugMobBehavior("[addNonWanderingGoalTarget] goal suddenly reachable: " + goal.getTargetEntity().constructor.name + ":" + goal.getTargetEntity().getId())
        let newGoal = this.addNonWanderingGoalTarget(goal.getTargetEntity())
        newGoal.callback = goal.callback // remember old goal callback
      } else if (!goal && this.desiredAttackTarget) {
        this.debugMobBehavior("[addNonWanderingGoalTarget] desiredAttackTarget but no goal: " + this.desiredAttackTarget.constructor.name + ":" + this.desiredAttackTarget.getId())
        goal = this.addNonWanderingGoalTarget(this.desiredAttackTarget)
      } else {
      }
    }

    if (this.isStuck()) {
      let neighborBoundingBox = this.getNeighborBoundingBox(Constants.tileSize)
      let buildings = this.getContainer().platformMap.search(neighborBoundingBox)
      let floor = buildings.find((building) => {
        return building.hasCategory("platform") && !building.hasObstacleOnTop()
      })

      if (floor) {
        this.setPosition(floor.getX(), floor.getY())
        return
      }

      let grounds = this.getContainer().groundMap.search(neighborBoundingBox)
      floor = grounds.find((ground) => {
        return ground.isPassableByPathFinder() && !ground.hasObstacleOnTop()
      })

      if (floor) {
        this.setPosition(floor.getX(), floor.getY())
        return
      }
    }

    if (this.shouldRestrictBiomeMovement() || this.isWandering) {
      let reachedRestrictedArea = this.limitBiomeMovement(targetEntityToMove)
      if (reachedRestrictedArea) {
        return
      }
    }

    if (this.isWandering) {
      let shouldContinue = this.wanderAround(targetEntityToMove)
      if (!shouldContinue) return
    }

    if (!goal ) {
      if (this.hasMaster()) {
        this.debugMobBehavior("[addNonWanderingGoalTarget] applyData - hasMaster: " + this.master.constructor.name + ":" + this.master.getId())
        this.addNonWanderingGoalTarget(this.master)
      } else {
        this.findWanderTarget()
      }

      return
    }

    if (this.hasReachedGoal(goal)) {
      this.onGoalReached(targetEntityToMove, goal)
      return
    }

    if (!this.isGoalTargetValid(goal.getTargetEntity())) {
      this.debugMobBehavior("[removeGoal] moveEntity !isGoalTargetValid: " + goal.getTargetEntity().constructor.name + ":" + goal.getTargetEntity().getId())
      goal.remove()
    }

    if (this.shouldRestrictBiomeMovement()) {
      if (!this.isOnSameBiome(goal.getTargetEntity()) ||
          !this.isOnSameContinent(goal.getTargetEntity())) {
        this.handleGoalTargetUnreachable(goal)
        return
      }
    }

    let pathFinder = this.getPathFinder()
    let flowField = pathFinder.getFlowFieldToReach(this, goal.getTargetEntity(), { async: true })
    if (!flowField) {
      this.handleGoalTargetUnreachable(goal)
      return
    }

    // wait for flowField to initialize
    if (!flowField.isInitialized()) return

    let direction = flowField.getBilinearInterpolatedDirection(this)
    let isZeroDirection = direction[0] === 0 && direction[1] === 0

    if (isZeroDirection) {
      this.handleGoalTargetUnreachable(goal)
      return
    }

    let radian = Math.atan2(direction[1], direction[0])
    targetEntityToMove.steerTowardsAngle(radian)

    let arriveForce = this.getForceFromAngle(radian)
    targetEntityToMove.applyForce(arriveForce)

    if (Math.random() < 0.3) {
      let separateForce = this.separate(this.getNeighbors())
      targetEntityToMove.applyForce(separateForce)
    }
  }

  isGoalTargetValid(entity) {
    return !entity.isDestroyed() &&
           !entity.isRemoved
  }

  shouldRestrictBiomeMovement() {
    return !this.canMoveAnywhere && !this.canFly()
  }

  enableSkyTravel() {
    this.canMoveAnywhere = true
  }

  disableSkyTravel() {
    this.canMoveAnywhere = false
  }

  canTravelInSpace() {
    return this.canMoveAnywhere || this.isSkyCreature() || this.canFly()
  }

  onGoalReached(targetEntityToMove, goal) {
    targetEntityToMove.stopMoving()

    if (this.isMaster(goal.getTargetEntity())) {
      // keep following
      return
    }

    goal.onReached()
    goal.remove()
  }

  npcLeaveGame() {
    this.isDormant = false
    let spawnChunkRegion = this.sector.pathFinder.findSpawnChunkRegion(this)
    if (!spawnChunkRegion) {
      this.remove()
      return
    }

    let spawnGround = this.sector.pathFinder.findSpawnGround(spawnChunkRegion)
    if (!spawnGround) {
      this.remove()
      return
    }

    // remove prev goals
    this.goals.forEach((goal) => {
      goal.remove()
    })

    this.leaveDurationInSeconds = 0
    this.isLeaving = true
    this.isDormant = false
    this.debugMobBehavior("[addNonWanderingGoalTarget] npcLeaveGame: " + spawnGround.constructor.name + ":" + spawnGround.getId())
    this.addNonWanderingGoalTarget(spawnGround, () => {
      this.remove()
    })
  }

  removeAfterFiveSeconds() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    if (this.leaveDurationInSeconds > this.MAX_LEAVE_DURATION) {
      this.remove()
    }

    this.leaveDurationInSeconds += 1
  }


  getSuddentlyReachableGoal() {
    let result

    for (let entityId in this.unreachableGoals) {
      let goal = this.unreachableGoals[entityId]
      let targetEntity = goal.getTargetEntity()
      if (this.isPathFindTargetReachable(targetEntity)) {
        // unreachable goal is now reachable
        this.removeUnreachableGoal(goal)
        result = goal
        break
      }
    }

    return result
  }

  hasMaster() {
    return this.master
  }

  handleGoalTargetUnreachable(goal) {
    if (this.desiredAttackTarget === goal.getTargetEntity()) {
      this.setDesiredAttackTarget(null)
    }

    if (this.isMaster(goal.getTargetEntity())) return

    goal.unreachable()
    goal.remove() // try another goal
    this.addUnreachableGoal(goal)
  }

  addUnreachableGoal(goal) {
    this.unreachableGoals[goal.getTargetEntity().getId()] = goal
  }

  removeUnreachableGoal(goal) {
    this.removeUnreachableGoalEntity(goal.getTargetEntity())
  }

  removeUnreachableGoalEntity(entity) {
    delete this.unreachableGoals[entity.getId()]
  }

  changeWanderTarget() {
    let goal = this.getLatestGoal()
    if (goal) {
      goal.remove()
    }

    this.findWanderTarget()
  }

  isLandMob() {
    return false
  }

  onChunkRegionChanged(currChunkRegion) {
    // center to current tile
    let x = this.getCol() * Constants.tileSize + Constants.tileSize / 2
    let y = this.getRow() * Constants.tileSize + Constants.tileSize / 2

    this.setPositionInternal(x, y)

    // if (currChunkRegion && currChunkRegion.isLandChunkRegion()) {
    //   let goal = this.getLatestGoal()
    //   if (goal &&
    //       goal.getTargetEntity().getContinent() === this.getContinent() &&
    //       this.canMoveAnywhere) {
    //     this.disableSkyTravel()
    //   }
    // }
  }

  registerToChunkRegion(chunkRegion) {
    if (this.chunkRegion !== chunkRegion) {
      if (this.chunkRegion) {
        this.chunkRegion.unregister("mobs", this)
      }

      this.chunkRegion = chunkRegion

      if (this.chunkRegion) {
        this.chunkRegion.register("mobs", this)
      }
    }
  }

  unregisterFromChunkRegion() {
    let chunkRegions = this.getChunkRegions()
    for (let id in chunkRegions) {
      let chunkRegion = chunkRegions[id]
      chunkRegion.unregister("mobs", this)
    }
  }

  onPositionChanged(options = {}) {
    let currChunkRegion = this.getChunkRegion()

    if (currChunkRegion !== this.prevChunkRegion) {
      this.prevChunkRegion = currChunkRegion
      this.onChunkRegionChanged(currChunkRegion)
    }

    if (options.isGridPositionChanged && !options.freshSpawn) {
      this.repositionOnMobTree()
      this.checkInteractables()

      this.consumeAndProduceDirt()
      this.updateFlowFieldsForSelf()
      this.triggerTraps()

      this.registerToChunkRegion(this.getChunkRegion())

      this.detectMiasma()
      this.spreadMiasma()

      if (this.shouldBroadcastMapPosition() && !this.isDestroyed()) {
        if (this.isBroadcastMapIntervalReached()) {
          this.addChangedMapPosition(this)
        }
      }

      this.onGridPositionChanged()
    }

    if (options.isChunkPositionChanged) {
      this.getSocketUtil().broadcast(this.sector.getSocketIds(), "ChunkPositionChanged", { row: options.chunkRow, col: options.chunkCol, entityId: this.getId() })
    }

    this.onStateChanged("x")
    this.onStateChanged("y")
  }

  addChangedMapPosition(entity, options) {
    this.game.forEachTeam((team) => {
      if (this.owner) {
        if (this.owner.id === team.id) {
          team.addChangedMapPosition(entity, options)
        }
      } else {
        team.addChangedMapPosition(entity, options)
      }
    })
  }

  isRaidMember() {
    return !!this.raid
  }

  onGridPositionChanged() {
    this.trackRegions()
  }

  getOccupiedRoom() {
    let platform = this.getStandingPlatform()
    if (!platform) return null

    return platform.getRoom()
  }

  getRoom() {
    return this.getOccupiedRoom()
  }

  onObstructed(hit) {
    let entity = hit.entity

    let isClosedDoorEncountered = entity && entity.hasCategory("door") && !entity.isOpen
    if (isClosedDoorEncountered) {
      this.onClosedDoorEncountered(entity)
    }
  }

  checkInteractables() {
    let relativeBox = this.getPaddedRelativeBox()
    const hits = this.getSector().structureMap.hitTestTile(relativeBox)
    hits.forEach((hit) => {
      if (hit.entity) {
        this.onHitEntity(hit.entity)
      }
    })
  }

  onHitEntity(entity) {

  }

  onClosedDoorEncountered(door) {
    if (door.getAlliance() === this.getAlliance()) {
      if (this.isPet()) {
        if (door.isAutomatic() || this.hasMaster()) {
          door.openFor(3000)
        }
      } else {
        door.openFor(3000)
      }
    }
  }

  isNeutral() {
    return this.status === Protocol.definition().MobStatus.Neutral
  }

  getNeighbors() {
    let neighborLimit = 5

    let mobs = this.sector.mobTree.search(this.getNeighborBoundingBox())
    let neighbors = []
    let neighborCount = Math.min(neighborLimit, mobs.length)

    for (let i = 0; i < neighborCount; i++) {
      let neighbor = mobs[i]
      if (neighbor.isMoving()) {
        neighbors.push(neighbor)
      }
    }

    return neighbors
  }

  isUsingMeleeWeapon() {
    return this.handEquipItem && this.handEquipItem.instance.isMeleeEquipment()
  }

  getMovingNeighbors() {
    return this.getNeighbors().filter((neighbor) => {

    })
  }

  getCollisionGroup() {
    return Constants.collisionGroup.Mob
  }

  getCollisionMask() {
    return Constants.collisionGroup.Projectile
  }

  getBodyProperties(x, y) {
    return {
        mass: 0,
        type: p2.Body.KINEMATIC,
        position: [x,y]
    }
  }

  getType() {
    throw new Error("Must implement " + this.constructor.name + "#getType")
  }

  repositionOnMobTree() {
    this.getSector().removeEntityFromTreeByName(this, "mobs")
    this.getSector().insertEntityToTreeByName(this, "mobs")
  }

  getGoalTargetsJson() {
    return this.goals.map((goal) => {
      return goal.getTargetEntity().getName()
    }).join(", ")
  }

  onStateChanged() {
    let chunk = this.getChunk()
    if (chunk) {
      chunk.addChangedMobs(this)
    }
  }

  onItemCountChanged(item) {

  }

  onLastUsedTimestampChanged(item) {

  }

  getX() {
    if (this.container.isSector()) {
      return super.getX()
    } else if (this.container.isShip()) {
      return this.getAbsoluteXOnContainer()
    } else {
      return this.getContainer().getGridRulerTopLeft().x + this.getRelativeX()
    }
  }

  editName(name) {
    this.name = name.substring(0, 40)
    this.onNameChanged()
  }

  editContent(content) {
    this.content = content
    this.onContentChanged()
  }

  getY() {
    if (this.container.isSector()) {
      return super.getY()
    } else if (this.container.isShip()) {
      return this.getAbsoluteYOnContainer()
    } else {
      return this.getContainer().getGridRulerTopLeft().y + this.getRelativeY()
    }
  }

  becomeObedientTo(entity) {
    this.faith = Constants.Faith.Obedient
    this.setMaster(entity)
    this.setOwner(entity)
  }

  isMob() {
    return true
  }

  getTypeName() {
    return Helper.getMobNameById(this.getType())
  }

  setDormant(isDormant) {
    this.isDormant = isDormant
  }

  limitVerticalMovement() {
    const isNotOnShip = !this.ship
    if (this.isPilot || isNotOnShip) {
      this.limitVerticalVelocityAndPosition([this.sector.armorMap, this.sector.structureMap, this.sector.groundMap], this.body, this.body.position)
    }
  }

  limitHorizontalMovement() {
    const isNotOnShip = !this.ship
    if (this.isPilot || isNotOnShip) {
      this.limitHorizontalVelocityAndPosition([this.sector.armorMap, this.sector.structureMap, this.sector.groundMap], this.body, this.body.position)
    }
  }

  onStorageChanged() {
    if (this.storage) {
      this.getMobManager().removeFromNightMobs(this)
    }
  }

  getDrop() {
    const drop = this.getConstants().drop

    if (Array.isArray(drop)) {
      const randomIndex = Math.floor(Math.random() * drop.length)
      return drop[randomIndex]
    } else {
      return drop
    }
  }

  isNightMob() {
    return false
  }

  canBeKnocked() {
    return false
  }

  getRotatedAngle() {
    return this.angle
  }

  canDestroyDoor(target) {
    if (target.isOpen) return false

    return this.hasMeleeWeapon()
  }

  hasMeleeWeapon() {
    return false
  }

  getDamage(attackTarget) {
    let damage = super.getDamage()

    if (this.sector) {
      if (this.sector.entityCustomStats[this.id]) {
        damage = this.sector.entityCustomStats[this.id].damage
      } else if (this.sector.mobCustomStats[this.type]) {
        damage = this.sector.mobCustomStats[this.type].damage
      }
    }

    let damageMultiplier = this.getDamageMultiplier(attackTarget)

    return Math.floor(damageMultiplier * damage)
  }

  getResistance() {
    return this.getConstants().resistance || []
  }

  isResistantTo(category) {
    let resistanceList = this.getResistance()
    return resistanceList.indexOf(category) !== -1
  }

  getDamageMultiplier(destroyable) {
    if (this.getConstants().isBuildingDestroyer) {
      return destroyable && destroyable.isBuilding() ? 2 : 1
    }

    if (this.isTamed()) {
      return 0.5
    }

    return 1
  }

  isTamed() {
    return this.isObedient()
  }

  isObedient() {
    this.faith = this.faith || 0
    return this.faith >= Constants.Faith.Obedient
  }

  isGhost() {
    return false
  }

  counterAttack(target) {
    if (this.isNPC()) return

    if (this.attackTarget !== target) {
      if (!this.isTargetInCounterAttackableGroup(target)) return
      if (this.isCounterAttackDisabled()) return
      if (this.isPathFindTargetReachable(target)) {
        if (this.lastCounterAttackTimestamp &&
            (this.game.timestamp - this.lastCounterAttackTimestamp < (Constants.physicsTimeStep * 10))) {
          // just counterattacked earlier. dont change target until after 10sec
        } else {
          this.lastCounterAttackTimestamp = this.game.timestamp
          this.setAttackTarget(null)
          this.setDesiredAttackTarget(target)
        }
      }
    }
  }

  isTargetInCounterAttackableGroup(target) {
    if (target.isPlayer()) return this.getCounterAttackableGroups().indexOf("players") !== -1
    if (target.isMob()) return this.getCounterAttackableGroups().indexOf("mobs") !== -1
    if (target.isBuilding()) return this.getCounterAttackableGroups().indexOf("buildings") !== -1

    return false
  }

  isCounterAttackDisabled() {
    return !this.counter
  }

  getLevel() {
    if (!this.level) return 0

    return this.level
  }

  getGoldDrop() {
    // linear for now
    const startGold = 10
    const multiplier = 1.09
    const base = startGold + Math.floor(startGold * multiplier * this.getLevel())
    return base
  }

}

Object.assign(BaseMob.prototype, Movable.prototype, {
  getSpeed() {
    if (this.sector) {
      if (this.sector.entityCustomStats[this.id]) {
        return this.sector.entityCustomStats[this.id].speed
      } else if (this.sector.mobCustomStats[this.type]) {
        return this.sector.mobCustomStats[this.type].speed
      }
    }

    return this.getStats(this.level).speed * Constants.globalSpeedMultiplier
  },
  getCloseDistanceFromTarget() {
    return 10
  }

})


Object.assign(BaseMob.prototype, Destroyable.prototype, {
  getDamageResistance(amount, attackEntity) {
    if (attackEntity.hasCategory("fire") && this.isResistantTo("fire")) {
      return Math.floor(amount / 2)
    }

    return 0
  },
  onDamaged(attacker, amount) {
    this.attackerId = attacker.id

    if (attacker.isPlayer()) {
      this.counterAttack(attacker)
    } else if (attacker.isMob()) {
      if (Math.random() < 0.10) {
        this.counterAttack(attacker)
      }
    } else if (attacker.isProjectile()) {
      if (attacker.weapon) {
        if (attacker.weapon.isBuilding()) {
          this.counterAttack(attacker.weapon)
        } else if (attacker.getPlayer()) {
          this.counterAttack(attacker.getPlayer())
        }

      }
    }

    if (this.hasBlood()) {
      this.spillBlood()
    }

    let data = {
      entityId: this.getId(),
      entityType: this.getTypeName(),
      attackingPlayer: "",
      attackingPlayerRole: "",
      attackingMob: "",
      damage: amount
    }

    if (attacker) {
      let actor = this.getKillerFromAttacker(attacker)
      if (actor) {
        data["attackerId"] = actor.id
        if (actor.isPlayer()) {
          data["attackingPlayer"] = actor.name
          data["attackingPlayerRole"] = actor.getRoleName()
        } else if (actor.isMob()) {
          data["attackingMob"] = actor.id
        }
      }
    }

    this.game.triggerEvent("MobAttacked", data)

  },
  onHealthReduced(delta) {
  },
  onHealthZero() {
    // spill blood
    let platform = this.getStandingPlatform()
    if (platform) {
      platform.addBlood()
    }

    if (this.shouldCreateDeadBody()) {
      this.createCorpse()
    }

    if (this.wave) {
      this.wave.removeMob(this)
    }

    this.getMobManager().removeFromNightMobs(this)

    this.remove()

    let mobKilledData = {
      entityId: this.getId(),
      entityType: this.getTypeName(),
      killingPlayer: "",
      killingPlayerRole: "",
      killingMob: ""
    }

    let lastHitBy = this.game.getEntity(this.attackerId)
    if (lastHitBy) {
      let killer = this.getKillerFromAttacker(lastHitBy)
      if (killer) {
        mobKilledData["attackerId"] = killer.id
        if (killer.isPlayer()) {
          mobKilledData["killingPlayer"] = killer.name
          mobKilledData["killingPlayerRole"] = killer.getRoleName()
        } else if (killer.isMob()) {
          mobKilledData["killingMob"] = killer.id
        }
      }
    }
    this.game.triggerEvent("MobKilled", mobKilledData)
    this.game.triggerEvent("MobDestroyed", mobKilledData)
  },
  onPostSetHealth(delta) {
    if (Number.isInteger(this.health)) {
      this.health = parseInt(this.health)
    }

    this.onStateChanged("health")

    let data = {
      "entityId": this.id,
      "entityType": this.getTypeName(),
      "playerId": "",
      "player": "",
      "previous": (this.health - delta),
      "current": this.health,
      "delta": delta
    }

    this.game.triggerEvent("HealthChanged", data)

  },
  getMaxHealth() {
    if (this.sector) {
      if (this.sector.entityCustomStats[this.id]) {
        return this.sector.entityCustomStats[this.id].health
      } else if (this.sector.mobCustomStats[this.type]) {
        return this.sector.mobCustomStats[this.type].health
      }
    }

    if (this.customMaxHealth) return this.customMaxHealth

    let health = this.getStats().health
    let level = this.level || 0
    return health + level * 10
  }
})

Object.assign(BaseMob.prototype, Upgradable.prototype, {
})

Object.assign(BaseMob.prototype, ShipMountable.prototype, {
  getRelativeX() {
    return this.relativePosition[0]
  },
  getRelativeY() {
    return this.relativePosition[1]
  }
})

Object.assign(BaseMob.prototype, Faithable.prototype, {
  onFaithChanged() {
    this.faith = this.faith || 0

    if (this.faith >= Constants.Faith.Guardian) {
      this.setStatus(Protocol.definition().MobStatus.Guardian)
    } else if (this.faith >= Constants.Faith.Obedient) {
      this.setStatus(Protocol.definition().MobStatus.Obedient)
    } else {
      this.setStatus(this.getDefaultStatus())
    }

    this.onStateChanged("faith")
  }

})

Object.assign(BaseMob.prototype, Attacker.prototype, {
  findStructuresInChunkRegion(chunkRegion, range) {
    let structures = chunkRegion.getStructures()
    return structures.filter((structure) => {
      return this.canAttack(structure) && this.isWithinRange(structure, range)
    })
  },

  findCropsInChunkRegion(chunkRegion, range) {
    let crops = chunkRegion.getCrops()
    return crops.filter((crop) => {
      return this.canAttack(crop) && this.isWithinRange(crop, range)
    })
  },

  findPlayersInChunkRegion(chunkRegion, range) {
    let players = chunkRegion.getPlayers()
    return players.filter((player) => {
      return this.canAttack(player) && this.isWithinRange(player, range)
    })
  },

  findMobsInChunkRegion(chunkRegion, range) {
    let mobs = chunkRegion.getMobs()
    return mobs.filter((mob) => {
      return this.canAttack(mob) && this.isWithinRange(mob, range)
    })
  },

  findAttackTargetsInChunkRegion(chunkRegion, range) {
    let targets = []

    let attackableGroups = this.getAttackableGroups()

    for (var i = 0; i < attackableGroups.length; i++) {
      let attackableGroup = attackableGroups[i]
      switch(attackableGroup) {
        case "players":
          targets = this.findPlayersInChunkRegion(chunkRegion, range)
          break
        case "crops":
          targets = this.findCropsInChunkRegion(chunkRegion, range)
          break
        case "buildings":
          targets = this.findStructuresInChunkRegion(chunkRegion, range)
          break
        case "mobs":
          targets = this.findMobsInChunkRegion(chunkRegion, range)
          break
      }

      if (targets.length > 0) {
        break
      }
    }

    return targets
  },

  findLineOfSightTarget() {
    let currChunkRegion = this.getChunkRegion()
    if (!currChunkRegion) return

    let losRange = this.getLineOfSightRange()

    let targets = []

    let targetChunkRegion = this.sector.findOneChunkRegionUntil(currChunkRegion, {
      breakCondition: (chunkRegion) => {
        targets = this.findAttackTargetsInChunkRegion(chunkRegion, losRange)

        return targets.length > 0
      },
      neighborStopCondition: (chunkRegion, hops) => {
        return hops >= 3
      }
    })

    return this.applyTargetSelectionStrategy(targets)
  },
  shouldAttack() {
    if (this.getRaid() && this.getRaid().isRaidEnded) {
      return false
    }

    return true
  },
  // chase against player even if far
  isChaser() {
    return this.getRaid()
  },
  shouldRemoveDesiredAttackTargetOnOutOfRange(attackTarget) {
    if (this.isMaster(attackTarget)) return false
    if (this.isChaser(attackTarget)) return false
    return true
  },
  examineLongRange() {
    // only for raids
    if (!this.getRaid()) return

    // if part of group, only let leader do this
    if (this.entityGroup && !this.entityGroup.isLeader(this)) return

    // do structure/wall finding only every 3 seconds
    if (this.lastLongRangeCheckTime) {
      let duration = this.game.timestamp - this.lastLongRangeCheckTime
      if (duration < Constants.physicsTimeStep * 3) {
        return
      }
    }

    this.lastLongRangeCheckTime = this.game.timestamp

    this.replaceWallTargetWithStructure()

    if (this.desiredAttackTarget) return

    let wall

    while (this.wallQueue.length > 0) {
      wall = this.wallQueue.shift()
      let isWallDestroyed = !this.game.getEntity(wall.getId())
      if (!isWallDestroyed && this.isPathFindTargetReachableSync(wall)) {
        this.setDesiredAttackTarget(wall)
        break
      }
    }

    if (this.desiredAttackTarget) return

    let sourceChunkRegion = this.getChunkRegion()
    if (sourceChunkRegion && !sourceChunkRegion.isSky) {
      let traversal = this.sector.traverseChunkRegionsUntil(sourceChunkRegion,
         { sameBiome: true, passThroughWall: false } ,
         (chunkRegion) => {
        return chunkRegion.isSky !== sourceChunkRegion.isSky
      })

      for (let chunkRegionId in traversal.visited) {
        let chunkRegion = traversal.visited[chunkRegionId]
        let structure = chunkRegion.getRandomAttackableStructure()
        if (structure) {
          this.setDesiredAttackTarget(structure)
          return
        }
      }
    }

    // find walls in current room/continent
    wall = this.findWallToBreak()
    if (wall) return

    let structure = this.findStructureAcrossContinent()
    if (structure) {
      return
    }

    // find structures in next continent

    // find continent that we can go to and raid
    // find continent that we can break through and raid
  },
  replaceWallTargetWithStructure() {
    let room = this.getRoom()
    if (!room) return

    if (this.desiredAttackTarget &&
        this.desiredAttackTarget.hasCategory("wall") &&
        room.getStructureCount() > 0) {
      // if i have wall attack target, replace it with structure target
      let structure = room.getRandomStructureForMob(this)
      if (structure) {
        this.setDesiredAttackTarget(structure)
        this.wallQueue = []
      }
    }
  },
  findWallToBreak() {
    let room = this.getRoom()
    if (!room) return

    let wall = room.getWallWithBlockedNeighborRoom()
    if (wall) {
      let wallQueue = this.getWallQueueTowards(wall, room)
      if (wallQueue.length > 0) {
        this.wallQueue = wallQueue
      }

      return wall
    }
  },
  findStructureAcrossContinent() {
    let currentChunkRegion = this.getChunkRegion()
    if (!currentChunkRegion) return

    let chunkRegionsWithStructures = this.scanNearbyAttackableChunkRegions(currentChunkRegion)

    let chunkRegion = this.findReachableChunkRegion(currentChunkRegion, chunkRegionsWithStructures)
    if (chunkRegion) {
      let structures = chunkRegion.getAttackableStructures()
      let structure = Object.values(structures)[0]

      this.setDesiredAttackTarget(structure)
      return
    }

    // couldnt find reachble chunkRegion. find unreachable ones..
    let wall = this.findWallToBreakIntoDifferentContinent(currentChunkRegion, chunkRegionsWithStructures)
    if (wall) {
      let wallQueue = this.getWallQueueTowards(wall, null)
      if (wallQueue.length > 0) {
        this.wallQueue = wallQueue
      }
    }
  },
  scanNearbyAttackableChunkRegions(currentChunkRegion) {
    let chunkRegions = {}

    this.sector.traverseChunkRegionsUntil(currentChunkRegion,
      { all: true, passThroughWall: true } ,
      (chunkRegion) => {
      let structures = chunkRegion.getAttackableStructures()
      let hasStructureToAttack = Object.keys(structures).length > 0
      if (hasStructureToAttack) {
        chunkRegions[chunkRegion.getId()] = chunkRegion
      }
      return hasStructureToAttack
    })

    return chunkRegions
  },
  findWalledChunkRegion(currentChunkRegion, chunkRegions) {

  },
  findReachableChunkRegion(currentChunkRegion, chunkRegions) {
    let targetChunkRegion

    // find ones that can be reached directly
    let reachableChunkRegions = []

    for (let id in chunkRegions) {
      let chunkRegion = chunkRegions[id]
      let isChunkRegionReachable = this.getSector().pathFinder.getNextChunkRegion(currentChunkRegion, chunkRegion)
      if (isChunkRegionReachable) {
        reachableChunkRegions.push(chunkRegion)
      }
    }

    let randomIndex = Math.floor(Math.random() * reachableChunkRegions.length)
    return reachableChunkRegions[randomIndex]
  },
  findWallToBreakIntoDifferentContinent(currentChunkRegion, chunkRegions) {
    let currentContinent = currentChunkRegion.getContinent()
    let reachableChunkRegions = []

    let result

    for (let id in chunkRegions) {
      let chunkRegion = chunkRegions[id]
      let isChunkRegionReachable = this.getSector().pathFinder.getNextChunkRegion(currentChunkRegion, chunkRegion)
      if (!isChunkRegionReachable && chunkRegion.isAtEdgeOfContinent()) {
        let walls = chunkRegion.getWallsOnDifferentContinent()
        if (walls.length > 0) {
          let innerWall

          let targetRoom = chunkRegion.getRoomOfStructures()

          if (targetRoom) {
            innerWall = walls.find((wall) => {
              return wall.getRooms() && wall.getRooms()[targetRoom.getId()]
            })
          }

          if (innerWall) {
            result = innerWall
            break
          }
        }
      }
    }

    return result
  },
  getWallQueueTowards(targetWall, room) {
    let hit = this.traverseWallUntil(targetWall, (wall, neighbors) => {
      let wallRooms = wall.getRooms()
      if (!room) {
        let foundEmptySpaceNeighbor = neighbors.find((neighbor) => {
          return neighbor.type === 0
        })

        return foundEmptySpaceNeighbor
      } else {
        return wallRooms && wallRooms[room.getId()]
      }
    })

    let queue = []
    while (hit) {
      queue.push(hit.entity)
      hit = hit.previous
    }

    return queue
  },

  traverseWallUntil(targetWall, condition) {
    let visited = {}
    let frontier = [{ entity: targetWall, previous: null } ]
    visited[targetWall.getId()] = true

    let hit
    let result

    while (frontier.length > 0) {
      hit = frontier.shift()

      let neighbors = this.getSector().pathFinder.floodFillManager.getNeighbors(hit.entity.getRow(), hit.entity.getCol())

      if (condition(hit.entity, neighbors)) {
        result = hit
        break
      }

      neighbors.forEach((neighbor) => {
        if (neighbor.entity &&
            neighbor.entity.getType() === Protocol.definition().BuildingType.Wall) {

          let neighborWall = neighbor.entity
          if (!visited[neighborWall.getId()]) {
            frontier.push({ entity: neighborWall, previous: hit })
            visited[neighborWall.getId()] = true
          }

        }
      })
    }

    return result
  },
  onPostAttackEntityRemoved(event) {
    let entity = event.target
    this.removeUnreachableGoalEntity(entity)

    this.removeGoalTarget(entity)
  },
  onRaycast(obstacle) {
    this.raycastTarget = obstacle
  },
  shouldChooseTarget(target) {
    return this.canDamage(target)
  },
  canDamage(target, checkTrap = true, allowWall = false) {
    if (target.isMob() && target.status === Protocol.definition().MobStatus.Neutral) return false
    if (this.isFriendlyUnit(target)) return false
    if (target.hasCategory("ghost")) return false

    if (target.storage && target.storage.getType && target.storage.getType() === Protocol.definition().BuildingType.CryoTube) {
      return false
    }

    // when player moves away from land into sky, mob should stop chasing
    if (target.isPlayer() &&  !this.isOnSameContinent(target)) {
      return false
    }

    if (target.hasCategory("wall")) {
      if (allowWall) {
        return true
      } else {
        return this.desiredAttackTarget === target
      }
    }


    if (target.hasCategory("trap")) {
      if (checkTrap) {
        return this.canTargetTraps()
      } else {
        return false
      }
    }

    if (target.hasCategory("crop")) {
      return this.getConstants().canTargetCrops
    }

    if (target.hasCategory("door")) {
      return this.canDestroyDoor(target)
    }

    if (target.hasCategory("distribution") ||
        target.hasCategory("platform") ||
        target.hasCategory("terrain") ||
        target.hasCategory("walkable") ||
        target.hasCategory("rail") ||
        target.hasCategory("sign") ||
        target.hasCategory("vent")) {
      return false
    }

    return true
  },
  canTargetTraps() {
    return this.getConstants().canTargetTraps
  },
  canFly() {
    return this.getConstants().canFly
  },
  applyTargetSelectionStrategy(targets) {
    let randomIndex = Math.floor(Math.random() * targets.length)
    return targets[randomIndex]
  },
  onDesiredAttackTargetFound(attackTarget) {
    this.debugMobBehavior("[addNonWanderingGoalTarget] onDesiredTargetFound: " + attackTarget.constructor.name + ":" + attackTarget.getId())
    this.addNonWanderingGoalTarget(attackTarget)
  },

  isMaster(entity) {
    return this.master === entity
  },

  onDesiredTargetRemoved(attackTarget) {
    this.debugMobBehavior("[removeGoalTarget] onDesiredTargetRemoved: " + attackTarget.constructor.name + ":" + attackTarget.getId())
    this.removeGoalTarget(attackTarget)
  },

  getAttackRange() {
    if (this.sector && this.sector.mobCustomStats[this.type]) {
      return this.sector.mobCustomStats[this.type].range
    }

    return this.getStats(this.getLevel()).range
  },

  getLineOfSightRange() {
    let los = this.getStats(this.getLevel()).los

    if (this.game.isNight) los *= 2

    return los
  },

  getAttackInterval() {
    return this.getStats(this.getLevel()).reload
  },

  performAttack(attackTarget) {
    const destroyable = attackTarget
    const damage = this.getDamage(attackTarget)
    destroyable.damage(damage, this)
    let chunk = this.getChunk()
    if (chunk) {
      chunk.sendEquipmentAnimation(this)
    }
  },
  getCounterAttackableGroups() {
    if (this.status === Protocol.definition().MobStatus.Neutral) {
      return ["players"]
    }

    return this.getAttackableGroups()
  },
  getAttackableGroups() {
    if (this.status === Protocol.definition().MobStatus.Neutral) {
      return []
    }

    if (this.attackables) return this.attackables

    if (this.getConstants().attackGroups) {
      return this.getConstants().attackGroups
    }

    if (this.status === Protocol.definition().MobStatus.Obedient ||
        this.status === Protocol.definition().MobStatus.Guardian) {
      if (this.master) {
        return ["buildings", "mobs"]
      } else {
        return []
      }
    } else {
      return ["players"]
    }
  },
  getAttackables() {
    let attackableGroups =  this.getAttackableGroups()
    return attackableGroups.map((group) => {
      if (group === 'players') return this.sector.playerTree
      if (group === 'buildings') return this.sector.structureMap
      if (group === 'mobs') return this.sector.mobTree
    })
  }
})

module.exports = BaseMob
