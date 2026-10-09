const fs = require("fs")
const path = require("path")
const ExceptionReporter = require('./exception_reporter')
const protobuf = require("protobufjs")
const zlib = require('zlib')
const Config = require("./config")

class WorldSerializer {

  static async initSerializer() {
    this.protocols = {}

    await this.initSaveFileProtocols()
  }

  static async initSaveFileProtocols() {
    const directory = require("path").join(__dirname, "./protocol/save_formats")
    let saveFormatFiles = require("fs").readdirSync(directory)


    for (var i = 0; i < saveFormatFiles.length; i++) {
      let saveFormatFileName = saveFormatFiles[i]
      await this.initSaveFileProtocol(saveFormatFileName)
    }
  }

  static initSaveFileProtocol(saveFormatFileName) {
    let saveFormat = saveFormatFileName.split(".proto")[0]
    const fileName = `./protocol/save_formats/${saveFormatFileName}`

    let protoFile = require("path").join(__dirname, fileName)
    return new Promise((resolve, reject) => {
      protobuf.load(protoFile, (err, root) => {
        if (err) throw err

        this.protocols[saveFormat] = root.nested.app
        resolve()
      })
    })
  }

  // Each world is a plain file at <JUNON_SAVES_DIR>/<sectorUid>/sector.sav -
  // the same bytes as the hosted game's S3 objects, so an exported hosted
  // save can be dropped in as-is.
  static getSavesDirectory() {
    let directory = process.env.JUNON_SAVES_DIR
    if (!directory) {
      throw new Error("JUNON_SAVES_DIR is not defined")
    }

    return path.resolve(directory)
  }

  static getStandaloneSavePath(sectorUid) {
    // the uid becomes a directory name, so only allow the base64id alphabet
    // (no separators or dots) to keep every path inside the saves directory
    if (typeof sectorUid !== 'string' || !sectorUid.match(/^[A-Za-z0-9_-]+$/)) {
      throw new Error("Invalid sector uid: " + sectorUid)
    }

    return path.join(this.getSavesDirectory(), sectorUid, "sector.sav")
  }

  static async existsInSavesDirectory(filePath) {
    try {
      await fs.promises.access(filePath)
      return true
    } catch(e) {
      return false
    }
  }

  static async readFromSavesDirectory(filePath) {
    try {
      return await fs.promises.readFile(filePath)
    } catch(e) {
      ExceptionReporter.captureException(e)
      return false
    }
  }

  static async writeToSavesDirectory(filePath, data) {
    // write to a temp file and rename over the old save, so a crash or power
    // loss mid-write leaves the previous save intact instead of a truncated one
    let tempPath = filePath + ".tmp"

    try {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
      await fs.promises.writeFile(tempPath, data)
      await fs.promises.rename(tempPath, filePath)
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  static async deleteFromSavesDirectory(filePath) {
    try {
      await fs.promises.unlink(filePath)
    } catch(e) {
      if (e.code !== 'ENOENT') {
        ExceptionReporter.captureException(e)
      }
    }
  }

  static async hasCloudSavedData(sectorUid) {
    return this.existsInSavesDirectory(this.getSectorSavePath(sectorUid))
  }

  static getSectorSavePath(sectorUid) {
    return this.getStandaloneSavePath(sectorUid)
  }

  static parseSaveGame(buffer, version) {
    return this.getProtocolForVersion(version)["SaveState"].decode(buffer)
  }

  static parseSaveHeader(buffer) {
    return this.protocols["save_header"]["SaveState"].decode(buffer)
  }

  static parseSaveFileVersion(buffer) {
    let header = this.parseSaveHeader(buffer)
    return header.metadata.version
  }

  static async loadSector(sectorUid) {
    try {
      let compressed = await this.readFile(sectorUid)
      if (!compressed) return null

      let buffer = await this.decompressGzip(compressed)
      let version = this.parseSaveFileVersion(buffer)
      return this.parseSaveGame(buffer, version)
    } catch(e) {
      ExceptionReporter.captureException(e)
      return null
    }
  }

  static decompressGzip(compressed) {
    return new Promise((resolve, reject) => {
      zlib.gunzip(compressed, (err, result) => {
        if (err) {
          ExceptionReporter.captureException(err)
          resolve(null)
        } else {
          resolve(result)
        }
      })
    })
  }

  static async getSaveFileVersion(sectorUid) {
    try {
      let compressed = await this.readFile(sectorUid)
      if (!compressed) return null
      let buffer = await this.decompressGzip(compressed)
      let version = this.parseSaveFileVersion(buffer)
      return version
    } catch(e) {
      ExceptionReporter.captureException(e)
      return null
    }
  }

  // header-only parse: version, name, size and gameMode without decoding
  // every entity in the save
  static async getSaveMetadata(sectorUid) {
    try {
      let hasSave = await this.hasCloudSavedData(sectorUid)
      if (!hasSave) return null

      let compressed = await this.readFile(sectorUid)
      if (!compressed) return null
      let buffer = await this.decompressGzip(compressed)
      if (!buffer) return null
      return this.parseSaveHeader(buffer).metadata
    } catch(e) {
      ExceptionReporter.captureException(e)
      return null
    }
  }

  static async readFile(sectorUid) {
    return this.readFromSavesDirectory(this.getSectorSavePath(sectorUid))
  }

  static async deleteSector(sectorUid) {
    await this.deleteFromSavesDirectory(this.getSectorSavePath(sectorUid))
  }

  static createPlayerData(player) {
    return this.getCurrentProtocol().Player.fromObject(player)
  }

  static async upload(sectorUid, data, cb) {
    await this.writeToSavesDirectory(this.getSectorSavePath(sectorUid), data)
    cb()
  }

  static saveSector(sector) {
    let startTime = Date.now()
    let startTimestamp = sector.game.timestamp
    let buffer

    try {
      buffer = this.getSectorState(sector)
    } catch(e) {
      sector.game.broadcastError("Save Error. Problem encountered while saving the game.")
      sector.game.captureException(e)
      return
    }

    let snapshotDuration = Date.now() - startTime
    // console.log("save took " + snapshotDuration)

    return new Promise((resolve, reject) => {
      zlib.gzip(buffer, (err, archive) => {
        if (err) {
          ExceptionReporter.captureException(err)
          resolve()
        } else {
          this.upload(sector.game.getSectorUid(), archive, () => {
            resolve()
          })
        }
      })

    })
  }

  static writeToDisk(buffer) {
    fs.writeFile("./../sector.sav", buffer, (err) => {
      if (err) {
        ExceptionReporter.captureException(new Error("Error saving sector"))
      } else {
        console.log('Successfully saved sector')
      }
    })
  }

  static writeToFileName(buffer, filePath) {
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        ExceptionReporter.captureException(new Error("Error saving sector"))
      } else {
        console.log('Successfully saved sector at ' + filePath)
      }
    })
  }

  static getSectorMetadata(sector) {
    return {
      version: this.getVersion(),
      uid: sector.uid,
      name: sector.name,
      rowCount: sector.getRowCount(),
      colCount: sector.getColCount(),
      timestamp: sector.game.timestamp,
      gameMode: sector.game.gameMode
    }
  }

  static getVersion() {
    return Config.saveFormatVersion
  }

  static getProtocolForVersion(version) {
    return this.protocols["save_v" + version]
  }

  static getCurrentProtocol() {
    return this.getProtocolForVersion(this.getVersion())
  }

  static getSectorState(sector) {
    let entities = {
      terrains: [],
      terrainEntities: [],
      buildings: [],
      mobs: {},
      raids: [],
      teams: {},
      corpses: {},
      players: {},
      playerDataMap: {},
      transports: {},
      pickups: {},
      settings: {},
      activityLogEntries: {},
      commandLogEntries: {}
    }

    let json = {
      metadata: this.getSectorMetadata(sector),
      entities: entities
    }

    sector.groundMap.forEach((row, col, tile) => {
      if (!tile) {
        entities["terrains"].push(0)
      } else {
        entities["terrains"].push(tile.getType())

        if (tile.hasChanged()) {
          entities["terrainEntities"].push(tile)
        }
      }
    })

    let buildings = sector.buildingTree.all()

    entities["buildings"] = buildings

    entities["mobs"] = sector.mobs

    sector.game.eventManager.forEachRaid((raid) => {
      let raidOccured = raid && raid.spawnGround
      if (raidOccured) {
        entities["raids"].push(raid)
      }
    })

    entities["teams"]   = sector.game.teams
    entities["corpses"] = sector.corpses
    entities["players"] = sector.players
    entities["playerDataMap"] = sector.game.playerDataMap
    entities["transports"] = sector.transports
    entities["pickups"] = sector.pickups
    entities["settings"] = sector.settings
    entities["activityLogEntries"] = sector.activityLogEntries
    entities["commandLogEntries"] = sector.commandLogEntries
    entities["kits"] = sector.game.kits
    entities["sellables"] = sector.sellables
    entities["regions"] = sector.regions
    entities["purchasables"] = sector.purchasables
    entities["isCustomSell"] = sector.isCustomSell
    entities["mobCustomStats"] = sector.mobCustomStats
    entities["buildingCustomStats"] = sector.buildingCustomStats
    entities["entityCustomStats"] = sector.entityCustomStats
    entities["itemCustomStats"] = sector.itemCustomStats
    entities["commandBlockFullJson"] = JSON.stringify(sector.commandBlock.toJson())
    entities["variables"] = sector.eventHandler.variables
    entities["keyCodes"] = sector.keyCodes

    let encoded = this.getCurrentProtocol()["SaveState"].encode(json)
    let buffer = encoded.finish()

    return buffer
  }
}

module.exports = WorldSerializer
