const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")
const Helper = require("./../../../common/helper")
const ClientHelper = require("./../util/client_helper")


/*
    while element references only inventory, it actually changes hotbar/quick_inventory as well
*/
class TeamMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector("#leave_team_btn").addEventListener("click", this.onLeaveTeamBtnClick.bind(this), true)
    this.el.querySelector(".invite_link_input").addEventListener("click", this.onTeamInviteInputClick.bind(this), true)
    this.el.querySelector(".team_private_status").addEventListener("click", this.onTeamPrivacyStatusClick.bind(this), true)
    this.el.querySelector(".member_management_container").addEventListener("click", this.onMemberListClick.bind(this))

    this.el.querySelector(".rename_btn").addEventListener("click", this.onRenameBtnClick.bind(this))
    this.el.querySelector(".colony_name_input").addEventListener("blur", this.onColonyNameInputBlur.bind(this))
    this.el.querySelector(".colony_name_input").addEventListener("keyup", this.onColonyNameInputKeyup.bind(this))

    this.el.querySelector(".team_list_container").addEventListener("click", this.onTeamContainerClick.bind(this))
    this.el.querySelector(".role_list").addEventListener("click", this.onRoleListClick.bind(this))
    this.el.querySelector(".role_permissions").addEventListener("click", this.onRolePermissionsClick.bind(this), true)

    this.el.querySelector(".add_screenshot_btn").addEventListener("click", this.onAddScreenshotClick.bind(this))
    this.el.querySelector(".new_role_btn").addEventListener("click", this.onNewRoleBtnClick.bind(this))
    this.el.querySelector(".delete_role_btn").addEventListener("click", this.onDeleteRoleBtnClick.bind(this))
    this.el.querySelector(".role_name_input").addEventListener("change", this.onRoleNameInputChanged.bind(this))
    this.el.querySelector(".role_name_input").addEventListener("keydown", this.onRoleNameInputKeydown.bind(this))
    this.el.querySelector(".role_name_input").addEventListener("keyup", this.onRoleNameInputKeyup.bind(this))

    this.el.querySelector(".colony_info_tab_container").addEventListener("click", this.onColonyTabClick.bind(this))
    this.el.querySelector(".colony_screenshots_gallery").addEventListener("click", this.onScreenshotGalleryClick.bind(this))

    this.el.querySelector("#enable_pvp").addEventListener("click", this.onEnablePvPClick.bind(this), true)
    this.el.querySelector("#disable_pvp").addEventListener("click", this.onDisablePvPClick.bind(this), true)

    this.el.querySelector("#enable_zoom").addEventListener("click", this.onEnableZoomClick.bind(this), true)
    this.el.querySelector("#disable_zoom").addEventListener("click", this.onDisableZoomClick.bind(this), true)

    this.el.querySelector("#enable_fov").addEventListener("click", this.onEnableFovClick.bind(this), true)
    this.el.querySelector("#disable_fov").addEventListener("click", this.onDisableFovClick.bind(this), true)

    this.el.querySelector("#enable_minimap").addEventListener("click", this.onEnableMinimapClick.bind(this), true)
    this.el.querySelector("#disable_minimap").addEventListener("click", this.onDisableMinimapClick.bind(this), true)

    this.el.querySelector("#enable_team_join").addEventListener("click", this.onEnableTeamJoinClick.bind(this), true)
    this.el.querySelector("#disable_team_join").addEventListener("click", this.onDisableTeamJoinClick.bind(this), true)

    this.el.querySelector("#enable_playerlist").addEventListener("click", this.onEnablePlayerlistClick.bind(this), true)
    this.el.querySelector("#disable_playerlist").addEventListener("click", this.onDisablePlayerlistClick.bind(this), true)

    this.el.querySelector("#enable_mob_autospawn").addEventListener("click", this.onEnableMobAutospawnClick.bind(this), true)
    this.el.querySelector("#disable_mob_autospawn").addEventListener("click", this.onDisableMobAutospawnClick.bind(this), true)

    this.el.querySelector("#enable_floor_autodirt").addEventListener("click", this.onEnableFloorAutodirtClick.bind(this), true)
    this.el.querySelector("#disable_floor_autodirt").addEventListener("click", this.onDisableFloorAutodirtClick.bind(this), true)

    this.el.querySelector("#enable_stamina").addEventListener("click", this.onEnableStaminaClick.bind(this), true)
    this.el.querySelector("#disable_stamina").addEventListener("click", this.onDisableStaminaClick.bind(this), true)

    this.el.querySelector("#enable_hunger").addEventListener("click", this.onEnableHungerClick.bind(this), true)
    this.el.querySelector("#disable_hunger").addEventListener("click", this.onDisableHungerClick.bind(this), true)

    this.el.querySelector("#enable_oxygen").addEventListener("click", this.onEnableOxygenClick.bind(this), true)
    this.el.querySelector("#disable_oxygen").addEventListener("click", this.onDisableOxygenClick.bind(this), true)

    this.el.querySelector("#enable_chat").addEventListener("click", this.onEnableChatClick.bind(this), true)
    this.el.querySelector("#disable_chat").addEventListener("click", this.onDisableChatClick.bind(this), true)

    this.el.querySelector("#enable_infinite_ammo").addEventListener("click", this.onEnableInfiniteAmmoClick.bind(this), true)
    this.el.querySelector("#disable_infinite_ammo").addEventListener("click", this.onDisableInfiniteAmmoClick.bind(this), true)

    this.el.querySelector("#enable_infinite_power").addEventListener("click", this.onEnableInfinitePowerClick.bind(this), true)
    this.el.querySelector("#disable_infinite_power").addEventListener("click", this.onDisableInfinitePowerClick.bind(this), true)

    this.el.querySelector("#enable_shadows").addEventListener("click", this.onEnableShadowsClick.bind(this), true)
    this.el.querySelector("#disable_shadows").addEventListener("click", this.onDisableShadowsClick.bind(this), true)

    this.el.querySelector("#enable_player_saving").addEventListener("click", this.onEnablePlayerSavingClick.bind(this), true)
    this.el.querySelector("#disable_player_saving").addEventListener("click", this.onDisablePlayerSavingClick.bind(this), true)

    this.el.querySelector("#enable_crafting").addEventListener("click", this.onEnableCraftingClick.bind(this), true)
    this.el.querySelector("#disable_crafting").addEventListener("click", this.onDisableCraftingClick.bind(this), true)

    this.el.querySelector("#enable_blood").addEventListener("click", this.onEnableBloodClick.bind(this), true)
    this.el.querySelector("#disable_blood").addEventListener("click", this.onDisableBloodClick.bind(this), true)

    this.el.querySelector("#enable_suit_change").addEventListener("click", this.onEnableSuitChangeClick.bind(this), true)
    this.el.querySelector("#disable_suit_change").addEventListener("click", this.onDisableSuitChangeClick.bind(this), true)

    this.el.querySelector("#enable_drop_inventory_on_death").addEventListener("click", this.onEnableDropInventoryOnDeathClick.bind(this), true)
    this.el.querySelector("#disable_drop_inventory_on_death").addEventListener("click", this.onDisableDropInventoryOnDeathClick.bind(this), true)

    this.el.querySelector("#enable_corpse").addEventListener("click", this.onEnableCorpse.bind(this), true)
    this.el.querySelector("#disable_corpse").addEventListener("click", this.onDisableCorpse.bind(this), true)

    this.el.querySelector("#enable_mutant").addEventListener("click", this.onEnableMutant.bind(this), true)
    this.el.querySelector("#disable_mutant").addEventListener("click", this.onDisableMutant.bind(this), true)

    this.el.querySelector("#enable_gravity").addEventListener("click", this.onEnableGravity.bind(this), true)
    this.el.querySelector("#disable_gravity").addEventListener("click", this.onDisableGravity.bind(this), true)

    this.el.querySelector(".colony_logs_refresh_btn").addEventListener("click", this.onLogsRefreshClick.bind(this), true)
    this.el.querySelector(".command_logs_refresh_btn").addEventListener("click", this.onCommandLogsRefreshClick.bind(this), true)
  }

  updateColonySettings(settings) {
    for (let name in settings) {
      if (name === 'isPvPAllowed') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_pvp").checked = true
        } else {
          this.el.querySelector("#disable_pvp").checked = true
        }
      }

      if (name === 'isZoomAllowed') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_zoom").checked = true
        } else {
          this.el.querySelector("#disable_zoom").checked = true
        }
      }

      if (name === 'isFovMode') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_fov").checked = true
        } else {
          this.el.querySelector("#disable_fov").checked = true
        }
      }

      if (name === 'showMiniMap') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_minimap").checked = true
        } else {
          this.el.querySelector("#disable_minimap").checked = true
        }
      }

      if (name === 'showTeamJoin') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_team_join").checked = true
        } else {
          this.el.querySelector("#disable_team_join").checked = true
        }
      }

      if (name === 'showPlayerList') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_playerlist").checked = true
        } else {
          this.el.querySelector("#disable_playerlist").checked = true
        }
      }

      if (name === 'isMobAutospawn') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_mob_autospawn").checked = true
        } else {
          this.el.querySelector("#disable_mob_autospawn").checked = true
        }
      }

      if (name === 'isFloorAutodirt') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_floor_autodirt").checked = true
        } else {
          this.el.querySelector("#disable_floor_autodirt").checked = true
        }
      }

      if (name === 'isStaminaEnabled') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_stamina").checked = true
        } else {
          this.el.querySelector("#disable_stamina").checked = true
        }
      }

      if (name === 'isHungerEnabled') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_hunger").checked = true
        } else {
          this.el.querySelector("#disable_hunger").checked = true
        }
      }

      if (name === 'isOxygenEnabled') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_oxygen").checked = true
        } else {
          this.el.querySelector("#disable_oxygen").checked = true
        }
      }

      if (name === 'isChatEnabled') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_chat").checked = true
        } else {
          this.el.querySelector("#disable_chat").checked = true
        }
      }

      if (name === 'isInfiniteAmmo') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_infinite_ammo").checked = true
        } else {
          this.el.querySelector("#disable_infinite_ammo").checked = true
        }
      }

      if (name === 'isInfinitePower') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_infinite_power").checked = true
        } else {
          this.el.querySelector("#disable_infinite_power").checked = true
        }
      }

      if (name === 'isShadowsEnabled') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_shadows").checked = true
        } else {
          this.el.querySelector("#disable_shadows").checked = true
        }
      }

      if (name === 'isPlayerSavingEnabled') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_player_saving").checked = true
        } else {
          this.el.querySelector("#disable_player_saving").checked = true
        }
      }

      if (name === 'isCraftingEnabled') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_crafting").checked = true
        } else {
          this.el.querySelector("#disable_crafting").checked = true
        }
      }

      if (name === 'isBloodEnabled') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_blood").checked = true
        } else {
          this.el.querySelector("#disable_blood").checked = true
        }
      }

      if (name === 'isSuitChangeEnabled') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_suit_change").checked = true
        } else {
          this.el.querySelector("#disable_suit_change").checked = true
        }
      }

      if (name === 'isDropInventoryOnDeath') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_drop_inventory_on_death").checked = true
        } else {
          this.el.querySelector("#disable_drop_inventory_on_death").checked = true
        }
      }

      if (name === 'isCorpseEnabled') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_corpse").checked = true
        } else {
          this.el.querySelector("#disable_corpse").checked = true
        }
      }

      if (name === 'isMutantEnabled') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_mutant").checked = true
        } else {
          this.el.querySelector("#disable_mutant").checked = true
        }
      }

      if (name === 'isGravityEnabled') {
        let value = settings[name]
        if (value) {
          this.el.querySelector("#enable_gravity").checked = true
        } else {
          this.el.querySelector("#disable_gravity").checked = true
        }
      }

    }
  }

  onEnablePvPClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isPvPAllowed',
        value: 'true'
      })
    }
  }

  onDisablePvPClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isPvPAllowed',
        value: 'false'
      })
    }
  }

  onEnableZoomClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isZoomAllowed',
        value: 'true'
      })
    }
  }

  onDisableZoomClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isZoomAllowed',
        value: 'false'
      })
    }
  }

  onEnableFovClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isFovMode',
        value: 'true'
      })
    }
  }

  onDisableFovClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isFovMode',
        value: 'false'
      })
    }
  }

  onEnableFloorAutodirtClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isFloorAutodirt',
        value: 'true'
      })
    }
  }

  onDisableFloorAutodirtClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isFloorAutodirt',
        value: 'false'
      })
    }
  }

  onEnableStaminaClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isStaminaEnabled',
        value: 'true'
      })
    }
  }

  onDisableStaminaClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isStaminaEnabled',
        value: 'false'
      })
    }
  }

  onEnableHungerClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isHungerEnabled',
        value: 'true'
      })
    }
  }

  onDisableHungerClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isHungerEnabled',
        value: 'false'
      })
    }
  }

  onEnableOxygenClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isOxygenEnabled',
        value: 'true'
      })
    }
  }

  onDisableOxygenClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isOxygenEnabled',
        value: 'false'
      })
    }
  }

  onEnableChatClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isChatEnabled',
        value: 'true'
      })
    }
  }

  onDisableChatClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isChatEnabled',
        value: 'false'
      })
    }
  }

  onEnableInfiniteAmmoClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isInfiniteAmmo',
        value: 'true'
      })
    }
  }

  onDisableInfiniteAmmoClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isInfiniteAmmo',
        value: 'false'
      })
    }
  }

  onEnableInfinitePowerClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isInfinitePower',
        value: 'true'
      })
    }
  }

  onDisableInfinitePowerClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isInfinitePower',
        value: 'false'
      })
    }
  }

  onEnableShadowsClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isShadowsEnabled',
        value: 'true'
      })
    }
  }

  onDisableShadowsClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isShadowsEnabled',
        value: 'false'
      })
    }
  }

  onEnablePlayerSavingClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isPlayerSavingEnabled',
        value: 'true'
      })
    }
  }

  onDisablePlayerSavingClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isPlayerSavingEnabled',
        value: 'false'
      })
    }
  }

  onEnableCraftingClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isCraftingEnabled',
        value: 'true'
      })
    }
  }

  onDisableCraftingClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isCraftingEnabled',
        value: 'false'
      })
    }
  }

  onEnableBloodClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isBloodEnabled',
        value: 'true'
      })
    }
  }

  onDisableBloodClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isBloodEnabled',
        value: 'false'
      })
    }
  }

  onEnableSuitChangeClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isSuitChangeEnabled',
        value: 'true'
      })
    }
  }

  onDisableSuitChangeClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isSuitChangeEnabled',
        value: 'false'
      })
    }
  }

  onEnableDropInventoryOnDeathClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isDropInventoryOnDeath',
        value: 'true'
      })
    }
  }

  onDisableDropInventoryOnDeathClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isDropInventoryOnDeath',
        value: 'false'
      })
    }
  }

  onEnableCorpse(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isCorpseEnabled',
        value: 'true'
      })
    }
  }

  onDisableCorpse(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isCorpseEnabled',
        value: 'false'
      })
    }
  }

  onEnableMutant(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isMutantEnabled',
        value: 'true'
      })
    }
  }

  onDisableMutant(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isMutantEnabled',
        value: 'false'
      })
    }
  }

  onEnableGravity(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isGravityEnabled',
        value: 'true'
      })
    }
  }

  onDisableGravity(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isGravityEnabled',
        value: 'false'
      })
    }
  }

  onEnableMinimapClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'showMiniMap',
        value: 'true'
      })
    }
  }

  onDisableMinimapClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'showMiniMap',
        value: 'false'
      })
    }
  }

  onEnableTeamJoinClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'showTeamJoin',
        value: 'true'
      })
    }
  }

  onDisableTeamJoinClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'showTeamJoin',
        value: 'false'
      })
    }
  }

  showTeamJoinTab() {
    document.querySelector(".colony_teams_tab").style.display = 'inline-block'
  }

  hideTeamJoinTab() {
    document.querySelector(".colony_teams_tab").style.display = 'none'
  }

  onEnablePlayerlistClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'showPlayerList',
        value: 'true'
      })
    }
  }

  onDisablePlayerlistClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'showPlayerList',
        value: 'false'
      })
    }
  }

  onEnableMobAutospawnClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'yes') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isMobAutospawn',
        value: 'true'
      })
    }
  }

  onDisableMobAutospawnClick(e) {
    e.preventDefault()

    let value = e.target.value
    if (value === 'no') {
      SocketUtil.emit("SectorAction", {
        action: 'editSetting',
        sectorId: this.game.sector.uid,
        key: 'isMobAutospawn',
        value: 'false'
      })
    }
  }

  onScreenshotGalleryClick(e) {
    let removeScreenshotBtn = e.target.closest(".remove_screenshot_btn")
    if (removeScreenshotBtn) {
      let screenshotKey = e.target.closest(".screenshot_entry").dataset.key
      SocketUtil.emit("RemoveScreenshot", { id: screenshotKey })
    }
  }

  onAddScreenshotClick() {
    this.game.screenshot()
  }

  onNewRoleBtnClick() {
    SocketUtil.emit("EditRole", {
      teamId: this.game.player.teamId
    })
  }

  onDeleteRoleBtnClick() {
    SocketUtil.emit("EditRole", {
      teamId: this.game.player.teamId,
      roleId: this.activeRoleId,
      shouldDelete: true
    })
  }

  onRoleNameInputKeydown(e) {
    clearTimeout(this.roleNameKeyupTimeout)
  }

  onRoleNameInputKeyup(e) {
    let newName = this.el.querySelector(".role_name_input").value

    clearTimeout(this.roleNameKeyupTimeout)

    this.roleNameKeyupTimeout = setTimeout(() => {
      SocketUtil.emit("EditRole", {
        teamId: this.game.player.teamId,
        roleId: this.activeRoleId,
        name: newName
      })
    }, 2000)
  }

  onRoleNameInputChanged(e) {
    let newName = this.el.querySelector(".role_name_input").value

    SocketUtil.emit("EditRole", {
      teamId: this.game.player.teamId,
      roleId: this.activeRoleId,
      name: newName
    })
  }

  updateRole(role) {
    let roleEl = this.el.querySelector(".role[data-id='" + role.id + "']")
    if (roleEl) {
      roleEl.innerText = role.name
    }

    if (this.activeRoleId === role.id) {
      this.renderRolePermissions(role.id)
    }
  }

  renderScreenshots(sector) {
    this.el.querySelector(".colony_screenshots_gallery").innerHTML = ""

    for (let key in sector.screenshots) {
      let el = "<div class='screenshot_entry' data-key='" + key + "'>" +
                  "<img src='" + this.game.main.getScreenshotThumbnailPath(key) + "' />" +
                  "<div class='remove_screenshot_btn'></div>" +
               "</div>"

      this.el.querySelector(".colony_screenshots_gallery").innerHTML += el
    }
  }

  onColonyTabClick(e) {
    let selectedTab = this.el.querySelector(".colony_tab.selected")
    if (selectedTab) {
      selectedTab.classList.remove('selected')
    }

    if (e.target.classList.contains("colony_tab")) {
      let newTab = e.target
      newTab.classList.add('selected')
    }

    let filter = e.target.dataset.tab
    let content = this.el.querySelector(".colony_tab_content[data-tab='" + filter + "']")
    if (content) {
      let activeContent = this.el.querySelector(".colony_tab_content.active")
      if (activeContent) {
        activeContent.classList.remove("active")
      }

      content.classList.add("active")
      this.onColonyTabContentShown(filter)
    }
  }

  onColonyTabContentShown(filter) {
    if (filter === 'logs' || filter === 'commands') {
      SocketUtil.emit("SectorAction", { action: 'viewLogs' })
    }
  }

  onLogsRefreshClick() {
    SocketUtil.emit("SectorAction", { action: 'viewLogs' })
  }

  onCommandLogsRefreshClick() {
    SocketUtil.emit("SectorAction", { action: 'viewLogs' })
  }

  updateActivityLogs(activityLogs) {
    let el = "<table class=''>"

    for (var i = activityLogs.length - 1; i >= 0; i--) {
      el += this.createActivityLogEl(activityLogs[i])
    }

    el += "</table>"

    this.el.querySelector(".colony_logs_list").innerHTML = el
  }

  createActivityLogEl(activityLog) {
    let activityName = Protocol.definition().ActivityType[activityLog.activityType]
    let buildingName = Protocol.definition().BuildingType[activityLog.entityType]
    let friendlyBuildingName = buildingName.replace(/([A-Z])/g, ' $1').trim() // space before capital letters

    let date = new Date(activityLog.timestamp)
    let formattedTime = date.toLocaleDateString() + " " + date.toLocaleTimeString()

    let el = "<tr class='activity_log_row'>" +
               "<td class='activity_log_stat'>" + formattedTime + "</td>" +
               "<td class='activity_log_stat'>" + activityLog.username + "</td>" +
               "<td class='activity_log_stat'>" + i18n.t(activityName) + "</td>" +
               "<td class='activity_log_stat'>" + i18n.t(friendlyBuildingName) + "</td>" +
               "<td class='activity_log_stat'>@ " + [activityLog.row,activityLog.col].join(",") + " </td>" +
             "</tr>"

    return el
  }

  updateCommandLogs(commandLogs) {
    let el = "<table class=''>"

    for (var i = commandLogs.length - 1; i >= 0; i--) {
      el += this.createCommandLogEl(commandLogs[i])
    }

    el += "</table>"

    this.el.querySelector(".command_logs_list").innerHTML = el
  }

  createCommandLogEl(commandLog) {
    let date = new Date(commandLog.timestamp)
    let formattedTime = date.toLocaleDateString() + " " + date.toLocaleTimeString()
    let escapedCommand = ClientHelper.escapeHTML(commandLog.command)

    let el = "<tr class='activity_log_row'>" +
               "<td class='activity_log_stat'>" + formattedTime + "</td>" +
               "<td class='activity_log_stat'>" + commandLog.username + "</td>" +
               "<td class='activity_log_stat command_entry_stat'>" + escapedCommand  + "</td>" +
             "</tr>"

    return el
  }

  onStorageAccessPermissionChange(e) {
    e.preventDefault()

    if (!this.activeTeam) return

    let value = e.target.value
    let permissions = Object.assign({}, this.activeTeam.permissions)
    permissions.storageAccess = value

    SocketUtil.emit("EditTeam", { id: this.activeTeam.id, permissions: permissions })
  }

  redrawMembers() {
    this.render(this.game.teams[this.game.player.teamId])
  }

  onMemberListClick(e) {
    let muteBtn = e.target.closest(".mute_btn")
    if (muteBtn) {
      let username = e.target.closest(".member_list_entry").dataset.username
      if (muteBtn.classList.contains("muted")) {
        this.game.removeMutedPlayer(username)
        this.redrawMembers()
      } else {
        this.game.addMutedPlayer(username)
        this.redrawMembers()
      }
    }

    let kickBtn = e.target.closest(".kick_btn")
    if (kickBtn) {
      let memberId = e.target.closest(".member_list_entry").dataset.memberId
      this.kickMember(memberId)
    }

    let banBtn = e.target.closest(".ban_btn")
    if (banBtn) {
      let memberId = e.target.closest(".member_list_entry").dataset.memberId
      this.banMember(memberId)
    }

    let unbanBtn = e.target.closest(".unban_btn")
    if (unbanBtn) {
      let banId = e.target.closest(".banned_member").dataset.banId
      this.unbanMember(banId)
    }

    let memberName = e.target.closest(".member_list_entry_name")
    if (memberName) {
      let memberEntry = e.target.closest(".member_list_entry")
      let uid = memberEntry.dataset.uid
      let username = memberEntry.dataset.username

      if (!this.game.isPvP()) {
        this.game.userProfileMenu.open({ username: username, uid: uid })
      }
    }
  }

  open(options = {}) {
    super.open(options)

    if (this.game.player) {
      this.render(this.game.teams[this.game.player.teamId])
      this.renderJoinableTeams()
    }

    if (this.game.getTeamCount() > 1 && this.game.sector.settings.showTeamJoin) {
      this.el.querySelector(".colony_teams_tab").style.display = 'inline-block'
    } else {
      this.el.querySelector(".colony_teams_tab").style.display = 'none'
    }

    if (this.game.isPvP()) {
      this.el.querySelector(".colony_pvp_mode").style.display = 'none'
      this.el.querySelector(".colony_zoom").style.display = 'none'
      this.el.querySelector(".colony_fov").style.display = 'none'
      this.el.querySelector(".colony_minimap").style.display = 'none'
    } else {
      this.el.querySelector(".colony_pvp_mode").style.display = 'block'
      this.el.querySelector(".colony_zoom").style.display = 'block'
      this.el.querySelector(".colony_fov").style.display = 'block'
      this.el.querySelector(".colony_minimap").style.display = 'block'
    }

    if (this.game.isPeaceful() || this.game.isMiniGame()) {
      this.el.querySelector(".alliance_entry").style.display = 'none'
      this.el.querySelector(".colony_playerlist").style.display = 'block'
      this.el.querySelector(".colony_hunger_bar").style.display = 'block'
      this.el.querySelector(".colony_stamina_bar").style.display = 'block'
      this.el.querySelector(".colony_oxygen_bar").style.display = 'block'
      this.el.querySelector(".colony_chat_allowed").style.display = 'block'
      this.el.querySelector(".is_infinite_ammo").style.display = 'block'
      this.el.querySelector(".is_infinite_power").style.display = 'block'
    } else {
      this.el.querySelector(".alliance_entry").style.display = 'block'
      this.el.querySelector(".colony_playerlist").style.display = 'none'
      this.el.querySelector(".colony_hunger_bar").style.display = 'none'
      this.el.querySelector(".colony_stamina_bar").style.display = 'none'
      this.el.querySelector(".colony_oxygen_bar").style.display = 'none'
      this.el.querySelector(".colony_chat_allowed").style.display = 'none'
      this.el.querySelector(".is_infinite_ammo").style.display = 'none'
      this.el.querySelector(".is_infinite_power").style.display = 'none'
    }

    this.renderVisitorActionsState()
  }

  resetJoinableTeams() {
    this.el.querySelector(".team_list_container").innerHTML = ""
  }

  renderJoinableTeams() {
    let teamRows = Array.from(this.el.querySelectorAll(".team_list_container .team_list_entry"))
    let visibleCount = 0

    teamRows.forEach((teamRow) => {
      let isOwnTeam = this.activeTeam ? this.activeTeam.id === parseInt(teamRow.dataset.teamId) : false
      let isPrivate = teamRow.dataset.isPrivate

      let multipleMembers = parseInt(teamRow.dataset.memberCount) > 1
      let isFull = parseInt(teamRow.dataset.memberCount) >= 5

      if (isOwnTeam) {
        teamRow.classList.add("own")
      } else {
        teamRow.classList.remove("own")
      }

      if (multipleMembers) {
        teamRow.classList.add("multiple")
      } else {
        teamRow.classList.remove("multiple")
      }

      if (isFull) {
        teamRow.classList.add("full")
      } else {
        teamRow.classList.remove("full")
      }

      if (isOwnTeam) {
        visibleCount += 1
      } else if (!isOwnTeam && !isPrivate && !isFull) {
        visibleCount += 1
      }
    })

    if (visibleCount === 0) {
      this.el.querySelector(".empty_teams_container").style.display = 'block'
    } else {
      this.el.querySelector(".empty_teams_container").style.display = 'none'
    }
  }

  renderVisitorActionsState() {
    if (!this.activeTeam) return
    for (let playerId in this.activeTeam.members) {
      let targetPlayer = this.game.sector.players[playerId]
      let visitorListEntry = this.el.querySelector(".member_list_entry[data-member-id='" + playerId + "']")
      if (targetPlayer && visitorListEntry) {
        if (targetPlayer.isImmuneToKick()) {
          visitorListEntry.classList.add("not_kickable")
        } else {
          visitorListEntry.classList.remove("not_kickable")
        }
      }
    }
  }

  muteMember(memberId) {
    let targetPlayer = this.game.sector.players[memberId]

    SocketUtil.emit("TeamMemberAction", { memberId: memberId, action: "mute" })
  }

  kickMember(memberId) {
    let targetPlayer = this.game.sector.players[memberId]
    if (targetPlayer && targetPlayer.isImmuneToKick()) {
      return
    }

    SocketUtil.emit("TeamMemberAction", { memberId: memberId, action: "kick" })
  }

  banMember(memberId) {
    let targetPlayer = this.game.sector.players[memberId]
    if (targetPlayer && targetPlayer.isImmuneToKick()) {
      return
    }

    SocketUtil.emit("TeamMemberAction", { memberId: memberId, action: "ban" })
  }

  unbanMember(banId) {
    SocketUtil.emit("TeamMemberAction", { banId: banId, action: "unban" })
  }

  onRenameBtnClick(e) {
    let renameBtn = e.target.closest(".rename_btn")
    if (renameBtn) {
      this.showColonyNameInput()
    }
  }

  showColonyNameInput() {
    if (!this.activeTeam) return

    this.el.querySelector(".colony_info_name").style.display = 'none'
    this.el.querySelector(".colony_name_input").style.display = 'inline-block'
    this.el.querySelector(".colony_name_input").value = this.activeTeam.name
    this.el.querySelector(".colony_name_input").focus()
  }

  hideColonyNameInput() {
    this.el.querySelector(".colony_info_name").style.display = 'inline-block'
    this.el.querySelector(".colony_name_input").style.display = 'none'
  }

  onColonyNameInputBlur(e) {
    if (this.omitBlurEvents) return
    this.setColonyName(e.target.value)
    this.hideColonyNameInput()
  }

  onColonyNameInputKeyup(e) {
    if (e.which === 13 || e.which === 27) { // enter or esc
      this.setColonyName(e.target.value)
      this.omitBlurEvents = true
      e.target.blur()
      this.omitBlurEvents = false
      this.hideColonyNameInput()
    }
  }

  setColonyName(name) {
    if (!this.activeTeam) return

    SocketUtil.emit("EditTeam", { id: this.activeTeam.id, name: name })
  }

  onTeamInviteInputClick(event) {
    event.target.select()
    document.execCommand('copy')
  }

  onTeamPrivacyStatusClick() {
    if (!this.activeTeam) return

    SocketUtil.emit("EditTeam", { id: this.activeTeam.id, isPrivate: !this.activeTeam.isPrivate })
  }

  onTeamContainerClick(event) {
    let el = event.target
    let teamEntry = el.closest(".team_list_entry")

    if (el.classList.contains("team_join_btn")) {
      // Join Team
      teamEntry.querySelector(".team_join_btn").style.display = 'none'
      teamEntry.querySelector(".team_status").style.display = 'block'

      let teamId = teamEntry.dataset.teamId
      SocketUtil.emit("JoinTeam", { id: teamId })
    } else if (el.classList.contains("team_leave_btn")) {
      let teamId = teamEntry.dataset.teamId
      SocketUtil.emit("LeaveTeam", { })
    }

  }

  cleanup() {
    // this.el.querySelector(".team_list").innerHTML = ""
    this.el.querySelector(".member_list").innerHTML = ""
  }

  onLeaveTeamBtnClick() {
    let teamId = this.activeTeam.id
    SocketUtil.emit("LeaveTeam", { id: teamId })
  }

  onRestartCharacterClick() {
    SocketUtil.emit("RestartCharacter", {  })
  }

  onRoleListClick(e) {
    let roleEl = e.target.closest(".role")
    if (roleEl) {
      this.selectRole(roleEl)
    }
  }

  selectRole(roleEl) {
    let selectedRole = this.el.querySelector(".role.selected")
    if (selectedRole) {
      selectedRole.classList.remove("selected")
    }

    roleEl.classList.add("selected")

    let roleId = parseInt(roleEl.dataset.id)
    this.renderRolePermissions(roleId)
  }

  onRolePermissionsClick(e) {
    let rolePermission = e.target.closest(".role_permission")
    if (!rolePermission) return
    if (e.target.tagName !== 'INPUT') return // dont process label click event

    e.stopPropagation()
    e.preventDefault()

    if (!this.activeTeam.isLeader(this.game.player)) {
      this.game.displayError("Permission Denied", { warning: true })
      return
    }

    let permission = rolePermission.dataset.permission

    let isEnabled = rolePermission.querySelector("input").checked
    if (permission === "UseCommands" && isEnabled) {
        this.game.confirmMenu.open({
          dontCloseMenus: true,
          message: "Warning! Commands allow people to delete your world. Proceed?",
          proceedCallback: this.editRole.bind(this, permission, isEnabled)
        })
    }else if (permission === "EditCommandBlocks" && isEnabled) {
      this.game.confirmMenu.open({
        dontCloseMenus: true,
        message: "Warning! This permission can potentially allow anyone with this role to do anything to your world. Proceed?",
        proceedCallback: this.editRole.bind(this, permission, isEnabled)
      })
  } else {
      this.editRole(permission, isEnabled)
    }

    return false
  }

  editRole(permission, isEnabled) {
    SocketUtil.emit("EditRole", {
      teamId: this.game.player.teamId,
      roleId: this.activeRoleId,
      permission: permission,
      isEnabled: isEnabled
    })
  }

  removeRole(roleId) {
    let roleEl = this.el.querySelector(".role_list .role[data-id='" + roleId + "']")
    if (roleEl.parentElement) {
      roleEl.parentElement.removeChild(roleEl)
    }

    let roleCount = Object.keys(this.game.roles).length
    let lastRole = Object.values(this.game.roles)[roleCount - 1]
    if (lastRole) {
      let lastRoleEl = this.el.querySelector(".colony_roles_container .role_list .role[data-id='" + lastRole.id + "']")
      if (lastRoleEl) {
        this.selectRole(lastRoleEl)
      }
    }
  }

  renderRolePermissions(roleId) {
    if (Object.keys(this.game.roles).length === 0) return

    this.activeRoleId = roleId
    let result = ""

    if (parseInt(roleId) <= 3 || !this.game.player.isLeader()) {
      this.el.querySelector(".role_name_label").style.display = 'block'
      this.el.querySelector(".role_name_edit").style.display = 'none'
      this.el.querySelector(".delete_role_btn").style.display = 'none'
    } else {
      this.el.querySelector(".role_name_label").style.display = 'none'
      this.el.querySelector(".role_name_edit").style.display = 'block'
      this.el.querySelector(".delete_role_btn").style.display = 'block'
    }

    let role = this.game.roles[roleId]

    this.el.querySelector(".role_name_label_value").innerText = role.name
    this.el.querySelector(".role_name_input").value = role.name

    for (let name in role.permissions) {
      let value = role.permissions[name]
      let el = this.createRolePermissionEl(name, value)
      result += el
    }

    this.el.querySelector(".role_permissions").innerHTML = result
  }

  createRolePermissionEl(permission, value) {
    let permissionFriendlyName = i18n.t(permission.replace(/([A-Z])/g, ' $1').replace(/^\s+/g,''))
    let checked = value ? "checked" : ""

    return "<div class='role_permission' data-permission='" + permission + "'>" +
      "<input type='checkbox'  id='" + permission + "_permission' " + checked + ">" +
      "<label                 for='" + permission + "_permission' >" +
        permissionFriendlyName +
      "</label>" +
    "</div>"
  }

  resetTeamRequestStatus(teamId) {
    let teamEntry = this.el.querySelector(".team_list_entry[data-team-id='" + teamId + "']")
    if (!teamEntry) return

    teamEntry.querySelector(".team_join_btn").style.display = 'block'
    teamEntry.querySelector(".team_status").style.display = 'none'
  }

  renderRelationshipStatus() {
    let team = this.activeTeam

    this.el.querySelector(".colony_info_alliance").innerText = i18n.t(team.relationshipStatus)
    if (team.relationshipStatus === "Hostile") {
      this.el.querySelector(".colony_info_alliance").classList.remove("friendly")
      this.el.querySelector(".colony_info_alliance").classList.add("hostile")
    } else if (team.relationshipStatus === "Friendly") {
      this.el.querySelector(".colony_info_alliance").classList.remove("hostile")
      this.el.querySelector(".colony_info_alliance").classList.add("friendly")
    }
  }

  // if i joined/created a team, show members
  render(team) {
    if (!team) return
    this.resetTeamRequestStatus(team.id)

    this.activeTeam = team

    this.el.querySelector(".colony_info_name").innerText = team.name
    this.el.querySelector(".colony_game_mode").innerText = i18n.t(Helper.capitalize(this.game.sector.gameMode))
    this.el.querySelector(".colony_info_creator_name").innerText = team.creatorName

    this.renderRelationshipStatus()

    this.el.querySelector(".member_list_container").style.display = 'block'

    this.renderRenameBtn(team)
    this.renderInviteLink(team)
    this.renderPrivacy(team)
    this.renderMembers(team)

    if (team.isLeader(this.game.player)) {
      this.el.querySelector(".new_role_btn").style.display = 'inline-block'
    } else {
      this.el.querySelector(".new_role_btn").style.display = 'none'
    }

    if (this.game.isAnonymousGame() || !this.game.player.isSectorOwner()) {
      this.el.querySelector(".colony_screenshot_tab").style.display = 'none'
      if (this.el.querySelector(".colony_screenshots_container").classList.contains("active")) {
        this.el.querySelector(".colony_screenshots_container").classList.remove("active")
        this.el.querySelector(".colony_info_container").classList.add("active")
      }
    } else {
      document.querySelector(".colony_screenshot_tab").style.display = 'inline-block'
    }

    document.querySelector(".colony_settings_tab").style.display = 'inline-block'

    if (!team.isAdmin(this.game.player) || this.game.isMiniGame()) {
      this.el.querySelector(".colony_logs_tab").style.display = 'none'
      this.el.querySelector(".command_logs_tab").style.display = 'none'
      if (this.el.querySelector(".colony_logs_container").classList.contains("active")) {
        this.el.querySelector(".colony_logs_container").classList.remove("active")
        this.el.querySelector(".colony_info_container").classList.add("active")
      }
      if (this.el.querySelector(".command_logs_container").classList.contains("active")) {
        this.el.querySelector(".command_logs_container").classList.remove("active")
        this.el.querySelector(".colony_info_container").classList.add("active")
      }
    } else {
      document.querySelector(".colony_logs_tab").style.display = 'inline-block'
      document.querySelector(".command_logs_tab").style.display = 'inline-block'
    }

    if (this.game.isPvP()) {
      this.renderPvPMode()
    }
  }

  renderPvPMode() {
    this.el.querySelector(".colony_mode_entry").style.display = 'none'
    this.el.querySelector(".colony_creator_name_entry").style.display = 'none'
    this.el.querySelector(".colony_screenshot_tab").style.display = 'none'
    this.el.querySelector(".colony_settings_tab").style.display = 'none'
  }

  createRolesEl(roles) {
    roles = Object.assign({}, roles)
    let result = "<ul>"

    for (let id in roles) {
      let role = roles[id]
      let roleEl = "<li class='role' data-id='" + role.id + "'>" + role.name + "</li>"
      result += roleEl
    }

    return result
  }

  addRole(role) {
    let roleEl = "<li class='role' data-id='" + role.id + "'>" + role.name + "</li>"

    this.el.querySelector(".colony_roles_container .role_list ul").innerHTML += roleEl

    return this.el.querySelector(".role_list .role[data-id='" + role.id + "']")
  }

  renderRoles() {
    let roles = this.game.roles

    let rolesEl = this.createRolesEl(roles)

    this.el.querySelector(".colony_roles_container .role_list").innerHTML = rolesEl

    let firstRole = Object.values(roles)[0]
    if (firstRole) {
      let firstRoleEl = this.el.querySelector(".colony_roles_container .role_list .role")
      if (firstRoleEl) {
        this.selectRole(firstRoleEl)
      }
    }
  }

  isLeader(team, player) {
    return team.leader && team.leader.id === player.id
  }

  renderRenameBtn(team) {
    if (!this.isLeader(team, this.game.player)) {
      this.el.querySelector(".rename_btn").style.display = 'none'
    } else {
      this.el.querySelector(".rename_btn").style.display = 'inline-block'
    }
  }

  renderInviteLink(team) {
    let params = window.location.search
    params = ClientHelper.replaceQueryParam('e', team.getInviteToken(), params)
    let inviteLink = this.game.main.getBrowserHost() + params

    this.el.querySelector(".invite_link_input").value = inviteLink

    if (this.game.isMiniGame()) {
      document.querySelector("#minigame_invite_container .invite_link_input").value = inviteLink
    }
  }

  renderPrivacy(team) {
    let isPrivate = team.isPrivate

    if (this.game.isMiniGame()) {
      isPrivate = this.game.sector.isPrivate
      if (!this.game.isRoundStarted) {
        if (isPrivate) {
          document.querySelector("#minigame_invite_container").style.display = 'block'
        } else {
          document.querySelector("#minigame_invite_container").style.display = 'none'
        }
      }
    } else {
      document.querySelector("#minigame_invite_container").style.display = 'none'
    }

    if (!this.isLeader(team, this.game.player)) {
      this.el.querySelector(".team_private_status").dataset.disabled = true
      this.el.querySelector(".team_private_status").classList.add("read_only")
    } else {
      this.el.querySelector(".team_private_status").classList.remove("read_only")
    }

    if (isPrivate) {
      this.el.querySelector(".team_private_status").classList.add("private")
      this.el.querySelector(".team_private_status").innerText = i18n.t("Private")
    } else {
      this.el.querySelector(".team_private_status").classList.remove("private")
      this.el.querySelector(".team_private_status").innerText = i18n.t("Public")
    }
  }

  setSectorIsPrivate(isPrivate) {
    this.sectorIsPrivate = isPrivate

    this.el.querySelector(".team_private_status").dataset.disabled = true
    this.el.querySelector(".team_private_status").classList.add("read_only")

    if (isPrivate) {
      this.el.querySelector(".team_private_status").classList.add("private")
      this.el.querySelector(".team_private_status").innerText = i18n.t("Private")
    } else {
      this.el.querySelector(".team_private_status").classList.remove("private")
      this.el.querySelector(".team_private_status").innerText = i18n.t("Public")
    }
  }


  renderMembers(team) {
    let playerList = Object.values(team.members)
    this.el.querySelector(".member_list").innerHTML = this.createMemberListHTML(playerList)
    if (!this.activeTeam) return

    if (this.activeTeam.isAdmin(this.game.player)) {
      let offlinePlayerList = Object.values(team.offlineMembers)
      if (offlinePlayerList.length > 0) {
        this.el.querySelector(".offline_member_list").innerHTML = this.createMemberListHTML(offlinePlayerList, { offline: true })
        this.el.querySelector(".offline_member_list_container").style.display = 'block'
      } else {
        this.el.querySelector(".offline_member_list").innerHTML = ""
        this.el.querySelector(".offline_member_list_container").style.display = 'none'
      }

      let sectorBanList = Object.values(this.game.sector.sectorBans)
      if (sectorBanList.length > 0) {
        this.el.querySelector(".ban_member_list").innerHTML = this.createBanListHTML(sectorBanList)
        this.el.querySelector(".ban_member_list_container").style.display = 'block'
      } else {
        this.el.querySelector(".ban_member_list").innerHTML = ""
        this.el.querySelector(".ban_member_list_container").style.display = 'none'
      }

    } else {
      this.el.querySelector(".offline_member_list").innerHTML = ""
      this.el.querySelector(".offline_member_list_container").style.display = 'none'

      this.el.querySelector(".ban_member_list").innerHTML = ""
      this.el.querySelector(".ban_member_list_container").style.display = 'none'
    }

    this.initSelectRoleListeners()

    this.renderVisitorActionsState()
  }

  createTeamEntryHTML(team) {
    return "<div class='team_list_entry' data-team-id='" + team.id +  "' data-is-private='" + (team.isPrivate ? true : '') + "' data-member-count='" + team.getMemberCount()  + "'>" +
             "<div class='team_name'>" + team.name + "</div>" +
             "<div class='team_member_count'>" + team.getMemberCount() + " / 5</div>" +
             "<div class='team_status'>" + i18n.t('Request Sent') + "</div>" +
             "<div class='team_join_btn team_action_btn'>" + i18n.t('Join') + "</div>" +
           "</div>"
  }

  renderTeamEntry(el, team) {
    el.querySelector(".team_name").innerText = team.name
    el.querySelector(".team_member_count").innerText = team.getMemberCount() + " / 5"
    el.dataset.memberCount = team.getMemberCount()
    if (team.isPrivate) {
      el.dataset.isPrivate = team.isPrivate
    } else {
      el.removeAttribute("data-is-private")
    }
  }

  buildOption(member, roleType, roleLabel) {
    let isSelected = member.roleType === roleType
    return `<option value='${roleType}' ${isSelected ? 'selected' : ''}>${i18n.t(roleLabel)}</option>`
  }

  initSelectRoleListeners() {
    Array.from(document.querySelectorAll(".member_role_select")).forEach((select) => {
      select.addEventListener("change", this.onMemberRoleChanged.bind(this), true)
    })

  }

  onMemberRoleChanged(e) {
    // e.preventDefault()

    let roleType = e.target.value
    let memberId = e.target.closest(".member_list_entry").dataset.memberId

    SocketUtil.emit("TeamMemberAction", { memberId: memberId, action: 'role', roleType: roleType })
  }

  getMemberRoleName(roleType) {
    if (roleType === Protocol.definition().RoleType.Everyone) return "Guest"
    if (roleType === Protocol.definition().RoleType.Member) return "Member"
    if (roleType === Protocol.definition().RoleType.Admin) return "Admin"

    return ""
  }

  isMe(member) {
    return this.game.playerId === member.id
  }

  canManageRoles(member) {
    let isTeamCreator = this.activeTeam.isCreator(this.game.player)
    if (isTeamCreator) return true

    return this.activeTeam.isAdmin(this.game.player) &&
           !this.activeTeam.isLeader(member) &&
           !this.activeTeam.isCreator(member) &&
           !this.isMe(member)
  }

  getRolePermissions(member) {
    let role = this.game.roles[member.roleType]
    if (!role) return {}

    return role.permissions
  }

  canKickMembers(team, member, isOffline) {
    if (isOffline) return false
    if (this.isMe(member)) return false

    if (this.game.player.isSectorOwner()) {
      return true
    }

    if (this.getRolePermissions(this.game.player)["Kick"]) {
      if (this.isMe(member)) return false
      return true
    }

    if (!team) return false

    return false
  }

  canBanMembers(team, member, isOffline) {
    if (isOffline) return false
    if (this.isMe(member)) return false

    if (this.game.player.isSectorOwner()) {
      return true
    }

    if (this.getRolePermissions(this.game.player)["Ban"]) {
      if (this.isMe(member)) return false
      return true
    }

    if (!team) return false

    return false
  }

  buildRoleSelect(member) {
    let roleSelection = "<select class='member_role_select ui_select'>"

    for (let roleId in this.game.roles) {
      let role = this.game.roles[roleId]
      let option = this.buildOption(member, role.id, role.name)
      roleSelection += option
    }

    roleSelection += "</select>"

    return roleSelection
  }

  isMuted(memberName) {
    return this.game.mutedPlayers[memberName] 
  }

  createMemberListHTML(playerList, options = {}) {
    let ul = "<ul>"

    playerList.forEach((member) => {
      let kickBtn = ""
      let banBtn = ""
      let promoteBtn = ""
      let demoteBtn  = ""

      let actionBtns = ""

      let roleName = this.game.roles[member.roleType] && this.game.roles[member.roleType].name
      let roleLabel = `<span class='member_role'>${roleName}</span>`

      let roleSelection = this.buildRoleSelect(member)

      if (this.canManageRoles(member)) {
        actionBtns = roleSelection
      } else {
        actionBtns = roleLabel
      }

      if (!this.isMe(member)) {
        if (this.isMuted(member.name)) {
          actionBtns += "<div class='mute_btn muted'>Unblock</div>"
        } else {
          actionBtns += "<div class='mute_btn' title='Stop Seeing messages from this player'>Block</div>"
        }
      }
 
      kickBtn = "<div class='kick_btn'>Kick</div>"
      banBtn = "<div class='ban_btn'>Ban</div>"
      let userActionBtns = []

      if (this.canKickMembers(this.activeTeam, member, options.offline)) {
        userActionBtns.push(kickBtn)
      }

      if (this.canBanMembers(this.activeTeam, member, options.offline)) {
        userActionBtns.push(banBtn)
      }

      if (userActionBtns.length > 0) {
        actionBtns += userActionBtns.join("<span>|</span>")
      }

      let daysAliveEl = ""
      if (member.daysAlive) {
        daysAliveEl = "<span class='member_days_alive'>" + member.daysAlive + ' ' + i18n.t('Days Alive') + "</span>"
      }

      let li = "<li class='member_list_entry' data-member-id='" + member.id +  "' data-uid='" + member.uid + "' data-username='" + member.name + "' >" +
                 "<span class='member_list_entry_name'>" + member.name  + "</span>" +
                 actionBtns +
                 daysAliveEl +
               "</li>"
      ul += li
    })

    return ul
  }

  createBanListHTML(banList) {
    let ul = "<ul>"

    banList.forEach((sectorBan) => {
      if (sectorBan.username) {
        let li = "<li class='banned_member' data-ban-id='" + sectorBan.id + "'>" +
                   "<span class='banned_username'>" + sectorBan.username + "</span>" +
                   "<span class='unban_btn'>" + i18n.t('unban') + "</span>" +
                 "</li>"
        ul += li
      }
    })

    return ul
  }

  addTeam(team) {
    if (team.isSectorOwner()) return
    let el = this.createTeamEntryHTML(team)
    this.el.querySelector(".team_list_container").innerHTML += el
  }

  removeTeam(team) {
    let el = this.el.querySelector(".team_list_container div[data-team-id='" + team.id + "']")
    if (!el) return
    if (el.parentElement) {
      el.parentElement.removeChild(el)
    }

  }

  syncTeam(team) {
    let el = this.el.querySelector(".team_list_container div[data-team-id='" + team.id + "']")
    if (!el) return
    this.renderTeamEntry(el, team)
  }


}



module.exports = TeamMenu
