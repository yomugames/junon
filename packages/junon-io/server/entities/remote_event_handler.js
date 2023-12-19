const LOG = require('junon-common/logger')
const Helper = require('../../common/helper')
const Protocol = require('../../common/util/protocol')
const FirebaseAdminHelper = require("../util/firebase_admin_helper")
const BadWordsFilter = require("../util/bad_words_filter")
const SectorBanModel = require("junon-common/db/sector_ban")
const xss = require("xss")
class RemoteEventHandler {
  constructor(server) {
    this.server = server
  }
  getSocketUtil() {
    return this.server.socketUtil
  }
  onSocketMessage(eventName, data, socket) {
    let handlerName = "on" + eventName

    let player = this.getPlayerForSocket(socket)

    let eventsNotRequiringPlayer = ["WindowResized", "RequestGame", "ResumeGame", "Ping"]
    if (eventsNotRequiringPlayer.indexOf(eventName) !== -1) {
      this[handlerName](player, data, socket)
    } else if (player) {
      const xssfree = xss(JSON.stringify(data))
      data = JSON.parse(xssfree)
      this[handlerName](player, data, socket)
    }

  }

  onPing(player, data, socket) {
    this.getSocketUtil().emit(socket, "Pong", {})
  }
  onInviteToTeam(player, data, socket) {
    let targetPlayer = this.server.getPlayerById(data.playerId)
    if (!targetPlayer) return
    let team = player.getJoinableTeam()
    if (!team) return
  }
  onSendMoney(player, data, socket) {
    let targetPlayer = this.server.getPlayerById(data.playerId)
    if (!targetPlayer) return
    player.sendMoney(targetPlayer, data.gold)
  }
  onAtmAction(player, data, socket) {
    if (player.game.isATMDisabled()) return
    if (data.action === 'withdraw') {
      player.withdrawAccount(data.gold)
    } else if (data.action === 'deposit') {
      player.depositAccount(data.gold)
    } else if (data.action === 'balance') {
      player.queryBalance()
    }
  }
  onSectorAction(player, data, socket) {
    if (player.game.isPvP()) return
    if (data.action === 'favorite') {
      player.toggleFavorite(data.sectorId)
    } else if (data.action === 'upvote') {
      player.toggleUpvote(data.sectorId)
    } else if (data.action === 'downvote') {
      // player.toggleDownvote(data.sectorId)
    } else if (data.action === 'editSetting') {
      if (player.isSectorOwner()) {
        player.sector.editSetting(data.key, data.value)
      }
    } else if (data.action === 'disablePvP') {
      if (player.isAdmin()) {
        player.sector.editSetting("isPvPAllowed", false)
      }
    } else if (data.action === 'enablePvP') {
      if (player.isAdmin()) {
        player.sector.editSetting("isPvPAllowed", true)
      }
    } else if (data.action === 'hardcoreMode') {
      if (player.isSectorOwner()) {
        player.game.setGameMode('hardcore')
      }
    } else if (data.action === 'peacefulMode') {
      if (player.isSectorOwner()) {
        player.game.setGameMode('peaceful')
      }
    } else if (data.action === 'survivalMode') {
      if (player.isSectorOwner()) {
        player.game.setGameMode('survival')
      }
    } else if (data.action === 'viewLogs') {
      if (player.isAdmin()) {
        player.viewTeamLogs()
      }
    }
  }
  async onRequestGame(player, data, socket) {
    // check if available game exist, if not create one
    if (this.server.isServerFull(socket)) {
      this.getSocketUtil().emit(socket, "CantJoin", { message: "Server is full" })
      return
    }
    try {
      socket.screenWidth = data.screenWidth
      socket.screenHeight = data.screenWidth
      socket.sessionId    = data.sessionId
      if (data.sectorId) {
        let game
        if (data.sectorId === 'test_bot') {
          game = this.server.getAvailableGame()
        } else {
          game = this.server.getGame(data.sectorId)
        }
        if (game) {
          game.join(socket, data)
        }
      }
    } catch(e) {
      this.getSocketUtil().emit(socket, "CantJoin", { message: "Unable to join server" })
      throw e
    }
  }
  onStartRound(player, data, socket) {
    if (!player.game.sector.miniGame) return
    if (player.game.getPlayerCount() < player.game.sector.miniGame.getRequiredPlayerCount()) {
      let count = player.game.sector.miniGame.getRequiredPlayerCount()
      let message = i18n.t(player.locale, "NeededToStart", { count: count })
      player.showError(message)
      return
    }
    if (player.game.sector.eventHandler.isRoundStarting) return
    player.game.addTimer({
      name: "RoundStartTimer",
      duration: 5
    })
  }
  onEditCommandBlock(player, data, socket) {
    if (!player.canEditCommandBlock()) return
    player.sector.commandBlock.edit(data, player)
  }
  onDebug(player, data, socket) {
    if (data.type === "chunk_region_path") {
      player.sector.pathFinder.addDebugSubscriber(player)
      player.sendChunkRegions()
      player.sendChunkRegionPaths()
    }
  }
  onRequestEntityChunkRegionPath(player, data, socket) {
    let entity = player.game.getEntity(data.entityId)
    let chunkRegions = entity.getChunkRegions()
    for (let id in chunkRegions) {
      let chunkRegion = chunkRegions[id]
      let chunkRegionPath = chunkRegion.requestChunkRegionPath()
      this.getSocketUtil().emit(socket, "EntityChunkRegionPath", {
        entityId: entity.getId(),
        chunkRegionPath: chunkRegionPath.toJson()
      })
    }
  }
  onSendVote(player, data, socket) {
    player.sector.addVote(player, data)
  }
  onRequestChunkRegions(player, data, socket) {
    let chunkRow = parseInt(data.chunkId.split("-")[0])
    let chunkCol = parseInt(data.chunkId.split("-")[1])
    let chunk = player.sector.getChunk(chunkRow, chunkCol)
    if (!chunk) return
    let chunkRegionsData = chunk.getChunkRegionList().map((chunkRegion) => {
      return chunkRegion.toJson()
    })
    this.getSocketUtil().emit(socket, "UpdateChunkRegion", { chunkRegions: chunkRegionsData })
  }
  onManageStack(player, data, socket) {
    player.manageStack(data)
  }
  onViewCamera(player, data, socket) {
    player.viewCamera(data)
  }
  onNPCClientMessage(player, data, socket) {
    let entity = player.game.getEntity(data.entityId)
    if (entity) {
      data.player = player
      entity.onNPCClientMessage(data)
    }
  }
  onRespawnRequest(player, data, socket) {
    if (player.health > 0) return
    player.respawnIfReady()
    this.getSocketUtil().emit(socket, "Respawn", {})
  }
  onResumeGame(player, data, socket) {
    socket.screenWidth = data.screenWidth
    socket.screenHeight = data.screenHeight
    socket.sessionId = data.sessionId
    socket.locale = data.locale || 'en'
    let game = this.server.getGame(data.sectorId)
    if (!game) {
      this.getSocketUtil().emit(socket, "CantJoin", { message: "Game not found" })
      return
    }
    if (!game.isReady()) {
      this.getSocketUtil().emit(socket, "CantJoin", { message: "Game is not ready yet. Try again in a few seconds." })
      return
    }
    if (game.hasPlayerAlreadyJoined({ sessionId: socket.sessionId })) return
    if (data.idToken) {
      game.resumeIdToken(socket, data.idToken, data.uid)
    } else if (data.sessionId) {
      game.resumeSession(socket, data.sessionId)
    }
  }
  getDisconnectedPlayers() {
    let result = {}
    this.getGames().forEach((game) => {
      result = Object.assign({}, result, game.disconnectedPlayers)
    })
    return result
  }
  onWindowResized(player, data, socket) {
    if (!player) {
      socket.screenWidth = data.screenWidth
      socket.screenHeight = data.screenWidth
      return
    }
    player.updateScreen(data)
  }
  getGames() {
    return this.server.games
  }
  getPlayerForSocket(socket) {
    let targetPlayer
    let games = this.getGames()
    for (let host in games) {
      let game = games[host]
      let player = game.getPlayerForSocketId(socket.id)
      if (player) {
        targetPlayer = player
        break
      }
    }
    return targetPlayer
  }
  onPlayerInput(player, data, socket) {
    player.updateInput(data)
  }
  onBuild(player, data, socket) {
    player.build(data)
  }
  onTrade(player, data, socket) {
    player.trade(data)
  }
  onPilotShip(player, data, socket) {
    player.pilotShip(data)
  }
  onDockShip(player, data, socket) {
    player.dockShip(data)
  }
  onUpgrade(player, data, socket) {
    player.upgradeBuilding(data)
  }
  onAct(player, data, socket) {
    player.act(data)
  }
  onSwapInventory(player, data, socket) {
    player.swapInventory(data)
  }
  onGather(player, data, socket) {
    player.gather(data)
  }
  onStartWave(player, data, socket) {
    player.startWave(data)
  }
  async onTeamMemberAction(player, data, socket) {
    let team
    let targetPlayer = player.game.getPlayerById(data.memberId)
    if (targetPlayer) {
      team = targetPlayer.getTeam()
    }
    if (data.action === 'kick') {
      if (!team) return
      team.kick(data.memberId, player)
    } else if (data.action === 'ban') {
      if (!team) return
      team.ban(data.memberId, player)
    } else if (data.action === 'unban') {
      player.getTeam().unban(data.banId, player)
    } else if (data.action === 'role') {
      if (!player.isAdmin()) {
        if (!player.isSectorOwner()) return
      }
      if (team) {
        team.setRole(data.memberId, data.roleType, player)
      } else {
        player.getTeam().setRole(data.memberId, data.roleType, player)
      }
    }
  }
  onEditTask(player, data, socket) {
    let mob = player.game.getEntity(data.entityId)
    if (!mob) return
    if (!mob.isOwnedBy(player)) return
    if (!player.isAdmin()) return
    mob.editTask(data.taskType, data.isEnabled)
  }
  onEditMob(player, data, socket) {
    let mob = player.game.getEntity(data.id)
    if (!mob) return
    if (!mob.isOwnedBy(player)) return
    if (!player.isAdmin()) return
    if (data.name) {
      let item = player.getActiveItem()
      if (item && item.isNameTag()) {
        if (BadWordsFilter.isBadWord(data.name)) {
          player.showError("Name is not appropriate", { isWarning: true })
        } else if (data.name !== mob.name) {
          mob.editName(data.name)
          item.consume()
        }
      } else {
        player.showError("Name Tag required", { isWarning: true })
      }
    }
    if (data.content) {
      mob.editContent(data.content)
    }
  }
  onEditBuilding(player, data, socket) {
    let building = player.game.getEntity(data.id)
    if (!building) return
    if (!building.isOwnedBy(player)) return
    if (data.hasOwnProperty("content") &&
        building.hasEditableContent()) {
      if (building.hasCategory("sign")) {
        if (player.getRole().isAllowedTo("EditSign")) {
          let maxLength = building.getMaxContentLength()
          let content = data.content.slice(0, maxLength)
          content = player.replaceBadWords(content)
          if (content !== building.content) {
            LOG.info(`${player.name} [edit_sign] id:${building.id} content to: ${content}`)
            building.setBuildingContent(content, player)
          }
        } else {
          player.showError("Permission Denied", { isWarning: true })
        }
      } else if (building.hasCategory("stove")) {
        if (player.getRole().isAllowedTo("Cook")) {
          let maxLength = building.getMaxContentLength()
          building.setBuildingContent(data.content.slice(0, maxLength), player)
        } else {
          player.showError("Permission Denied", { isWarning: true })
        }
      } else {
        if (player.hasMemberPrivilege()) {
          let maxLength = building.getMaxContentLength()
          building.setBuildingContent(data.content.slice(0, maxLength), player)
        } else {
          player.showError("Permission Denied", { isWarning: true })
        }
      }
    }
    if (data.hasOwnProperty("roleType") &&
        building.hasCategory("editable_permissions") &&
        player.isAdmin()) {
      building.editPermission(data.roleType, data.isRoleEnabled)
      player.setLastCustomAccess(building)
    }
    if (data.hasOwnProperty("action")) {
      if (building.hasCategory("vending_machine")) {
        if (data.action === 'withdraw') {
          building.withdraw(player)
        }
      } else if (building.getConstants().isUpgradable) {
        if (data.action === 'upgrade') {
          building.upgrade(player)
        }
      }
    }
    if (data.hasOwnProperty("isCustomAccess")) {
      building.setIsCustomAccess(data.isCustomAccess)
      player.setLastCustomAccess(building)
    }
    if (data.hasOwnProperty("targetType")) {
      if (building.hasCategory("editable_targets") &&
          player.isAdmin()) {
        building.editTargetType(data.targetType, data.isTargetEnabled)
      }
    }
  }
  onButtonClick(player, data, socket) {
    player.sector.onButtonClicked({
      playerId: player.id,
      entityId: data.entityId,
      name: data.name
    })
  }
  onEditTexture(player, data, socket) {
    let item = player.game.getEntity(data.entityId)
    if (item) {
      if (player.game.isMiniGame()) return
      if (!item.hasInstance()) return
      let isSpaceSuit = item.type == Protocol.definition().BuildingType.SpaceSuit
      if (isSpaceSuit && data.hasOwnProperty("colorIndex")) {
        if (player.sector.shouldAllowSuitChanged()) {
          let colorLabel = player.game.getSuitColorByIndex(data.colorIndex)
          item.instance.setContent(colorLabel)
          player.onStateChanged()
        }
      }
      return
    }
    if (data.hasOwnProperty("colorIndex")) {
      player.setColorIndex(data.colorIndex)
    }
    if (data.hasOwnProperty("textureIndex")) {
      player.setTextureIndex(data.textureIndex)
    }
  }
  onEditRole(player, data, socket) {
    let team = player.game.teams[data.teamId]
    if (!team) return
    if (!team.hasMember(player)) return
    if (!player.isAdmin()) return
    if (!data.hasOwnProperty("roleId")) {
      if (team.isMaxRoleCountReached()) {
        player.showError("Max Roles Reached")
        return
      }
      team.createNewRole()
      return
    }
    let role = team.getRole(data.roleId)
    if (role) {
      if (data.shouldDelete && role.canBeDeleted()) {
        role.remove()
      } else {
        let permission = {}
        permission[data.permission] = data.isEnabled
        role.setPermissions(permission)
        if (data.hasOwnProperty("name")) {
          if (BadWordsFilter.isBadWord(data.name)) {
            player.showError("Name is not appropriate")
          } else {
            role.setName(data.name)
          }
        }
      }
    } else {
    }
  }
  onEditTeam(player, data, socket) {
    let team = player.game.teams[data.id]
    if (!team) return
    if (!team.hasMember(player)) return
    if (!player.isAdmin()) return
    if (data.hasOwnProperty("name")) {
      let maxNameLength = 40
      let name = data.name.slice(0, maxNameLength)
      if (BadWordsFilter.isBadWord(name)) {
        player.showError("Name is not appropriate")
      } else if (player.game.isTeamNameTaken(name)) {
        player.showError("Name is already taken")
      } else {
        if (!team.isSectorOwner()) {
          name = name.replace(/\s+/g, "")
        }
        team.setName(name)
      }
    }
    if (data.hasOwnProperty("isPrivate")) {
      team.setPrivate(data.isPrivate)
    }
    if (data.hasOwnProperty("permission")) {
      team.editPermission(data.permission, data.roleId, data.isEnabled)
    }
  }
  onTeleportRequest(player, data, socket) {
    player.teleport(data.sectorId)
  }
  onSpawnMob(player, data, socket) {
    if (!debugMode) return
    const diff = 5
    let randomOffest = Math.floor(Math.random() * diff) - (diff * 2)
    data.x = data.x + randomOffest
    data.y = data.y + randomOffest
    // player.sector.spawnCorpse({ x: data.x, y: data.y, type: "Guard" })
    player.sector.spawnMob({ x: data.x, y: data.y, player: player, type: "Slime" })
  }
  onBuildMode(player, data, socket) {
    player.enterBuildMode()
  }
  onCreateTeam(player, data, socket) {
    player.createJoinableTeam(data)
  }
  onJoinTeam(player, data, socket) {
    player.joinTeam(data)
  }
  onLeaveTeam(player, data, socket) {
    if (player.game.isPvP()) {
      let team = player.getTeam()
      LOG.info(`${player.name} clicked leave team: about to leave team ${team.name} - ${team.id}. - online: ${team.getMemberCount()} offline: ${team.getOfflineMemberCount()}`)
      if (player.hasRecentlyLeftTeam()) {
        player.showError("You just left team recently")
        return
      }
      player.leaveTeam()
      player.createSelfTeam()
      player.sector.findNewTeamSpawn([player])
    }
  }
  onLeaveGame(player, data, socket) {
    let duration = player.getSessionDuration()
    LOG.info(player.name + " left game. session duration: " + Helper.stringifyTimeShort(duration))
    if (player.isLoggedIn() && player.isSectorOwner()) {
      player.game.saveWorld()
    }
    if (player.game.isPvP()) {
      player.removeWithDelay()
    } else {
      player.remove()
    }
  }
  onAddScreenshot(player, data, socket) {
    player.addScreenshot(data)
  }
  onRemoveScreenshot(player, data, socket) {
    player.removeScreenshot(data)
  }
  onAcceptTeamRequest(player, data, socket) {
    let requestingPlayer = player.game.getPlayerById(data.playerId)
    if (!requestingPlayer) return
    let team = player.getTeam()
    if (team.isFull()) return
    delete requestingPlayer.teamRequests[team.id]
    if (data.isReject) {
      this.getSocketUtil().emit(requestingPlayer.getSocket(), "TeamInvitation", { teamId: team.getId(), isReject: true })
    } else {
      let oldTeam = requestingPlayer.getTeam()
      LOG.info(`${requestingPlayer.name} has been successfully invited to team: ${team.name} - ${team.id}. leaving old team `)
      requestingPlayer.leaveTeam()
      team.addMemberWithRole(requestingPlayer)
      // remove other pending requests
      for (let teamId in requestingPlayer.teamRequests) {
        let team = player.game.teams[teamId]
        if (team) {
          let approvers = team.getInviteApprovers()
          if (approvers.length > 0) {
            approvers.forEach((approver) => {
              this.getSocketUtil().emit(approver.getSocket(), "TeamRequest", { playerId: requestingPlayer.getId(), clientMustDelete: true })
            })
          }
        }
      }
    }
  }
  onClientChat(player, data, socket) {
    player.chat(data)
  }
  onRepair(player, data, socket) {
  }
  onSaveDesign(player, data, socket) {
    player.sector.exportBlueprint()
  }
  onPlayerTarget(player, data, socket) {
    player.updateTarget(data)
  }
  onRetrieveMinerals(player, data, socket) {
    player.retrieveMinerals(data)
  }
  onChangeEquip(player, data, socket) {
    player.setEquipIndex(data.index)
  }
  onViewStorage(player, data, socket) {
    player.viewStorage(data)
  }
  onCloseStorage(player, data, socket) {
    player.closeStorage(data)
  }
  onInteractTarget(player, data, socket) {
    player.interactTarget(data)
  }
  onSetLivestock(player, data, socket) {
    let entity = player.game.getEntity(data.id)
    if (!entity) return
    if (!entity.isOwnedBy(player)) return
    if (!player.isTeamLeader()) return
    entity.setLivestock(data.isLivestock)
  }
  onTakeAlong(player, data, socket) {
    player.takeAlong(data)
  }
  onRelease(player, data, socket) {
    player.release(data)
  }
  onSetHangar(player, data, socket) {
    player.setHangar(data)
  }
  onEditShip(player, data, socket) {
    player.editShip(data)
  }
  onDebugRoom(player, data, socket) {
    player.debugRoom(data)
  }
  onPlayerReady(player, data, socket) {
    player.onPlayerReady(data)
  }
  onViewCraftingQueue(player, data, socket) {
    player.viewCraftingQueue(data)
  }
  onCraft(player, data, socket) {
    player.craft(data)
  }
  onMineResource(player, data, socket) {
    player.mine(data)
  }
  onRestartCharacter(player, data, socket) {
    if (!player.game.isPvP()) return
    if (player.hasRecentlyLeftTeam()) {
      player.showError("You just left team recently")
      return
    }
    if (player.hasRecentlyRestarted()) {
      player.showError("You just did that recently")
      return
    }
    player.restartCharacter()
  }
  onClientDisconnect(socket) {
    const player = this.getPlayerForSocket(socket)
    if (player) {
      let duration = player.getSessionDuration()
      LOG.info(player.name + " disconnected. session duration: " + Helper.stringifyTimeShort(duration))
      player.resetControls()
      player.game.sendCreatorLeaveSectorToMatchmaker(player)
      player.game.addDisconnectedPlayer(player)
    }
  }
}
module.exports = RemoteEventHandler
