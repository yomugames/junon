const LocalWorldApi = require('../util/local_world_api')
const CoopAuth = require('../util/coop_auth')
const SteamCoop = require('../util/steam_coop')
const SteamSocket = require('../util/steam_socket')
const OnlineCoop = require('../util/online_coop')
const RtcSocket = require('../util/rtc_socket')
const RtcTransport = require('junon-common/rtc_transport')
const Constants = require('../../../common/constants.json')

const DEFAULT_HOST_PORT = 7777
const MODE_LABELS = { survival: 'Survival', peaceful: 'Sandbox', hardcore: 'Hardcore' }
const LOADING_STAGE_LABELS = { starting: 'Preparing world', terrain: 'Generating terrain', regions: 'Mapping regions' }
const PROGRESS_POLL_INTERVAL = 250

// Standalone home menu. World management goes through LocalWorldApi (loopback
// page server, or the desktop app's game server process); game traffic still
// uses the ordinary authoritative socket.
class LocalWorldMenu {
  constructor(main) {
    this.main = main
    this.el = document.querySelector('#local_world_menu')
    this.panel = this.el.querySelector('.local_menu_panel')
    this.message = this.el.querySelector('.local_menu_message')
    this.error = this.el.querySelector('.local_menu_error')
    this.error.querySelector('.local_menu_error_close').addEventListener('click', () => this.hideError())
    this.nameInput = this.el.querySelector('.local_player_name')
    this.nameInput.value = main.localProfile.name || 'Player'
    this.nameInput.addEventListener('change', () => {
      try { this.saveName(); this.message.textContent = '' } catch (e) { this.message.textContent = e.message }
    })
    const actions = { new: 'newWorld', load: 'loadWorlds', tutorial: 'startTutorial', import: 'importWorld', host: 'hostWorld', join: 'joinWorld' }
    Object.keys(actions).forEach((name) => {
      this.el.querySelector('.local_' + name + '_btn').addEventListener('click', () => this[actions[name]]())
    })
    this.el.querySelector('.local_changelog_btn').addEventListener('click', () => this.showChangelog())
    this.continueBtn = this.el.querySelector('.local_continue_btn')
    this.continueBtn.addEventListener('click', () => {
      if (this.latestWorld) this.openWorld(this.latestWorld)
    })

    this.steamStatus = { isAvailable: false }
    this.initSteam()

    // online co-op controls show only when the desktop app has a signalling
    // server
    this.onlineStatus = { isAvailable: false }
    OnlineCoop.getStatus().then((status) => { this.onlineStatus = status })
  }

  // Steam co-op controls show only when the desktop app has Steam. An invite
  // accepted while the game was closed launches it with the lobby to join.
  async initSteam() {
    if (!SteamCoop.isAvailable()) return

    this.steamStatus = await SteamCoop.getStatus()
    if (!this.steamStatus.isAvailable) return

    SteamCoop.onJoinRequest((lobbyId) => this.onSteamJoinRequest(lobbyId))
    if (this.steamStatus.pendingLobbyId) this.run(() => this.joinSteamLobby(this.steamStatus.pendingLobbyId))
  }

  // an invite accepted, or Join Game clicked in Steam, while the game runs
  onSteamJoinRequest(lobbyId) {
    if (this.main.game.player) {
      if (!window.confirm('Leave this world and join your friend on Steam?')) return
      this.main.onExitGameMenuBtnClick()
    }
    this.run(() => this.joinSteamLobby(lobbyId))
  }

  // online co-op: the room is checked first, so a wrong code or another
  // version gets a message here instead of a failed connection
  async joinOnlineRoom(input) {
    this.saveName()
    const code = RtcTransport.normalizeRoomCode(input)
    if (!code) throw new Error('Enter the 8-character room code from the host')
    await OnlineCoop.checkRoom(code)
    this.main.standaloneServerUrl = RtcSocket.urlFor(code)
    this.main.standaloneAuthorize = null
    this.el.style.display = 'none'
    this.main.joinStandaloneWorld()
  }

  async joinSteamLobby(lobbyId) {
    this.saveName()
    const joined = await SteamCoop.joinLobby(lobbyId)
    this.isInSteamLobby = true
    this.main.standaloneServerUrl = SteamSocket.urlFor(joined.hostSteamId)
    this.main.standaloneAuthorize = null
    this.el.style.display = 'none'
    this.main.joinStandaloneWorld()
  }

  // highlights the menu entry whose panel is showing, and drops the
  // previous panel's error
  setActive(panel) {
    this.message.textContent = ''
    this.el.querySelectorAll('.local_menu_actions [data-panel]').forEach((button) => {
      button.classList.toggle('selected', button.dataset.panel === panel)
    })
  }

  // listWorlds is ordered by updatedAt, so the first world is the last played
  renderContinue(worlds) {
    this.latestWorld = worlds[0]
    this.continueBtn.style.display = this.latestWorld ? 'block' : 'none'
    if (this.latestWorld) {
      this.continueBtn.querySelector('.local_continue_detail').textContent = this.latestWorld.name + ' · Day ' + this.latestWorld.days
    }
  }

  openWorld(world) {
    this.run(async () => {
      this.saveName()
      const opened = await LocalWorldApi.openWorld({ worldId: world.id, ownerUid: this.main.localProfile.uid })
      this.open(world.id, opened.serverUrl)
    })
  }

  show() {
    // back from a Steam host's world: out of its lobby, so Steam stops
    // showing the player in it
    if (this.isInSteamLobby) {
      this.isInSteamLobby = false
      SteamCoop.leaveLobby().catch(() => {})
    }

    document.querySelector('.middle_container').style.display = 'block'
    this.el.style.display = 'block'
    this.loadWorlds()
  }

  // why the last world couldn't be joined, or why the player left it (e.g.
  // a name already taken, a kick, the host closing the world). Stays up until
  // closed or another world is joined, unlike a panel's message.
  showError(message) {
    this.error.querySelector('.local_menu_error_text').textContent = message
    this.error.classList.add('visible')
  }

  hideError() {
    this.error.classList.remove('visible')
  }

  saveName() {
    const name = this.nameInput.value.trim()
    if (!/^[a-zA-Z0-9_]{1,16}$/.test(name)) throw new Error('Use 1–16 letters, numbers or underscores for your name')
    this.main.localProfile.setName(name)
  }

  async run(action) {
    this.message.textContent = ''
    try { await action() } catch (e) { this.message.textContent = e.message }
  }

  open(worldId, serverUrl) {
    this.main.standaloneServerUrl = serverUrl
    this.main.standaloneAuthorize = null
    this.el.style.display = 'none'
    this.main.joinStandaloneWorld()
  }

  // map size is in tiles, in whole chunks (Server#getLocalWorldApi checks it)
  newWorld() {
    this.setActive('new')
    const sizeInput = (className, label) => '<label>' + label + ' <input class="' + className + ' black_input" type="number" min="' + Constants.chunkRowCount + '" step="' + Constants.chunkRowCount + '" value="' + Constants.defaultWorldSize + '"></label>'
    this.panel.innerHTML = '<h2>New world</h2><label>World name <input class="world_name black_input" maxlength="40"></label><label>Mode <select class="world_mode ui_select"><option value="survival">Survival</option><option value="peaceful">Sandbox</option><option value="hardcore">Hardcore</option></select></label><div class="world_size">' + sizeInput('world_rows', 'Map rows') + sizeInput('world_cols', 'Map columns') + '</div><button class="create_world ui_btn">Create and play</button><div class="world_progress"><div class="world_progress_label"></div><div class="world_progress_bar"><div class="world_progress_fill"></div></div></div>'
    const createButton = this.panel.querySelector('.create_world')
    createButton.addEventListener('click', () => this.run(async () => {
      this.saveName()
      createButton.disabled = true
      try {
        const result = await this.followWorldProgress(this.panel.querySelector('.world_progress'), LocalWorldApi.createWorld({
          ownerUid: this.main.localProfile.uid,
          name: this.panel.querySelector('.world_name').value,
          gameMode: this.panel.querySelector('.world_mode').value,
          rowCount: Number(this.panel.querySelector('.world_rows').value),
          colCount: Number(this.panel.querySelector('.world_cols').value)
        }))
        this.open(result.worldId, result.serverUrl)
      } finally {
        createButton.disabled = false
      }
    }))
  }

  // Shows the server's progress on a world being created (getWorldProgress)
  // in the given .world_progress element until the request settles. Large
  // maps take a while to generate; the server keeps answering meanwhile.
  async followWorldProgress(element, request) {
    let isSettled = false
    const render = (loading) => {
      const percent = Math.floor(loading.progress * 100)
      element.querySelector('.world_progress_label').textContent = (LOADING_STAGE_LABELS[loading.stage] || 'Loading') + '… ' + percent + '%'
      element.querySelector('.world_progress_fill').style.width = percent + '%'
    }

    render({ stage: 'starting', progress: 0 })
    element.classList.add('visible')
    const poll = async () => {
      while (!isSettled) {
        try {
          const result = await LocalWorldApi.getWorldProgress()
          if (!isSettled && result.loading) render(result.loading)
        } catch (e) {
          // the request's own outcome is what gets reported
        }
        await new Promise((resolve) => setTimeout(resolve, PROGRESS_POLL_INTERVAL))
      }
    }
    poll()

    try {
      return await request
    } finally {
      isSettled = true
      element.classList.remove('visible')
    }
  }

  loadWorlds() {
    this.setActive('load')
    this.panel.innerHTML = '<h2>Your worlds <span class="local_world_count"></span></h2><div class="local_world_list">Loading…</div>'
    this.run(async () => {
      const result = await LocalWorldApi.listWorlds()
      this.renderContinue(result.worlds)
      const list = this.panel.querySelector('.local_world_list')
      list.textContent = ''
      if (!result.worlds.length) return this.renderNoWorlds(list)

      this.panel.querySelector('.local_world_count').textContent = result.worlds.length
      const hostedWorldId = result.hosting && result.hosting.worldId
      result.worlds.forEach((world) => {
        list.appendChild(this.createWorldEntry(world, world.id === hostedWorldId))
      })
    })
  }

  // world names are player input, so entries are built with textContent. The
  // delete button sits beside the card's button, since buttons can't nest.
  createWorldEntry(world, isHosted) {
    const card = document.createElement('div')
    card.className = 'local_world_card'

    const button = document.createElement('button')
    button.className = 'local_world_entry'
    button.dataset.mode = world.mode

    // a preview taken from the colony menu's Preview tab, if there is one
    if (world.thumbnail) {
      button.classList.add('has_thumbnail')
      const thumbnail = document.createElement('img')
      thumbnail.className = 'local_world_thumbnail'
      thumbnail.alt = ''
      thumbnail.src = world.thumbnail
      button.appendChild(thumbnail)
    }

    const name = document.createElement('span')
    name.className = 'local_world_name'
    name.textContent = world.name
    button.appendChild(name)

    const details = document.createElement('span')
    details.className = 'local_world_details'
    details.textContent = (MODE_LABELS[world.mode] || world.mode) + ' · Day ' + world.days
    button.appendChild(details)

    if (isHosted) {
      const badge = document.createElement('span')
      badge.className = 'local_world_badge'
      badge.textContent = 'Hosting'
      button.appendChild(badge)
    }

    button.addEventListener('click', () => this.openWorld(world))
    card.appendChild(button)

    const remove = document.createElement('button')
    remove.className = 'local_world_delete'
    remove.title = 'Delete world'
    remove.setAttribute('aria-label', 'Delete world')
    remove.addEventListener('click', () => this.deleteWorld(world))
    card.appendChild(remove)

    return card
  }

  deleteWorld(world) {
    if (!window.confirm('Delete "' + world.name + '"? This can\'t be undone.')) return
    this.run(async () => {
      await LocalWorldApi.deleteWorld({ worldId: world.id, ownerUid: this.main.localProfile.uid })
      this.loadWorlds()
    })
  }

  renderNoWorlds(list) {
    list.innerHTML = '<div class="local_world_empty"><div class="local_world_empty_title">No worlds yet</div><p>Create a world, import a save, or join a friend\'s game.</p><button class="ui_btn">New world</button></div>'
    list.querySelector('button').addEventListener('click', () => this.newWorld())
  }

  // release notes are rendered into a <template> when the page is built
  showChangelog() {
    this.setActive('changelog')
    this.panel.textContent = ''
    this.panel.appendChild(document.querySelector('#local_changelog_template').content.cloneNode(true))
    this.panel.scrollTop = 0
  }

  // the server swaps the open world for a fresh tutorial (not saved or listed)
  startTutorial() {
    this.setActive('tutorial')
    this.panel.innerHTML = '<h2>Tutorial</h2><p>Starting the tutorial…</p>'
    this.run(async () => {
      this.saveName()
      const result = await LocalWorldApi.startTutorial({ ownerUid: this.main.localProfile.uid })
      this.open(null, result.serverUrl)
    })
  }

  importWorld() {
    this.setActive('import')
    this.panel.innerHTML = '<h2>Import hosted save</h2><p>Choose a .sav file exported from the online game, then pick the character you want to play as.</p><input type="file" class="local_save_file" accept=".sav"><button class="preview_import ui_btn">Choose character</button><div class="import_characters"></div>'
    this.panel.querySelector('.preview_import').addEventListener('click', () => this.run(async () => {
      const file = this.panel.querySelector('.local_save_file').files[0]
      if (!file) throw new Error('Choose a .sav file')
      this.saveName()
      const bytes = await file.arrayBuffer()
      const result = await LocalWorldApi.listImportCharacters(bytes)
      const choices = this.panel.querySelector('.import_characters')
      choices.textContent = ''
      const select = document.createElement('select')
      select.className = 'ui_select'
      const fresh = document.createElement('option')
      fresh.value = ''
      fresh.textContent = 'New character'
      select.appendChild(fresh)
      result.characters.forEach((character) => {
        const option = document.createElement('option')
        option.value = character.uid
        option.textContent = character.name + (character.teamName ? ' (' + character.teamName + ')' : '')
        select.appendChild(option)
      })
      choices.appendChild(select)
      const button = document.createElement('button')
      button.className = 'ui_btn'
      button.textContent = 'Import and play'
      button.addEventListener('click', () => this.run(async () => {
        const imported = await LocalWorldApi.importWorld(bytes, { ownerUid: this.main.localProfile.uid, ownerName: this.main.localProfile.name, characterUid: select.value })
        const opened = await LocalWorldApi.openWorld({ worldId: imported.worldId, ownerUid: this.main.localProfile.uid })
        this.open(imported.worldId, opened.serverUrl)
      }))
      choices.appendChild(button)
    }))
  }

  // Opens one of the player's worlds to other machines: guests connect to
  // this port on any of the listed addresses, the host plays locally
  hostWorld() {
    this.setActive('host')
    this.panel.innerHTML = '<h2>Host co-op</h2><div class="host_status">Loading…</div>'
    this.run(async () => {
      const result = await LocalWorldApi.listWorlds()
      if (result.hosting) return this.showHosting(result)

      const steamSection = this.steamStatus.isAvailable ? '<h3>On Steam</h3><p>Steam friends join from your invite, or with Join Game in Steam. No port forwarding needed.</p><label>Who can join <select class="steam_lobby_type ui_select"><option value="friends">Steam friends</option><option value="invite">Only friends I invite</option></select></label><button class="start_steam_hosting ui_btn">Host on Steam and play</button>' : ''
      const onlineSection = this.onlineStatus.isAvailable ? '<h3>Online</h3><p>You get a room code; friends join with it. No port forwarding needed. A few networks block direct connections: friends on those can join by address or over a VPN.</p><button class="start_online_hosting ui_btn">Host online and play</button>' : ''
      const addressHeading = steamSection || onlineSection ? '<h3>By address</h3>' : ''
      this.panel.innerHTML = '<h2>Host co-op</h2><label>World <select class="host_world ui_select"></select></label>' + steamSection + onlineSection + addressHeading + '<p>Friends on your network, or on a VPN such as Tailscale, join with your address and this port. To play over the internet, forward the port on your router.</p><label>Port <input class="host_port black_input" type="number" min="1024" max="65535" value="' + DEFAULT_HOST_PORT + '"></label><label>Password <input class="host_password black_input" type="password" maxlength="64" placeholder="optional" autocomplete="new-password"></label><button class="start_hosting ui_btn">Host and play</button>'
      const select = this.panel.querySelector('.host_world')
      result.worlds.forEach((world) => {
        const option = document.createElement('option')
        option.value = world.id
        option.textContent = world.name + ' · ' + (MODE_LABELS[world.mode] || world.mode)
        option.selected = world.id === result.activeWorldId
        select.appendChild(option)
      })
      if (!result.worlds.length) throw new Error('Create or import a world first')

      this.panel.querySelector('.start_hosting').addEventListener('click', () => this.run(async () => {
        this.saveName()
        const hosted = await LocalWorldApi.hostWorld({
          worldId: select.value,
          ownerUid: this.main.localProfile.uid,
          port: Number(this.panel.querySelector('.host_port').value),
          password: this.panel.querySelector('.host_password').value
        })
        this.open(hosted.worldId, hosted.serverUrl)
      }))

      const onlineButton = this.panel.querySelector('.start_online_hosting')
      if (onlineButton) onlineButton.addEventListener('click', () => this.run(async () => {
        this.saveName()
        onlineButton.disabled = true
        try {
          const hosted = await LocalWorldApi.hostWorldOnline({ worldId: select.value, ownerUid: this.main.localProfile.uid })
          this.open(hosted.worldId, hosted.serverUrl)
        } finally {
          onlineButton.disabled = false
        }
      }))

      const steamButton = this.panel.querySelector('.start_steam_hosting')
      if (steamButton) steamButton.addEventListener('click', () => this.run(async () => {
        this.saveName()
        steamButton.disabled = true
        try {
          const hosted = await LocalWorldApi.hostWorldOnSteam({
            worldId: select.value,
            ownerUid: this.main.localProfile.uid,
            lobbyType: this.panel.querySelector('.steam_lobby_type').value
          })
          this.open(hosted.worldId, hosted.serverUrl)
        } finally {
          steamButton.disabled = false
        }
      }))
    })
  }

  showHosting(result) {
    const hosting = result.hosting
    const world = result.worlds.find((entry) => entry.id === hosting.worldId)
    this.panel.innerHTML = '<h2>Host co-op</h2><p class="host_summary"></p><ul class="host_addresses"></ul><div class="online_hosting"></div><div class="steam_hosting"></div><button class="play_hosted ui_btn">Play</button> <button class="stop_hosting ui_btn">Stop hosting</button>'
    const worldName = world ? world.name : 'your world'

    if (hosting.port) {
      this.panel.querySelector('.host_summary').textContent = 'Hosting ' + worldName + (hosting.hasPassword ? ' with a password' : '') + '. Friends join at:'
      const list = this.panel.querySelector('.host_addresses')
      const addresses = hosting.addresses.length ? hosting.addresses : ['<your address>']
      addresses.forEach((address) => {
        const item = document.createElement('li')
        item.textContent = address + ':' + hosting.port
        list.appendChild(item)
      })
    } else {
      this.panel.querySelector('.host_summary').textContent = 'Hosting ' + worldName + (hosting.isOnSteam ? ' on Steam.' : ' online.')
    }
    if (hosting.isOnline) this.renderRoomCode(this.panel.querySelector('.online_hosting'), hosting.roomCode)
    if (hosting.isOnSteam) this.renderSteamInvites(this.panel.querySelector('.steam_hosting'), hosting)

    this.panel.querySelector('.play_hosted').addEventListener('click', () => this.open(hosting.worldId, result.serverUrl))
    this.panel.querySelector('.stop_hosting').addEventListener('click', () => this.run(async () => {
      await LocalWorldApi.stopHosting()
      this.hostWorld()
    }))
  }

  // the room code of a world hosted online, to pass on to friends. app:// isn't
  // a secure context, so no Clipboard API: Copy selects and copies the field.
  renderRoomCode(container, roomCode) {
    if (!roomCode) {
      container.textContent = 'Opening the online room…'
      return
    }

    container.innerHTML = '<p>Friends join online with this room code:</p><div class="hosting_detail_row room_code_row"><label class="hosting_detail_label" for="host_room_code">Room code</label><input id="host_room_code" class="room_code black_input" readonly> <button class="copy_room_code ui_btn">Copy</button></div><div class="hosting_detail_row room_visibility_row"><label class="hosting_detail_label" for="host_visibility_select">Visibility</label><select id="host_visibility_select" class="room_visibility_select visibility_pending" disabled><option value="private">Private</option><option value="public">Public</option></select></div><p class="room_visibility_hint"></p>'
    const input = container.querySelector('.room_code')
    input.value = RtcTransport.formatRoomCode(roomCode)
    const copy = container.querySelector('.copy_room_code')
    copy.addEventListener('click', () => {
      input.select()
      document.execCommand('copy')
      copy.textContent = 'Copied'
    })
    const select = container.querySelector('.room_visibility_select')
    const hint = container.querySelector('.room_visibility_hint')
    let isPublic = null
    const showVisibility = (isPublic) => {
      select.value = isPublic ? 'public' : 'private'
      select.classList.remove('visibility_pending')
      select.disabled = false
      hint.textContent = isPublic ? 'This room appears in the server browser.' : 'Private rooms are joinable by code.'
    }
    OnlineCoop.getVisibility().then((result) => {
      isPublic = result.isPublic
      showVisibility(isPublic)
    }).catch((error) => {
      hint.textContent = 'Visibility unavailable.'
      this.message.textContent = error.message
    })
    select.addEventListener('change', () => this.run(async () => {
      const previous = isPublic
      select.disabled = true
      try {
        const result = await OnlineCoop.setVisibility(select.value === 'public')
        isPublic = result.isPublic
        showVisibility(isPublic)
      } catch (error) {
        showVisibility(previous)
        throw error
      }
    }))
  }

  // the invite controls of a world hosted on Steam: Steam's own invite
  // dialog (in the overlay), and a list of online friends to invite directly,
  // which works without the overlay
  renderSteamInvites(container, hosting) {
    container.innerHTML = '<p class="steam_hosting_summary"></p><button class="steam_invite_dialog ui_btn">Invite with Steam</button><div class="steam_friends">Loading friends…</div>'
    container.querySelector('.steam_hosting_summary').textContent = hosting.steamLobbyType === 'invite' ? 'Only friends you invite can join.' : 'Your Steam friends can join with Join Game in Steam, or from an invite.'
    container.querySelector('.steam_invite_dialog').addEventListener('click', () => this.run(() => SteamCoop.openInviteDialog()))

    this.run(async () => {
      const friends = await SteamCoop.listFriends()
      const list = container.querySelector('.steam_friends')
      list.textContent = friends.length ? '' : 'No Steam friends are online.'
      friends.forEach((friend) => {
        const entry = document.createElement('div')
        entry.className = 'steam_friend'
        const name = document.createElement('span')
        name.textContent = friend.name
        const button = document.createElement('button')
        button.className = 'steam_invite ui_btn'
        button.textContent = 'Invite'
        button.addEventListener('click', () => this.run(async () => {
          await SteamCoop.invite(friend.steamId)
          button.textContent = 'Invited'
          button.disabled = true
        }))
        entry.appendChild(name)
        entry.appendChild(button)
        list.appendChild(entry)
      })
    })
  }

  // friends hosting a Junon world on Steam, each with a Join button
  renderSteamHosts(container) {
    container.innerHTML = '<h3>Friends on Steam <button class="steam_refresh ui_btn">Refresh</button></h3><div class="steam_hosts">Looking for friends…</div>'
    container.querySelector('.steam_refresh').addEventListener('click', () => this.renderSteamHosts(container))

    this.run(async () => {
      const hosts = await SteamCoop.listFriendsHosting()
      const list = container.querySelector('.steam_hosts')
      list.textContent = hosts.length ? '' : 'None of your Steam friends are hosting right now.'
      hosts.forEach((host) => {
        const entry = document.createElement('div')
        entry.className = 'steam_host'
        const label = document.createElement('span')
        label.textContent = host.name + (host.status ? ' · ' + host.status : '')
        const button = document.createElement('button')
        button.className = 'steam_join ui_btn'
        button.textContent = 'Join'
        button.addEventListener('click', () => this.run(() => this.joinSteamLobby(host.lobbyId)))
        entry.appendChild(label)
        entry.appendChild(button)
        list.appendChild(entry)
      })
    })
  }

  joinWorld() {
    this.setActive('join')
    const browserSection = this.onlineStatus.isAvailable
      ? '<section class="join_browser_section"><div class="public_rooms_heading"><h3>Public rooms</h3><button class="refresh_online_rooms ui_btn">Refresh</button></div><div class="online_rooms empty">Looking for public rooms…</div><p class="join_browser_note">Private rooms can be joined with a code.</p></section>'
      : ''
    const codeSection = this.onlineStatus.isAvailable
      ? '<section class="join_method"><h3>Join with code</h3><label for="join_room_code">Room code</label><div class="join_inline_controls"><input id="join_room_code" class="join_room_code black_input" maxlength="9" placeholder="K7QF-2M9X" autocomplete="off"><button class="join_online ui_btn">Join</button></div></section>'
      : ''
    const addressHeading = this.steamStatus.isAvailable || this.onlineStatus.isAvailable ? '<h3>By address</h3>' : ''
    this.panel.innerHTML = '<h2>Join co-op</h2><div class="join_steam"></div><div class="join_layout' + (this.onlineStatus.isAvailable ? '' : ' no_browser') + '">' + browserSection + '<div class="join_methods">' + codeSection + '<section class="join_method join_address_section">' + addressHeading + '<label>Address <input class="join_address black_input" placeholder="192.168.1.10:' + DEFAULT_HOST_PORT + '"></label><label>Password <input class="join_password black_input" type="password" maxlength="64" placeholder="if the host set one"></label><button class="connect_world ui_btn">Join by address</button></section></div></div>'
    if (this.steamStatus.isAvailable) this.renderSteamHosts(this.panel.querySelector('.join_steam'))
    const onlineButton = this.panel.querySelector('.join_online')
    if (onlineButton) onlineButton.addEventListener('click', () => this.run(() => this.joinOnlineRoom(this.panel.querySelector('.join_room_code').value)))
    if (this.onlineStatus.isAvailable) {
      this.panel.querySelector('.refresh_online_rooms').addEventListener('click', () => this.renderOnlineRooms())
      this.renderOnlineRooms()
    }
    this.panel.querySelector('.connect_world').addEventListener('click', () => this.run(async () => {
      this.saveName()
      const address = this.panel.querySelector('.join_address').value.trim()
      if (!/^[a-zA-Z0-9.:-]+:\d{1,5}$/.test(address)) throw new Error('Enter an address and port')
      const port = Number(address.split(':').pop())
      if (port < 1 || port > 65535) throw new Error('Invalid port')
      const password = this.panel.querySelector('.join_password').value
      await CoopAuth.checkHost(address, password)
      this.main.standaloneServerUrl = 'ws://' + address
      this.main.standaloneAuthorize = () => CoopAuth.socketUrl(address, password)
      this.el.style.display = 'none'
      this.main.joinStandaloneWorld()
    }))
  }

  renderOnlineRooms() {
    const list = this.panel.querySelector('.online_rooms')
    if (!list) return
    list.textContent = 'Looking for public rooms…'
    list.classList.add('empty')
    this.run(async () => {
      const rooms = await OnlineCoop.listRooms()
      if (!list.isConnected) return
      list.textContent = rooms.length ? '' : 'No public rooms are available.'
      list.classList.toggle('empty', !rooms.length)
      rooms.forEach((room) => {
        const entry = document.createElement('div')
        entry.className = 'online_room'
        const preview = document.createElement('div')
        preview.className = 'online_room_preview'
        if (room.thumbnail) {
          const image = document.createElement('img')
          image.src = room.thumbnail
          image.alt = ''
          preview.appendChild(image)
        } else {
          preview.textContent = 'No preview'
        }
        const details = document.createElement('div')
        details.className = 'online_room_details'
        const label = document.createElement('span')
        label.className = 'online_room_name'
        label.textContent = room.worldName || 'Unnamed world'
        const players = document.createElement('span')
        players.className = 'online_room_players'
        players.textContent = room.playerCount === null ? 'Players unavailable' : room.playerCount + ' / ' + room.maxPlayers + ' players'
        details.appendChild(label)
        details.appendChild(players)
        const button = document.createElement('button')
        button.className = 'online_room_join ui_btn'
        button.textContent = 'Join'
        button.addEventListener('click', () => this.run(() => this.joinOnlineRoom(room.code)))
        entry.appendChild(preview)
        entry.appendChild(details)
        entry.appendChild(button)
        list.appendChild(entry)
      })
    })
  }

}

module.exports = LocalWorldMenu
