const LocalWorldApi = require('../util/local_world_api')
const CoopAuth = require('../util/coop_auth')

const DEFAULT_HOST_PORT = 7777
const MODE_LABELS = { survival: 'Survival', peaceful: 'Sandbox', hardcore: 'Hardcore' }

// Standalone home menu. World management goes through LocalWorldApi (loopback
// page server, or the desktop app's game server process); game traffic still
// uses the ordinary authoritative socket.
class LocalWorldMenu {
  constructor(main) {
    this.main = main
    this.el = document.querySelector('#local_world_menu')
    this.panel = this.el.querySelector('.local_menu_panel')
    this.message = this.el.querySelector('.local_menu_message')
    this.nameInput = this.el.querySelector('.local_player_name')
    this.nameInput.value = main.localProfile.name || 'Player'
    this.nameInput.addEventListener('change', () => {
      try { this.saveName(); this.message.textContent = '' } catch (e) { this.message.textContent = e.message }
    })
    const actions = { new: 'newWorld', load: 'loadWorlds', tutorial: 'startTutorial', import: 'importWorld', host: 'hostWorld', join: 'joinWorld' }
    Object.keys(actions).forEach((name) => {
      this.el.querySelector('.local_' + name + '_btn').addEventListener('click', () => this[actions[name]]())
    })
    this.continueBtn = this.el.querySelector('.local_continue_btn')
    this.continueBtn.addEventListener('click', () => {
      if (this.latestWorld) this.openWorld(this.latestWorld)
    })
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
    document.querySelector('.middle_container').style.display = 'block'
    this.el.style.display = 'block'
    this.loadWorlds()
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

  newWorld() {
    this.setActive('new')
    this.panel.innerHTML = '<h2>New world</h2><label>World name <input class="world_name black_input" maxlength="40"></label><label>Mode <select class="world_mode ui_select"><option value="survival">Survival</option><option value="peaceful">Sandbox</option><option value="hardcore">Hardcore</option></select></label><button class="create_world ui_btn">Create and play</button>'
    this.panel.querySelector('.create_world').addEventListener('click', () => this.run(async () => {
      this.saveName()
      const result = await LocalWorldApi.createWorld({ ownerUid: this.main.localProfile.uid, name: this.panel.querySelector('.world_name').value, gameMode: this.panel.querySelector('.world_mode').value })
      this.open(result.worldId, result.serverUrl)
    }))
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

  // world names are player input, so entries are built with textContent
  createWorldEntry(world, isHosted) {
    const button = document.createElement('button')
    button.className = 'local_world_entry'
    button.dataset.mode = world.mode

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
    return button
  }

  renderNoWorlds(list) {
    list.innerHTML = '<div class="local_world_empty"><div class="local_world_empty_title">No worlds yet</div><p>Create a world, import a save, or join a friend\'s game.</p><button class="ui_btn">New world</button></div>'
    list.querySelector('button').addEventListener('click', () => this.newWorld())
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

      this.panel.innerHTML = '<h2>Host co-op</h2><p>Friends on your network, or on a VPN such as Tailscale, join with your address and this port. To play over the internet, forward the port on your router.</p><label>World <select class="host_world ui_select"></select></label><label>Port <input class="host_port black_input" type="number" min="1024" max="65535" value="' + DEFAULT_HOST_PORT + '"></label><label>Password <input class="host_password black_input" type="password" maxlength="64" placeholder="optional" autocomplete="new-password"></label><button class="start_hosting ui_btn">Host and play</button>'
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
    })
  }

  showHosting(result) {
    const hosting = result.hosting
    const world = result.worlds.find((entry) => entry.id === hosting.worldId)
    this.panel.innerHTML = '<h2>Host co-op</h2><p class="host_summary"></p><ul class="host_addresses"></ul><button class="play_hosted ui_btn">Play</button> <button class="stop_hosting ui_btn">Stop hosting</button>'
    this.panel.querySelector('.host_summary').textContent = 'Hosting ' + (world ? world.name : 'your world') + (hosting.hasPassword ? ' with a password' : '') + '. Friends join at:'
    const list = this.panel.querySelector('.host_addresses')
    const addresses = hosting.addresses.length ? hosting.addresses : ['<your address>']
    addresses.forEach((address) => {
      const item = document.createElement('li')
      item.textContent = address + ':' + hosting.port
      list.appendChild(item)
    })
    this.panel.querySelector('.play_hosted').addEventListener('click', () => this.open(hosting.worldId, result.serverUrl))
    this.panel.querySelector('.stop_hosting').addEventListener('click', () => this.run(async () => {
      await LocalWorldApi.stopHosting()
      this.hostWorld()
    }))
  }

  joinWorld() {
    this.setActive('join')
    this.panel.innerHTML = '<h2>Join co-op</h2><label>Address <input class="join_address black_input" placeholder="192.168.1.10:' + DEFAULT_HOST_PORT + '"></label><label>Password <input class="join_password black_input" type="password" maxlength="64" placeholder="if the host set one"></label><button class="connect_world ui_btn">Join</button>'
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

}

module.exports = LocalWorldMenu
