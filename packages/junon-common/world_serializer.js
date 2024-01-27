const fs = require("fs")
const path = require("path")
const ExceptionReporter = require('./exception_reporter')
const AWS = require('aws-sdk')
const protobuf = require("protobufjs")
const zlib = require('zlib')
const Config = require("./config")
const os = require('os')
const SectorModel = require("./db/sector")

const bucketName = "junon"

class WorldSerializer {

  static async initSerializer() {
    if (!debugMode) {
      const spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com')
      this.s3 = new AWS.S3({
        endpoint: spacesEndpoint
      })
    }

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

  static async existsLocally(sectorUid) {
    const sector = await SectorModel.findOne({ where: { uid: sectorUid } })
    if (!sector) return false

    return sector.data // check if save file already exist in data column
  }

  static existsRemotely(key) {
    const params = {
      Bucket: bucketName,
      Key: key
    }

    return new Promise((resolve, reject) => {
      this.s3.headObject(params, (err, data) => {
        if (err) {
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  static async hasCloudSavedData(sectorUid, cb) {
    let key = this.getSectorSavePath(sectorUid)

    if (debugMode) {
      return this.existsLocally(sectorUid)
    } else {
      return this.existsRemotely(key)
    }
  }

  static async listSectors() {
    let prefix = this.getSectorsListPath()

    let params = {
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: 500
    }

    let hasMoreData = true
    let result = []

    while (hasMoreData) {
      try {
        let data = await this.listSectorsPromise(params)
        let sectorIds = data.Contents.map((content) => {
          return content.Key
        }).filter((key) => {
          return key.match("sector.sav")
        })

        result = result.concat(sectorIds)

        if (data.NextMarker) {
          params['Marker'] = data.NextMarker
        } else {
          hasMoreData = false
        }
      } catch(e) {
        hasMoreData = false
      }
    }

    return result
  }

  static listSectorsPromise(params) {
    return new Promise((resolve, reject) => {
      this.s3.listObjects(params, (err, data) => {
        if (err) {
          console.log(err, err.stack)
          reject({})
          return
        } else {
          resolve(data)
        }
      })
    })
  }

  static getSectorSavePath(sectorUid) {
    let namespace = env

    return ["sectors", namespace, sectorUid, "sector.sav"].join("/")
  }

  static getSectorsListPath() {
    let namespace = env

    return ["sectors", namespace].join("/")
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

  static async readLocally(sectorUid) {
    const sector = await SectorModel.findOne({ where: { uid: sectorUid } })
    return sector.data
  }

  static readRemotely(key) {
    const params = {
      Bucket: bucketName,
      Key: key
    }

    return new Promise((resolve, reject) => {
      this.s3.getObject(params, (err, data) => {
        if (err) {
          ExceptionReporter.captureException(err)
          resolve(false)
        } else {
          resolve(data.Body)
        }
      })
    })
  }

  static async readFile(sectorUid) {
    let key = this.getSectorSavePath(sectorUid)

    if (debugMode) {
      return this.readLocally(sectorUid)
    } else {
      return this.readRemotely(key)
    }
  }

  static async deleteLocally(sectorUid) {
    const sector = await SectorModel.findOne({ where: { uid: sectorUid } })
    await sector.update({ data: null })
  }

  static deleteRemotely(key) {
    const params = {
      Bucket: bucketName,
      Key: key
    }

    return new Promise((resolve, reject) => {
      this.s3.deleteObject(params, (err, data) => {
        if (err) {
          ExceptionReporter.captureException(err)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  static async deleteSector(sectorUid) {
    let key = this.getSectorSavePath(sectorUid)

    if (debugMode) {
      await this.deleteLocally(sectorUid)
    } else {
      this.deleteRemotely(key)
    }

  }

  static createPlayerData(player) {
    return this.getCurrentProtocol().Player.fromObject(player)
  }

  static async writeLocally(sectorUid, data) {
    const sector = await SectorModel.findOne({ where: { uid: sectorUid } })
    await sector.update({ data: data })
  }

  static writeRemotely(key, data, cb) {
    const params = {
      Body: data,
      Bucket: bucketName,
      Key: key
    }

    this.s3.putObject(params, (err) => {
      if (err) {
        ExceptionReporter.captureException(err)
      }
      cb()
    })
  }

  static async upload(sectorUid, data, cb) {
    let key = this.getSectorSavePath(sectorUid)

    if (debugMode) {
      await this.writeLocally(sectorUid, data)
      cb()
    } else {
      this.writeRemotely(key, data, cb)
    }
  }

  static getLocalPath(key) {
    return os.tmpdir() + "/saves/" + key
  }

  static getLocalDirectory(filePath) {
    return path.dirname(filePath)
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
