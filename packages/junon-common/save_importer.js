const zlib = require("zlib")
const base64id = require("base64id")
const WorldSerializer = require("./world_serializer")

// Imports a world exported from the hosted game for standalone (offline) play.
//
// Hosted saves identify characters by Firebase account uid (Player.uid,
// PlayerData.uid, the playerDataMap keys, Team.creatorUid/leaderUid - the same
// fields in every save format since v4). Import replaces each of those uids
// with an opaque local id, `imported-<n>`, so no hosted account id remains.
// Characters keep their inventory, stats and team.
//
// The importer owns the imported world, including its main colony team (the
// one hosted servers treated as the sector owner's). The save doesn't record
// which team that was - hosted servers kept the sector creator in MySQL - so it
// is the team named after the world (true of every hosted save checked so
// far), else the team with the most characters. The importer may also take
// over one character, whose id becomes their profile id.
//
// The save is decoded and re-encoded with the schema of its own format
// version; the server loads every supported version.
const IMPORTED_UID_PREFIX = "imported-"

// hosted pvp/minigame worlds (and anything unknown) can't be played offline
const SUPPORTED_GAME_MODES = ["", "default", "peaceful", "survival", "hardcore"]

class SaveImporter {
  static isImportedUid(uid) {
    return typeof uid === "string" && uid.startsWith(IMPORTED_UID_PREFIX)
  }

  // characters available to take over, with the local ids import assigns
  static listCharacters(compressed) {
    let world = this.decode(compressed)
    this.replaceAccountUids(world.save)

    let teamNames = {}
    for (let teamId in world.save.entities.teams) {
      teamNames[teamId] = world.save.entities.teams[teamId].name
    }

    return this.getCharacters(world.save).map((character) => {
      let teamId = character.team && character.team.id
      return {
        uid: character.uid,
        name: character.name,
        teamName: teamNames[teamId] || null
      }
    })
  }

  // options:
  //   worldId      id for the imported world (default: generated)
  //   ownerUid     the importer's local profile id (required)
  //   ownerName    shown as the main team's creator
  //   characterUid an `imported-<n>` id from listCharacters for the importer
  //                to play, or null to join as a new character
  static importSave(compressed, options = {}) {
    if (!options.ownerUid || this.isImportedUid(options.ownerUid)) {
      throw new Error("ownerUid must be a local profile id")
    }

    let world = this.decode(compressed)
    let worldId = options.worldId || base64id.generateId()

    this.replaceAccountUids(world.save)

    let mainTeam = this.findMainTeam(world.save)
    if (mainTeam) {
      mainTeam.creatorUid = options.ownerUid
      if (options.ownerName) {
        mainTeam.creatorName = options.ownerName
      }
    }

    if (options.characterUid) {
      let character = this.getCharacters(world.save).find((character) => {
        return character.uid === options.characterUid
      })
      if (!character || !this.isImportedUid(options.characterUid)) {
        throw new Error("Unknown character " + options.characterUid)
      }

      this.renameCharacter(world.save, options.characterUid, options.ownerUid)
    }

    world.save.metadata.uid = worldId

    let buffer = world.SaveState.encode(world.save).finish()

    return {
      worldId: worldId,
      name: world.save.metadata.name,
      gameMode: world.save.metadata.gameMode,
      version: world.version,
      mainTeamName: mainTeam ? mainTeam.name : null,
      compressed: zlib.gzipSync(buffer)
    }
  }

  static decode(compressed) {
    let buffer = zlib.gunzipSync(compressed)
    let version = WorldSerializer.parseSaveFileVersion(buffer)
    let protocol = WorldSerializer.getProtocolForVersion(version)
    if (!protocol || version < 3) {
      throw new Error("Unsupported save format version " + version)
    }

    let save = protocol.SaveState.decode(buffer)
    let gameMode = save.metadata.gameMode || ""
    if (SUPPORTED_GAME_MODES.indexOf(gameMode) === -1) {
      throw new Error("Unsupported game mode " + gameMode)
    }

    save.entities = save.entities || {}
    save.entities.playerDataMap = save.entities.playerDataMap || {}
    save.entities.players = save.entities.players || {}
    save.entities.teams = save.entities.teams || {}

    return { version: version, SaveState: protocol.SaveState, save: save }
  }

  // Player records: offline characters (playerDataMap) and characters that
  // were online when the world was saved (players). Both load as PlayerData.
  static getCharacters(save) {
    let characters = []

    for (let key in save.entities.playerDataMap) {
      let playerData = save.entities.playerDataMap[key]
      if (playerData.data) characters.push(playerData.data)
    }

    for (let id in save.entities.players) {
      characters.push(save.entities.players[id])
    }

    return characters.filter((character) => character.uid)
  }

  // deterministic, so listCharacters and importSave agree on ids
  static replaceAccountUids(save) {
    let uidMap = {}
    let nextIndex = 1
    let mapUid = (uid) => {
      if (!uid) return uid
      if (!uidMap[uid]) {
        uidMap[uid] = IMPORTED_UID_PREFIX + nextIndex
        nextIndex += 1
      }
      return uidMap[uid]
    }

    let playerDataMap = {}
    for (let key in save.entities.playerDataMap) {
      let playerData = save.entities.playerDataMap[key]
      let uid = mapUid(playerData.uid || key)
      playerData.uid = uid
      if (playerData.data) playerData.data.uid = uid
      playerDataMap[uid] = playerData
    }
    save.entities.playerDataMap = playerDataMap

    for (let id in save.entities.players) {
      let player = save.entities.players[id]
      player.uid = mapUid(player.uid)
    }

    for (let teamId in save.entities.teams) {
      let team = save.entities.teams[teamId]
      team.creatorUid = mapUid(team.creatorUid)
      team.leaderUid = mapUid(team.leaderUid)
    }

    return uidMap
  }

  // a character's identity and team leadership move with it; team creators
  // stay put (the main team's creator is the world owner, see above)
  static renameCharacter(save, fromUid, toUid) {
    let playerData = save.entities.playerDataMap[fromUid]
    if (playerData) {
      delete save.entities.playerDataMap[fromUid]
      playerData.uid = toUid
      if (playerData.data) playerData.data.uid = toUid
      save.entities.playerDataMap[toUid] = playerData
    }

    for (let id in save.entities.players) {
      let player = save.entities.players[id]
      if (player.uid === fromUid) player.uid = toUid
    }

    for (let teamId in save.entities.teams) {
      let team = save.entities.teams[teamId]
      if (team.leaderUid === fromUid) team.leaderUid = toUid
    }
  }

  static findMainTeam(save) {
    let teams = Object.values(save.entities.teams)
    if (teams.length === 0) return null

    let namedAfterWorld = teams.find((team) => team.name === save.metadata.name)
    if (namedAfterWorld) return namedAfterWorld

    let memberCounts = {}
    this.getCharacters(save).forEach((character) => {
      let teamId = character.team && character.team.id
      if (teamId) memberCounts[teamId] = (memberCounts[teamId] || 0) + 1
    })

    return teams.reduce((best, team) => {
      return (memberCounts[team.id] || 0) > (memberCounts[best.id] || 0) ? team : best
    })
  }
}

SaveImporter.IMPORTED_UID_PREFIX = IMPORTED_UID_PREFIX

module.exports = SaveImporter
