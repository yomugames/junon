const BaseEntity = require('./../base_entity')
const Constants = require("./../../../../common/constants.json")
const HealthBar = require("./../../components/health_bar")
const Destroyable = require('./../../../../common/interfaces/destroyable')
const Upgradable = require('./../../../../common/interfaces/upgradable')
const Faithable = require('./../../../../common/interfaces/faithable')
const ShipMountable = require('./../../../../common/interfaces/ship_mountable')
const Helper = require('./../../../../common/helper')
const Ship = require("./../ship")
const ClientHelper = require("./../../util/client_helper")
const SocketUtil = require("./../../util/socket_util")
const SpriteEventHandler = require("./../../util/sprite_event_handler")
const Interpolator = require("./../../util/interpolator")
const Equipments = require("./../equipments/index")
const Item = require("./../item")
const Needs  = require("./../../../../common/interfaces/needs")
const Protocol = require("./../../../../common/util/protocol")
const BitmapText = require("../../util/bitmap_text");
const helper = require('./../../../../common/helper');

class BaseMob extends BaseEntity {
  constructor(game, data) {
    super(game, data)

    this.level = 0
    this.isKnocked = false

    this.initFaithable(data.faith)
    this.initDestroyable(data.health)
    this.initNeeds()
    this.healthBar = new HealthBar(this)

    this.chunks = {}
    this.behaviorLogs = []

    // this.addRangeSprite()

    this.onPositionChanged()
    this.onPostInit()
  }

  static getRangeTexture() {
    if (!this.rangeTexture) {
      let graphics = new PIXI.Graphics()
      graphics.beginFill(0xc59bff)
      graphics.drawCircle(0, 0, this.prototype.getAttackRange())
      graphics.endFill()

      this.rangeTexture = game.app.renderer.generateTexture(graphics)
    }

    return this.rangeTexture
  }

  getAttackRange() {
    return this.getStats(this.level).range
  }

  getRangeSprite() {
    let sprite = new PIXI.Sprite(this.constructor.getRangeTexture())
    sprite.name = "range"
    sprite.anchor.set(0.5)
    sprite.position.x = 0
    sprite.position.y = 0
    sprite.alpha = 0
    return sprite
  }

  onMouseOver() {
    super.onMouseOver()

    this.game.highlight(this)
    this.game.showEntityMenu(this)
  }

  onMouseOut() {
    super.onMouseOut()

    this.game.unhighlight(this)
    this.game.hideEntityMenu(this)
  }

  addBehaviorLog(log) {
    if (this.behaviorLogs.length >= 200) {
      this.behaviorLogs.shift()
    }

    this.behaviorLogs.push(log)

    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }
  }

  onNPCServerMessage(data) {
    this.npcChoice = data.choice
    let message = i18n.t(data.message)
    this.createChatBubble(message)
  }

  onPostInit() {
    let pendingCameraTargetId = this.game.getPendingCameraFocusTargetId()
    if (pendingCameraTargetId && pendingCameraTargetId === this.id) {
      this.game.centerCameraTo(this)
      this.game.player.setCameraFocusTarget(this)

      this.game.setPendingCameraFocusTargetId(null)
    }
  }

  addRangeSprite() {
    this.rangeSprite = this.getLineOfSightRangeSprite()
    this.sprite.addChild(this.rangeSprite)
  }

  unselect() {
    super.unselect()
    // this.hideRange()
  }

  isInteractable() {
    if (this.game.player.isControllingGhost()) {
      return this.isObedient() && !this.isDestroyed() && !this.isGhost()
    } else {
      return this.isDestroyed()
    }
  }

  isGhost() {
    return false
  }

  isObedient() {
    return this.faith >= Constants.Faith.Obedient
  }


  getLineOfSightRangeSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["los_range.png"])
    sprite.anchor.set(0.5)
    sprite.alpha = 0 // 0.1
    sprite.width  = this.getLineOfSightRange() * 2 // range is radius, so width/diameter should be 2x
    sprite.height = this.getLineOfSightRange() * 2
    return sprite
  }

  drawRange() {
    this.rangeSprite.alpha = 0.1
  }

  hideRange() {
    this.rangeSprite.alpha = 0
  }


  static build(game, data) {
    return new this(game, data)
  }

  getSpriteContainer() {
    return this.game.sector.spriteLayers["mobs"]
  }

  getContainer() {
    return this.ship || this.game.sector
  }

  isMob() {
    return true
  }

  getEffectableSprite() {
    return this.characterSprite
  }

  setScaleX(scale) {
    this.characterSprite.scale.x = scale
  }

  getTintableSprite() {
    return this.characterSprite
  }

  getTintableSprites() {
    return [this.characterSprite]
  }

  getDefaultSpriteColor() {
    return 0xffffff
  }

  getTameFaithPercentage() {
    return Math.min(100, Math.floor((this.faith / Constants.Faith.Obedient) * 100))
  }

  getRotatableSprite() {
    return this.characterSprite
  }

  getSprite() {
    const sprite = new PIXI.Container()

    this.characterSprite = this.getCharacterSprite()
    Interpolator.mixin(this.characterSprite)

    this.sleepStatusContainer = new PIXI.Container()
    this.sleepStatusContainer.name = "SleepStatus"

    sprite.addChild(this.characterSprite)
    sprite.addChild(this.sleepStatusContainer)

    return sprite
  }

  getCharacterSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getSpritePath()])
    sprite.name = "Mob"
    sprite.anchor.set(0.5)

    if (this.shouldUseOriginalWidth()) {
    } else if (this.getConstants().sprite) {
      sprite.width = this.getConstants().sprite.width
      sprite.height = this.getConstants().sprite.height
    } else {
      // apply server mob width/height
      sprite.width = this.getWidth()
      sprite.height = this.getHeight()
    }

    return sprite
  }

  getCorpseSprite() {
    return this.getCharacterSprite()
  }

  applyConstantsDefinition() {

  }

  syncWithServer(data) {
    this.instructToMove(data.x, data.y)
    this.setKnocked(data.isKnocked)
    this.setLevel(data.level)
    this.setAngle(data.angle)
    this.setStatus(data.status)
    this.setHealth(data.health)
    this.setHunger(data.hunger)
    this.setStamina(data.stamina)
    this.setSleepState(data.isSleeping)
    this.setFaith(data.faith)
    this.setIsAttacking(data.isAttacking)
    this.setIsLivestock(data.isLivestock)
    this.setTasks(data.tasks)
    this.setEffects(data.effects)
    this.setNextFeedTime(data.nextFeedTime)
    this.setMaster(data.master)
    this.setOwner(data.owner)
    this.setRaycast(data)
    this.setGoalTargets(data.goalTargets)
    this.setName(data.name)
    this.setContent(data.content)

    if (data.hasOwnProperty('weaponType')) {
      this.setWeaponType(data.weaponType)
    }
    
    if(data.hasOwnProperty('armorType')) {
      this.setArmorType(data.armorType)
    }

    if (data.hasOwnProperty("behavior")) {
      this.setBehavior(data.behavior)
    }

    if (data.shipId) {
      this.ship = this.game.ships[data.shipId]
    }
  }

  setName(name) {
    if (this.name !== name) {
      this.name = name
      this.onNameChanged()
    }
  }

  setContent(content) {
    if (this.content !== content) {
      this.content = content
      this.onContentChanged()
    }
  }

  setWeaponType(weaponType) {
    if (!this.isEquipper()) return

    if (this.weaponType !== weaponType) {
      if (this.getHandEquipment()) {
        this.getHandEquipment().remove()
      }

      this.weaponType = weaponType
      if (weaponType) {
        this.initWeapon(weaponType)
      }
    }
  }

  setArmorType(armorType) {
    if(!this.isEquipper()) return;
    
    if(this.armorType !== armorType) {
      if(this.getArmorEquipment()) {
        this.getArmorEquipment().remove()
      }
      
      this.armorType = armorType;
      if(armorType) {
        this.initArmor(armorType);
      }
    }
  }

  isEquipper() {
    return this.equipments
  }

  initArmor(armorType) {
    let data = {
      x: 0,
      y: 0,
      user: this,
      instance: {}
    }

    let item = Item.getKlass(armorType).build(this.game, data)
    this.setArmorEquipment(item)
  }

  initWeapon(weaponType) {
    let data = {
      x: 0,
      y: 0,
      user: this
    }

    let item = Item.getKlass(weaponType).build(this.game, data)
    this.setHandEquipment(item)
  }

  getName() {
    return this.name
  }

  onContentChanged() {
    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }
  }

  onNameChanged() {
    if (this.name) {
      if (!this.usernameText) {
        this.createUsernameSprite()
      } else {
        this.usernameText.sprite.text = this.name
        if (this.game.changeNameMenu.isOpen()) {
          this.game.changeNameMenu.close()
        }
      }
    } else {
      if (this.usernameText) {
        this.usernameText.remove()
        this.usernameText = null
      }
    }
  }

  createUsernameSprite() {
    this.usernameText = BitmapText.create({
      label: "MobName",
      text: this.getName(),
      spriteContainer: this.sprite
    })

    this.usernameText.sprite.position.y = this.getHeight()
  }

  setIsLivestock(isLivestock) {
    if (this.isLivestock !== isLivestock) {
      this.isLivestock = isLivestock
      this.onIsLivestockChanged()
    }
  }

  setTasks(tasks) {
    let prevTasks = this.tasks
    this.tasks = tasks

    if (this.tasks !== prevTasks) {
      if (this.game.entityMenu.isOpen(this)) {
        this.game.entityMenu.update(this)
      }
    }
  }

  onIsLivestockChanged() {
    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }
  }

  setIsAttacking(isAttacking) {
    if (this.isAttacking !== isAttacking) {
      this.isAttacking = isAttacking
      this.onAttackStateChanged()
    }
  }


  onAttackStateChanged() {

  }

  setBehavior(behavior) {
    if (this.behavior !== behavior) {
      this.behavior = behavior
      this.onBehaviorChanged()
    }
  }

  getBehaviorName() {
    return Helper.getBehaviorNameById(this.behavior)
  }

  onBehaviorChanged() {
    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }
  }

  getMeleeChargeTween(targetPosition) {
    let origX = this.getX()
    let origY = this.getY()
    let position = { x: origX, y: origY }

    const tween = new TWEEN.Tween(position)
        .to(targetPosition, 250)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          this.sprite.position.x = position.x
          this.sprite.position.y = position.y
        })
        .repeat(1)
        .yoyo(true)

    return tween
  }


  setGoalTargets(goalTargets) {
    if (this.goalTargets !== goalTargets) {
      this.goalTargets = goalTargets
      this.onGoalTargetsChanged()
    }
  }

  onGoalTargetsChanged() {
    if (game.entityMenu.selectedEntity === this) {
      this.game.showEntityMenu(this)
    }
  }

  setRaycast(data) {
    if (data.raycastX) {
      // check if same position
      let raycastSprite = this.getRaycastSprite()
      if (raycastSprite.position.x !== data.raycastX && raycastSprite.position.y !== data.raycastY) {
        raycastSprite.position.x = data.raycastX
        raycastSprite.position.y = data.raycastY
        this.onRaycastPositionChanged()
      }
    }
  }

  onRaycastPositionChanged() {

  }

  getRange() {
    return this.getStats(this.level).range
  }

  getRaycastSprite() {
    if (!this.raycastSprite) {
      const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["red.png"])
      sprite.anchor.set(0.5)
      sprite.alpha = 0.4
      sprite.position.x = this.getX()
      sprite.position.y = this.getY()
      this.game.sector.effectsContainer.addChild(sprite)
      this.raycastSprite = sprite
    }

    return this.raycastSprite
  }

  isDifferentOwner(owner, otherOwner) {
    if (owner && !otherOwner) return true
    if (otherOwner && !owner) return true
    if (!owner && !otherOwner) return false

    return owner.name !== otherOwner.name
  }

  setOwner(owner) {
    if (this.isDifferentOwner(this.owner, owner)) {
      this.owner = owner
      if (game.entityMenu.selectedEntity === this) {
        this.game.showEntityMenu(this)
      }
    }
  }

  isTamableBy(player) {
    if (!this.isTamable()) return false

    if (this.owner && this.owner.name !== player.name) return false
    return true
  }

  isMountable(player) {
    if (!this.belongToOwner(player)) return false

    return this.hasCategory("mountable")
  }

  isTamable() {
    return this.getConstants().isTamable
  }

  setMaster(master) {
    if (master) {
      if (this.masterId === master.id) return

      this.masterId = master.id

      if (game.entityMenu.selectedEntity === this) {
        this.game.showEntityMenu(this)
      }
    } else {
      if (this.masterId) {
        this.masterId = null

        if (game.entityMenu.selectedEntity === this) {
          this.game.showEntityMenu(this)
        }
      }
    }
  }

  setNextFeedTime(nextFeedTime) {
    this.nextFeedTime = nextFeedTime
  }

  setStatus(status) {
    if (this.status !== status) {
      this.status = status

      if (game.entityMenu.selectedEntity === this) {
        this.game.showEntityMenu(this)
      }

    }
  }

  getStatusName() {
    return Helper.getMobStatusNameById(this.status)
  }

  interpolate(lastFrameTime) {
    const prev = { x: this.sprite.position.x, y: this.sprite.position.y }
    super.interpolate(lastFrameTime)
    const curr = { x: this.sprite.position.x, y: this.sprite.position.y }

    if (curr.x !== prev.x || curr.y !== prev.y) {
      this.onPositionChanged()
    }
  }

  animateWalkOnPlatform() {
    let platform = this.getStandingPlatform()
    if (platform) {
      platform.animateWalk(this)
    }
  }

  onPositionChanged() {
    this.animateWalkOnPlatform()

    this.repositionOnUnitMap()
    this.registerToChunk()

    if (this.isControlledByPlayer()) {
      // this.game.player.checkInteractable(this)
    }
  }

  onHighlighted() {
    let text = this.game.dialogueMap[this.getId()]
    if (text) {
      let message 
      if (text.dialogues[window.language]) {
        message = text.dialogues[window.language]
      } else {
        message = text.dialogues["en"]
      }

      this.createChatBubble(message)
    }
  }

  onPreRemove(cb) {
    cb()
  }

  shouldRemoveImmediately() {
    return !this.getConstants().shouldFadeOut || this.health === 0
  }

  getSelectionWidth() {
    return Constants.tileSize
  }

  remove(entityData) {
    if (this.raycastSprite) {
      this.game.sector.effectsContainer.removeChild(this.raycastSprite)
    }

    this.cleanupAnimationTween()
    this.getContainer().unregisterEntity("mobs", this)
    this.removeFromUnitMap()

    if (entityData && entityData.health === 0) {
      // we want to trigger onHealthZero callback
      this.setHealth(entityData.health)
    }

    if (this.chunk) {
      this.chunk.unregister("mobs", this)
    }

    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.removeSelectedEntity()
    }

    if (this.shouldRemoveImmediately()) {
      super.remove()
    } else {
      this.onPreRemove(() => {
        super.remove()
      })
    }
  }

  animateHeart() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["heart.png"])
    sprite.anchor.set(0.5)
    sprite.position.x = this.getX()
    sprite.position.y = this.getY()
    this.game.sector.effectsContainer.addChild(sprite)

    let position = { y: this.getY() }
var tween = new TWEEN.Tween(position)
        .to({ y: this.getY() - (Constants.tileSize * 1) }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          sprite.position.y = position.y
        })
        .onComplete(() => {
          this.game.sector.effectsContainer.removeChild(sprite)
        })
        .start()
  }

  animateHappy(happy=true) {
    let sprite;
    if(happy) {
      sprite = new PIXI.Sprite(PIXI.utils.TextureCache["happiness_status.png"]);
    } else {
      sprite = new PIXI.Sprite(PIXI.utils.TextureCache["sadness_status.png"]);
    }
    sprite.anchor.set(0.5);
    sprite.position.x = this.getX();
    sprite.position.y = this.getY();
    this.game.sector.effectsContainer.addChild(sprite);
    let position = { y: this.getY() };

    var tween = new TWEEN.Tween(position)
      .to({ y: this.getY() - (Constants.tileSize * 1) }, 1000)
      .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
      .onUpdate(() => {
        sprite.position.y = position.y;
      })
      .onComplete(() => {
        this.game.sector.effectsContainer.removeChild(sprite);
      })
      .start();

  }

  onClick() {
    this.game.selectEntity(this)
    this.game.showEntityMenu(this, { dontCloseMenus: true, selectedEntity: this, replaceSelected: true })
    this.game.interact(this)
  }

  getTypeName() {
    let type = this.getType()
    return Helper.getMobNameById(type).replace(/([A-Z])/g, ' $1').trim() // space before capital letters
  }

  getType() {
    return this.prototype.getType()
  }

  getType() {
    throw "must implement BaseMob#getType"
  }

  static getSellGroup() {
    return "Mobs"
  }

  getGroup() {
    return "mobs"
  }

  getGoldDrop() {
    // linear for now
    const startGold = 10
    const multiplier = 1.09
    const base = startGold + Math.floor(startGold * multiplier * this.level)
    return base
  }

  setAngle(angle) {
    if (this.angle !== angle) {
      this.angle = angle
      const baseRotationOffset = this.getBaseRotationOffset()
      this.instructToRotate(this.getRadAngle() + baseRotationOffset)
    }
  }

  getBaseRotationOffset() {
    return 90 * (Math.PI / 180)
  }

  setKnocked(isKnocked) {
    if (this.isKnocked !== isKnocked) {
      this.isKnocked = isKnocked
      this.onKnockedChanged()
    }
  }

  setLevel(level) {
    this.level = level
  }

  onKnockedChanged() {
    if (this.isKnocked) {
      this.dizzySprite = new PIXI.Sprite(PIXI.utils.TextureCache["dizzy_eyes.png"])
      this.dizzySprite.width  = 30
      this.dizzySprite.height = 12
      this.dizzySprite.anchor.set(0.5)
      this.characterSprite.addChild(this.dizzySprite)
    } else {
      if (this.dizzySprite) {
        this.characterSprite.removeChild(this.dizzySprite)
      }
    }
  }

  renderEntityMenu(entityMenu) {
    this.showStats(entityMenu)
    this.showAction(entityMenu)
    this.showTabs(entityMenu)
    this.showLogs(entityMenu)
    this.showTasks(entityMenu)
  }

  showTasks(entityMenu) {
    if (!this.hasTasks()) return

    let taskNames = Object.keys(Protocol.definition().TaskType)
    for (let i = 0; i < taskNames.length; i++) {
      let taskName = taskNames[i]
      let taskId = Protocol.definition().TaskType[taskName]
      let bitValue = (this.tasks >> taskId) % 2
      let isEnabled = bitValue === 1
      let slaveTaskCheckbox = entityMenu.querySelector(`.slave_task[data-task-id='${taskId}'] input`)

      if (isEnabled) {
        slaveTaskCheckbox.checked = true
      } else {
        slaveTaskCheckbox.checked = false
      }
    }
  }

  hasTasks() {
    return this.hasCategory("worker")
  }

  showTabs(entityMenu) {
  }

  showLogs(entityMenu) {
    if (!debugMode) return
      
    let logs = ""
    this.behaviorLogs.forEach((log) => {
      logs += "<div class='entity_log'>" + log + "</div>"
    })

    entityMenu.querySelector(".entity_logs").innerHTML = logs
  }

  showStats(entityMenu) {
    let stats = ""

    const health = "<div class='entity_stats_entry'>" +
                      "<div class='stats_type'>" + i18n.t('Entity.Mob.Health') + "</div>" +
                      "<div class='stats_value'>" + this.health + "/" + this.getMaxHealth() + "</div>" +
                  "</div>"

    stats += health

    if (this.getConstants().shouldShowBehavior) {
      const behavior = "<div class='entity_stats_entry'>" +
                         "<div class='stats_type'>" + i18n.t('State') + "</div>" +
                         "<div class='stats_value'>" + this.getBehaviorName() + "</div>" +
                       "</div>"

      stats += behavior
    }

    if (this.isTamableBy(this.game.player)) {
      let taming = "<div class='entity_stats_entry'>" +
                        "<div class='stats_type'>" + i18n.t("Taming") + "</div>" +
                        "<div class='stats_value'>" + (this.getTameFaithPercentage()) + "%</div>" +
                    "</div>"
      stats += taming
    }


    if (this.owner && this.shouldShowOwner()) {
      let ownership = this.getOwnershipStat()
      stats += ownership
    }

    if (this.masterId) {
      let masterName = this.getMasterName(this.masterId)
      if (masterName) {
        let masterStat = this.getMasterStat(masterName)
        stats += masterStat
      }
    }

    if (this.isLivestock) {
      stats += this.getLivestockStat()
    }

    if(this.shouldShowHappiness()) {
      if(!this.eventDefinitions) return;
      if(!this.positiveHappiness) {
        this.positiveHappiness = {};
        this.negativeHappiness = {};

        for (let event in Constants.visitorEvents) {
          if (Constants.visitorEvents[event] > 0) this.positiveHappiness[event] = Constants.visitorEvents[event];
          else this.negativeHappiness[event] = Constants.visitorEvents[event];
          
        }
      }


      let positiveHappinessHtml = ""
      for(let happinessEvent in this.positiveHappiness) {
        let pretty = happinessEvent.replace(/[\w]([A-Z])/g, function(c) {
          return c[0] + " " + c[1]
        })
        pretty = helper.capitalizeWords(pretty);
        let shouldShowColor = 'style="color:#444"'
        if(this.eventDefinitions[happinessEvent]) shouldShowColor = 'style="color:#78c1a3"'
        positiveHappinessHtml += `<span ${shouldShowColor} "id="${happinessEvent}">${pretty}: ${this.positiveHappiness[happinessEvent]}\n</span><br/>`
      }
      let negativeHappinessHtml = ""
      for (let happinessEvent in this.negativeHappiness) {
        let pretty = happinessEvent.replace(/[\w]([A-Z])/g, function(c) {
          return c[0] + " " + c[1]
        });
        pretty = helper.capitalizeWords(pretty);
        let shouldShowColor = 'style="color:#444"'
        if(this.eventDefinitions[happinessEvent]) shouldShowColor = "style=\"color:#f38989\""
        negativeHappinessHtml += `<span ${shouldShowColor} id="${happinessEvent}">${pretty}: ${this.negativeHappiness[happinessEvent]}</span><br/>`
      }
      let html = 
      `<div class='entity_stats_entry'>
          <div class='positive_happiness_events'>
            <h3 class="happiness_header">happy:</h3>
            ${positiveHappinessHtml}
          </div>
          <div class='negative_happiness_events'>
            <h3 class="happiness_header">sad:</h3>
            ${negativeHappinessHtml}
          </div>
       </div>
      `

      stats += html
    } 
    if (this.getConstants().shouldShowNeeds) {
      let barWidthPercent = Math.floor(this.hunger / this.getMaxHunger() * 100)

      const hunger = "<div class='entity_stats_entry'>" +
                         "<div class='stats_type'><img class='entity_stats_hunger_label' src='/assets/images/hunger_status.png'></div>" +
                         "<div class='stats_value'>" + 
                           "<div class='hunger_bar bar_container'>" +
                             "<div class='bar_fill' style='width: " + barWidthPercent + "%'>" +
                             "</div>" +
                           "</div>" +
                         "</div>" +
                       "</div>"

      stats += hunger

      barWidthPercent = Math.floor(this.stamina / this.getMaxStamina() * 100)

      const stamina = "<div class='entity_stats_entry'>" +
                         "<div class='stats_type'><img class='entity_stats_stamina_label'  src='/assets/images/stamina_icon.png'></div>" +
                         "<div class='stats_value'>" + 
                           "<div class='stamina_bar bar_container'>" +
                             "<div class='bar_fill' style='width: " + barWidthPercent + "%'>" +
                             "</div>" +
                           "</div>" +
                         "</div>" +
                       "</div>"

      stats += stamina

//       barWidthPercent = Math.floor(this.happiness / this.getMaxHappiness() * 100)
// 
//       const happiness = "<div class='entity_stats_entry'>" +
//                           "<div class='stats_type'><img class='entity_stats_stamina_label' src='/assets/images/happiness_status.png'></div>" +
//                           "<div class='stats_value'>" + 
//                             "<div class='happiness_bar bar_container'>" +
//                               "<div class='bar_fill' style='width: " + barWidthPercent + "%'>" +
//                               "</div>" +
//                             "</div>" +
//                           "</div>" +
//                         "</div>"
// 
//       stats += happiness
    }


    if (this.goalTargets) {
      let goals = "<div class='entity_stats_entry'>" +
                      "<div class='stats_type'>Goals</div>" +
                      "<div class='stats_value'>" + this.getGoalTargetsHTML() + "</div>" +
                  "</div>"
      stats += goals
    }


    

    entityMenu.querySelector(".entity_stats").innerHTML = stats
  }

  shouldShowHappiness() {
    return false;
  }

  shouldShowOwner() {
    return true
  }

  getGoalTargetsHTML() {
    return this.goalTargets.split(",").map((goalTarget) => {
      return goalTarget + "<br/>"
    }).join("")
  }

  getMasterName(masterId) {
    let entity = this.game.sector.getEntity(masterId)
    if (entity) {
      return entity.name
    } else {
      return null
    }
  }

  getLivestockStat() {
    let el = "<div class='entity_stats_entry'>" +
                    "<div class='stats_type'>" + i18n.t("livestock") + ":</div>" +
                    "<div class='stats_value livestock_stats_value'>True</div>" +
                "</div>"
    return el
  }

  getMasterStat(masterName) {
    let el = "<div class='entity_stats_entry'>" +
                    "<div class='stats_type'>" + i18n.t("Following") + ":</div>" +
                    "<div class='stats_value'>" + masterName + "</div>" +
                "</div>"
    return el
  }

  isPet() {

  }

  canTakeAlong() {
    if (this.hasCategory("mountable")) return false
      
    return this.getConstants().isTamable ||
           this.hasCategory("bot") ||
           this.hasCategory("worker") ||
           this.hasCategory("trader") 
  }

  canBecomeLivestock() {
    return this.getConstants().isTamable
  }

  shouldShowInteractTooltip() {
    if (this.owner) {
      let item = this.game.player.getActiveItem()
      if (item && Item.isNameTag(item.type)) {
        return true
      }
    }

    return super.shouldShowInteractTooltip()
  }

  hasMenu() {
    if (this.owner) {
      let item = this.game.player.getActiveItem()
      if (item && Item.isNameTag(item.type)) {
        return true
      }
    }

    return super.hasMenu()
  }

  openMenu() {
    if (this.owner) {
      let item = this.game.player.getActiveItem()
      if (item && Item.isNameTag(item.type)) {
        this.game.changeNameMenu.open({ entity: this })
        return
      }
    }
  }

  shouldSendInteractTargetToServer() {
    if (this.owner) {
      let item = this.game.player.getActiveItem()
      if (item && Item.isNameTag(item.type)) {
        return false
      }
    }

    return super.shouldSendInteractTargetToServer()
  }

  getActionTooltipMessage() {
    if (this.owner) {
      let item = this.game.player.getActiveItem()
      if (item && Item.isNameTag(item.type)) {
        return "Change Name"
      }
    }

    return super.getActionTooltipMessage()
  }

  showAction(entityMenu) {
    if (!this.belongToOwner(this.game.player)) {
      // reset
      entityMenu.querySelector(".entity_action").innerHTML = ""
      return
    }

    let player = this.game.player
    let team = player.getTeam()
    let actions = ""

    if (this.canTakeAlong()) {
      const take = "<div class='take_btn ui_btn' data-action='take_along'>" + i18n.t("Take Along") + "</div>"
      const release = "<div class='release_btn ui_btn' data-action='release'>" + i18n.t("Release") + "</div>"


      if (this.masterId === player.id) {
        actions += release
      } else if (!this.masterId) {
        // only show take if no master yet
        actions += take
      }
    }

    const makeLivestock = "<div class='make_livestock_btn ui_btn' data-action='make_livestock'>" + i18n.t("Make Livestock") + "</div>"
    const makePet = "<div class='make_pet_btn ui_btn' data-action='make_pet'>" + i18n.t("Make Pet") + "</div>"

    if (this.game.isLeaderAndOwner(this, team, player) && 
        this.canBecomeLivestock()) {
      if (this.isLivestock) {
        actions += makePet
      } else {
        actions += makeLivestock
      }
    }

    entityMenu.querySelector(".entity_action").innerHTML = actions
  }

  isNPC() {
    return !!this.getConstants().isNPC    
  }

  getDamage() {
    return this.getStats(this.level).damage
  }

  getLineOfSightRange() {
    return this.getStats(this.level).los
  }

  animateDamage() {
    if (this.spriteRestoreTimeout) return

    this.getTintableSprite().alpha = 0.1

    this.spriteRestoreTimeout = setTimeout(() => {
      this.getTintableSprite().alpha = 1
      this.spriteRestoreTimeout = null
    }, 50)

  }

  animateEquipment() {
    // nothing by default
  }

  registerAnimationTween(tween) {
    this.tween = tween
    return tween
  }

  cleanupAnimationTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
  }


  animateExplosion() {
    ClientHelper.animateExplosion(this.getX(), this.getY())
  }

  shouldCreateDeadBody() {
    return false
  }

  getCollisionGroup() {
    return "collisionGroup.Mob"
  }

  renderDeadBody() {
    this.addDizzyEyes(this.characterSprite)
  }

  getDizzySpriteConfig() {
    return this.getConstants().dizzySprite || {}
  }


}

Object.assign(BaseMob.prototype, Upgradable.prototype, {
})

Object.assign(BaseMob.prototype, Faithable.prototype, {
  onFaithChanged() {
    if (game.entityMenu.selectedEntity === this) {
      this.game.showEntityMenu(this)
    }
  },
  onFaithIncreased() {
    this.animateHeart()
  }
})

Object.assign(BaseMob.prototype, Destroyable.prototype, {
  onHealthZero() {
    // this.animateExplosion()
    this.healthBar.hide()
  },
  onHealthReduced(delta) {
    if (this.health === 0) return

    this.healthBar.showDamageTaken(delta)
    this.animateDamage()
  },
  onHealthIncreased(delta) {
    this.healthBar.showHealthIncreased(delta)
    
    const isIncreasedFromZero = this.health === delta
    if (isIncreasedFromZero) {
      this.resurrectBody()
    }
  },
  onPostSetHealth(delta) {
    this.healthBar.draw()

    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }
  },
  getMaxHealth() {
    if (this.game.sector.entityCustomStats[this.id]) {
      return this.game.sector.entityCustomStats[this.id].health
    }

    if (this.game.sector.mobCustomStats[this.getType()]) {
      return this.game.sector.mobCustomStats[this.getType()].health
    }

    let health = this.getStats().health
    let level = this.level || 0
    return health + level * 10
  }
})

Object.assign(BaseMob.prototype, ShipMountable.prototype, {
  getRelativeX() {
    return this.sprite.position.x
  },
  getRelativeY() {
    return this.sprite.position.y
  }
})

Object.assign(BaseMob.prototype, Needs.prototype, {
  onHungerChanged(delta) {
    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }

    let isHungerDecreased = delta > 0
    if (isHungerDecreased) {
      this.animateHungerDecreased(delta)
    }

  },
  onStaminaChanged() {
    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }
  },
  onSleepStateChanged() {
    if (this.isSleeping) {
      this.showSleepAnimation()
    } else {
      this.hideSleepAnimation()
    }
  }
})


module.exports = BaseMob
