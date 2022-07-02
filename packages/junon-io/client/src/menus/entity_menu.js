const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Helper = require("../../../common/helper")
const Protocol = require("../../../common/util/protocol")

class EntityMenu extends BaseMenu {

  onMenuConstructed() {
    this.createSlaveTasks()
    this.createAttackTargets()
  }

  initListeners() {
    super.initListeners()
    this.initActionListeners()
    this.initTabListeners()
    this.initTasksListeners()
    this.initAttackTargetListeners()
    this.initPermissionListeners()
    this.initSpawnPointListeners()

    this.selectedEntity = null
  }

  isModal() {
    return false
  }

  cleanup() {
    this.selectedEntity = null
    this.close()
  }

  createSlaveTasks() {
    // let tasks = ["farm", "butcher_corpse", "refill_turret", "cook", "repair"]

    let el = ""

    let taskNames = Object.keys(Protocol.definition().TaskType)
    for (let i = 0; i < taskNames.length; i++) {
      let taskName = taskNames[i]
      let taskId = Protocol.definition().TaskType[taskName]
      el += this.createTaskEl(taskName, taskId)
    }

    this.el.querySelector(".slave_task_container").innerHTML = el
  }

  createAttackTargets() {
    let targetTypes = ["Mob", "Player"]

    let el = ""

    for (let i = 0; i < targetTypes.length; i++) {
      let targetTypeName = targetTypes[i]
      let typeId = Protocol.definition().AttackTargetType[targetTypeName]
      el += this.createAttackTargetEl(targetTypeName, typeId)
    }

    this.el.querySelector(".attack_type_container").innerHTML = el
  }

  createPermissions() {
    let el = ""

    let slaveRoleId = 3

    el += this.createPermissionEl({ id: slaveRoleId, name: "Slave" })

    for (let id in this.game.roles) {
      let role = this.game.roles[id]
      el += this.createPermissionEl(role)
    }

    this.el.querySelector(".entity_permission_roles").innerHTML = el

    this.slaveRoleEl = this.el.querySelector(".entity_permission_roles .permission_role[data-role-id='" + slaveRoleId + "']")
  }

  populateSpawnPointSelectors() {
    let el = ""

    el += this.createSpawnPointEl("everyone", "Everyone")

    for (let id in this.game.roles) {
      let role = this.game.roles[id]
      let key = "role-" + role.id
      let value = "Role: " + role.name
      el += this.createSpawnPointEl(key, value)
    }

    for (let id in this.game.teams) {
      let team = this.game.teams[id]
      let key = "team-" + team.id
      let value = "Team: " + team.name
      el += this.createSpawnPointEl(key, value)
    }

    this.el.querySelector(".spawn_select").innerHTML = el
  }

  createTaskEl(taskName, taskId) {
    let task = Helper.camelToSnakeCase(taskName)
    let taskFriendlyName = i18n.t(taskName.replace(/([A-Z])/g, ' $1').replace(/^\s+/g,''))
    return "<div class='slave_task' data-task-id='" + taskId + "'>" + 
      "<input type='checkbox'  id='" + task + "_task' >" +
      "<label                 for='" + task + "_task' >" +
        taskFriendlyName + 
      "</label>" +
    "</div>"
  }

  createAttackTargetEl(targetName, typeId) {
    let target = Helper.camelToSnakeCase(targetName)
    let targetFriendlyName = targetName + "Target"
    return "<div class='attack_target' data-target-id='" + typeId + "'>" + 
      "<input type='checkbox'  id='" + target + "_target' >" +
      "<label                 for='" + target + "_target' >" +
        i18n.t(targetFriendlyName) + 
      "</label>" +
    "</div>"
  }

  createPermissionEl(role) {
    return "<div class='permission_role' data-role-id='" + role.id + "'>" + 
      "<input type='checkbox'  id='" + role.name + "_role' >" +
      "<label                 for='" + role.name + "_role' >" +
        i18n.t(role.name) +
      "</label>" +
    "</div>"
  }

  createSpawnPointEl(key, value) {
    return "<option class='spawn_point_filter' value='" + key + "'>" + 
      value + 
    "</option>"
  }

  initTasksListeners() {
    this.el.querySelector(".slave_task_container").addEventListener("click", (e) => {
      let slaveTask = e.target.closest(".slave_task")
      if (!slaveTask) return
      if (e.target.tagName !== 'INPUT') return // dont process label click event

      e.stopPropagation()
      e.preventDefault()

      let taskId = slaveTask.dataset.taskId

      SocketUtil.emit("EditTask", { 
        entityId: this.entity.getId(),
        taskType: taskId,
        isEnabled: slaveTask.querySelector("input").checked
      })

    }, true)
      
  }

  initAttackTargetListeners() {
    this.el.querySelector(".attack_type_container").addEventListener("click", (e) => {
      let attackTarget = e.target.closest(".attack_target")
      if (!attackTarget) return
      if (e.target.tagName !== 'INPUT') return // dont process label click event

      e.stopPropagation()
      e.preventDefault()

      let targetId = attackTarget.dataset.targetId

      SocketUtil.emit("EditBuilding", { 
        id: this.entity.getId(),
        targetType: targetId,
        isTargetEnabled: attackTarget.querySelector("input").checked
      })

    }, true)
      
  }

  onCustomAccessSelectChanged(e) {
    e.preventDefault()
    let access = e.target.value

    SocketUtil.emit("EditBuilding", {
      id: this.entity.id,
      isCustomAccess: access === 'custom'
    })
  }

  onSpawnSelectChanged(e) {
    e.preventDefault()
    let value = e.target.value

    SocketUtil.emit("EditBuilding", {
      id: this.entity.id,
      content: value
    })
  }

  initSpawnPointListeners() {
    this.el.querySelector(".spawn_select").addEventListener("change", this.onSpawnSelectChanged.bind(this))
  }

  initPermissionListeners() {
    this.el.querySelector(".custom_access_select").addEventListener("change", this.onCustomAccessSelectChanged.bind(this))

    this.el.querySelector(".entity_permission_roles").addEventListener("click", (e) => {
      let role = e.target.closest(".permission_role")
      if (!role) return
      if (e.target.tagName !== 'INPUT') return // dont process label click event

      e.stopPropagation()
      e.preventDefault()

      if (!this.game.player.isAdmin()) {
        this.game.displayError("Permission Denied", { warning: true })
        return
      }

      let roleId = role.dataset.roleId

      SocketUtil.emit("EditBuilding", { 
        id: this.entity.getId(),
        roleType: roleId,
        isRoleEnabled: role.querySelector("input").checked
      })

    }, true)
      
  }

  initTabListeners() {
    document.querySelector(".entity_tabs").addEventListener("click", (event) => {
      let entityTab = event.target.closest(".entity_tab")
      if (!entityTab) return

      this.resetTabs()

      this.selectedTab = entityTab

      let tab = entityTab.dataset.tab
      this.showTab(tab)
    })
  }

  resetTabs() {
    let content = document.querySelector(".entity_tab_content.selected")
    if (content) {
      content.classList.remove("selected")
    }

    let tab = document.querySelector(".entity_tab.selected")
    if (tab) {
      tab.classList.remove("selected")
    }
  }

  hideTab(tab) {

  }

  showTab(tabName) {
    let tabContent = document.querySelector(`.entity_tab_content.${tabName}`)
    tabContent.classList.add('selected')

    let tab = document.querySelector(`.entity_tab[data-tab='${tabName}']`)
    tab.classList.add("selected")
  }

  interpolateDescription(description, entity) {
    let result = description

    result = result.replace(/`.*?`/g, (x) => { 
      try {
        x = x.substring(1, x.length-1) //remove the ` characters
        let evaluated = eval(x) 
        return evaluated
      } catch(e) {
        return ''
      }
    })

    return result
  }

  initActionListeners() {
    document.querySelector(".entity_action").addEventListener("mouseover", (event) => {
      let button = event.target.closest(".ui_btn")
      if (!button) return

      if (button.querySelector(".button_tooltip")) {
        button.querySelector(".button_tooltip").style.display = 'block'
        let description = button.dataset.description
        if (description) {
          let newDescription = this.interpolateDescription(description, this.selectedEntity)
          button.querySelector(".button_tooltip").innerText = newDescription
        }
      } 
    })

    document.querySelector(".entity_action").addEventListener("mouseout", (event) => {
      let button = event.target.closest(".ui_btn")
      if (!button) return

      if (button.querySelector(".button_tooltip")) {
        button.querySelector(".button_tooltip").style.display = 'none'
      } 
    })

    document.querySelector(".entity_action").addEventListener("click", (event) => {
      let button = event.target.closest(".ui_btn")
      if (!button) return

      if (button.querySelector(".button_tooltip")) {
        button.querySelector(".button_tooltip").style.display = 'none'
      } 

      SocketUtil.emit("ButtonClick", { 
        name: button.dataset.name,
        entityId: this.selectedEntity && this.selectedEntity.id
      })

      switch(button.dataset.action) {
        case "take_along":
          this.onTakeAlongClicked(this.selectedEntity)
          break
        case "release":
          this.onReleaseClicked(this.selectedEntity)
          break
        case "make_livestock":
          this.onMakeLivestockClicked(this.selectedEntity)
          break
        case "make_pet":
          this.onMakePetClicked(this.selectedEntity)
          break
        case "set_hangar":
          this.startRegionSelect()
          break
        case "edit_ship":
          this.editShip(this.selectedEntity)
          break
        case "edit_permissions":
          this.onEditPermissions(this.selectedEntity)
          break
        case "send_money":
          this.onSendMoney(this.selectedEntity)
          break
        case "vending_withdraw": 
          this.onVendingWithdraw(this.selectedEntity)
          break
        case "kick": 
          this.onPlayerKick(this.selectedEntity)
          break
        case "ban": 
          this.onPlayerBan(this.selectedEntity)
          break
        case "add_friend": 
          this.onPlayerAddFriend(this.selectedEntity)
          break
        default: 

      }
    })
  }

  isEntityMenu() {
    return true
  }

  update(entity) {
    if (this.entity === entity) {
      this.showEntitySummary(entity)
    }
  }

  showEntitySummary(entity) {
    // reset action/stats
    if (!entity) return
    if (!this.game.player) return
      
    this.el.querySelector(".entity_stats").innerHTML  = ""
    
    if (entity.isPlayer()) {
      this.el.querySelector(".entity_info_tab .entity_name_label").innerText = entity.getName()
      this.el.querySelector(".entity_task_tab .entity_name_label").innerText = entity.getName()
      this.el.querySelector(".entity_targets_tab .entity_name_label").innerText = entity.getName()
    } else {
      this.el.querySelector(".entity_info_tab .entity_name_label").innerText = entity.getEntityMenuName()
      this.el.querySelector(".entity_task_tab .entity_name_label").innerText = entity.getEntityMenuName()
      this.el.querySelector(".entity_targets_tab .entity_name_label").innerText = entity.getEntityMenuName()
    }
    
    this.el.querySelector(".entity_action").innerHTML = "" // reset

    
    if (this.game.shouldShowDebugDetails()) {
      this.el.querySelector(".debug_container").style.display = 'block'

      this.el.querySelector(".entity_id").innerText    = "id: " + entity.id
      // this.el.querySelector(".entity_pos_x").innerText = "xy:  (" + [Math.round(entity.getX()), Math.round(entity.getY())].join(",") + ")"

      if (typeof entity.getRow === "function") {
        this.el.querySelector(".entity_row").innerText = "rowcol:  (" + [Math.round(entity.getRow()), Math.round(entity.getCol())].join(",") + ")"
      }

      // reset values
      this.el.querySelector(".entity_light_ambient_color").innerText = ""
      this.el.querySelector(".entity_light_brightness").innerText = ""
      this.el.querySelector(".entity_light_color").innerText = ""
    } else {
      this.el.querySelector(".debug_container").style.display = 'none'
    }

    if (entity.hasCategory("editable_permissions") &&
        entity.belongToOwner(this.game.player) &&
        this.game.player.isAdmin()) {
      this.el.querySelector(".entity_permissions_container").style.display = 'block'
    } else {
      this.el.querySelector(".entity_permissions_container").style.display = 'none'
    }

    if (entity.hasCategory("spawnpoint") &&
        entity.belongToOwner(this.game.player) &&
        this.game.player.isAdmin()) {
      this.el.querySelector(".spawn_select_container").style.display = 'block'
    } else {
      this.el.querySelector(".spawn_select_container").style.display = 'none'
    }

    let slaveRoleId = 3
    if (entity.hasCategory("door")) {
      if (this.slaveRoleEl.style.display !== 'none') {
        this.slaveRoleEl.style.display = 'none'
      }
    } else {
      if (this.slaveRoleEl.style.display !== 'block') {
        this.slaveRoleEl.style.display = 'block'
      }
    }

    entity.renderEntityMenu(this.el)

    if (entity.hasCategory("dummy_player")) {
      this.el.querySelector(".entity_info_tab").classList.add("dummy_player")      
    } else {
      this.el.querySelector(".entity_info_tab").classList.remove("dummy_player")      
    }
  }

  editShip(hangarController) {
    const region = hangarController.getRegion()
    if (this.getPlayer().hangar) {
      this.getPlayer().setHangar(null)
    } else {
      this.getPlayer().setHangar(region)
      let shipId = region.content
      SocketUtil.emit("EditShip", { id: shipId })
    }

    this.game.showEntityMenu(this.selectedEntity)
  }


  onEditPermissions(entity) {
    if (!entity) return

    this.game.permissionsMenu.open({ entity: entity })
  }

  onSendMoney(entity) {
    if (!entity) return

    this.game.sendMoneyMenu.open({ receiver: entity })
  }

  onPlayerKick(entity) {
    if (!entity) return

    this.game.teamMenu.kickMember(entity.id)
  }

  onPlayerBan(entity) {
    if (!entity) return

    this.game.teamMenu.banMember(entity.id)
  }

  onPlayerAddFriend(entity) {
    if (!entity) return
    if (!entity.isPlayer()) return   

    if (this.game.main.isMyFriend(entity.uid)) return

    this.game.main.addFriend(entity.uid)
    this.game.entityMenu.redraw()
  }

  onVendingWithdraw(entity) {
    if (!entity) return

    SocketUtil.emit("EditBuilding", { id: entity.id, action: 'withdraw' })
  }

  onTakeAlongClicked(entity) {
    if (!entity) return
    SocketUtil.emit("TakeAlong", { id: entity.id })
  }

  onReleaseClicked(entity) {
    if (!entity) return 
    SocketUtil.emit("Release", { id: entity.id })
  }

  onMakeLivestockClicked(entity) {
    if (!entity) return 
    SocketUtil.emit("SetLivestock", { id: entity.id, isLivestock: true })
  }

  onMakePetClicked(entity) {
    if (!entity) return 
    SocketUtil.emit("SetLivestock", { id: entity.id, isLivestock: false })
  }

  open(entity, options = {}) {
    if (!this.game.player) return
      
    if (this.game.hideMainMenus) return
    if (this.selectedEntity && 
        this.selectedEntity !== entity &&
        !options.replaceSelected) {
      return
    }

    clearTimeout(this.closeTimeout)
    clearTimeout(this.openTimeout)

    this.openTimeout = setTimeout(() => {
      super.open(options)

      this.entity = entity
      if (options.selectedEntity) {
        this.selectedEntity = options.selectedEntity
      }

      this.showEntitySummary(entity)
      this.renderTabs()
    }, 30)
  }

  redraw() {
    if (this.selectedEntity) {
      this.showEntitySummary(this.selectedEntity)
      this.renderTabs()
    }
  }

  shouldShowTabs() {
    if (!this.entity.belongToOwner(this.game.player)) return false
    if (this.game.player.isGuest()) return false

    let entityHasTab = this.entity.hasCategory("worker") || this.entity.hasCategory("editable_targets")
    return entityHasTab 
  }

  renderTabs() {
    let shouldShowTabs = this.shouldShowTabs()
    if (shouldShowTabs) {
      this.el.classList.add("tabbed")
      this.el.querySelector(".entity_tabs").style.display = 'table-cell'
      if (this.entity.hasCategory("worker")) {
        this.el.querySelector("[data-tab='entity_task_tab']").style.display = 'table-cell'
        this.el.querySelector("[data-tab='entity_targets_tab']").style.display = 'none'
      } else if (this.entity.hasCategory("editable_targets")) {
        this.el.querySelector("[data-tab='entity_task_tab']").style.display = 'none'
        this.el.querySelector("[data-tab='entity_targets_tab']").style.display = 'table-cell'
      }
    } else {
      this.el.classList.remove("tabbed")
      this.el.querySelector(".entity_tabs").style.display = 'none'
    }

    this.resetTabs()

    if (shouldShowTabs &&
        this.selectedTab && 
        this.selectedTab.dataset.tab === 'entity_task_tab' &&
        this.entity.hasCategory("worker")) {
      this.showTab("entity_task_tab")
    } else {
      this.showTab("entity_info_tab")
    }
  }

  removeSelectedEntity() {
    this.selectedEntity = null
  }

  isOpen(entity) {
    let isOpen = super.isOpen()
    let isBelongToEntity = entity === this.selectedEntity || entity === this.entity
    return isOpen && isBelongToEntity
  }

  close() {
    clearTimeout(this.closeTimeout)
    if (this.selectedEntity) return

    this.closeTimeout = setTimeout(() => {
      if (this.selectedEntity) {
        // this.showEntitySummary(this.selectedEntity)
      } else {
        super.close()
      }
    }, 30)
  }
}

module.exports = EntityMenu
