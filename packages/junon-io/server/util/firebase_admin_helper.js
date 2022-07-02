const admin = require('firebase-admin')
const Config = require("junon-common/config")
const jwt = require('jsonwebtoken')

class FirebaseAdminHelper {
  static init() {
    if (!global.isFirebaseInitialized) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: Config[env].firebase.databaseURL
      })

      global.isFirebaseInitialized = true
    }
  }

  static setRegion(region) {
    this.region = region
  }

  static admin() {
    return admin
  }

  static async getTimestamp() {
    let value = await admin.database().ref('/timestamp').set(admin.database.ServerValue.TIMESTAMP)
    let timestampSnapshot = await admin.database().ref('/timestamp').once('value')
    let timestamp = timestampSnapshot.val()
    return timestamp
  }

  static verifyIdToken(idToken) {
    if (!idToken) return null
    return admin
      .auth()
      .verifyIdToken(idToken)
      .then((decodedToken) => {
        const uid = decodedToken.uid;
        return uid
      })
      .catch((e) => {
        return null
      })
  }

  static async sendServerData(serverKey, data) {
    if (global.isOffline) return false

    data.createTimestamp = admin.database.ServerValue.TIMESTAMP
    let serverDataRef = admin.database().ref(`/servers/${this.region}/${serverKey}/data`)
    await serverDataRef.set(data)
  }

  static async registerServerToNode(nodeKey, serverKey) {
    if (global.isOffline) return false

    let nodeServerDataRef = admin.database().ref(`/nodes/${this.region}/${nodeKey}/servers/${serverKey}`)
    await nodeServerDataRef.set(true)
  }

  static async sendServerPlayerCount(serverKey, playerCount) {
    if (global.isOffline) return false
    let serverPlayerCountRef = admin.database().ref(`/servers/${this.region}/${serverKey}/data/playerCount`)
    await serverPlayerCountRef.set(playerCount)
  }

  static async sendServerMemoryUsage(serverKey, memoryUsage) {
    if (global.isOffline) return false
    let serverMemoryUsageRef = admin.database().ref(`/servers/${this.region}/${serverKey}/data/memoryUsage`)
    await serverMemoryUsageRef.set(memoryUsage)
  }

  static onPodShutdownRequest(serverKey, cb) {
    if (global.isOffline) return false
    let podShutdownRef = admin.database().ref(`/servers/${this.region}/${serverKey}/shutdown`)

    podShutdownRef.on('value', (snapshot) => {
      let shutdown = snapshot.val()
      if (shutdown) {
        cb(shutdown)
      }
    })
  }

  static async setPvPSector(sectorUid) {
    if (global.isOffline) return 
    let pvpSectorRef = admin.database().ref(`/pvpSectors/${this.region}/${sectorUid}`)
    await pvpSectorRef.set(true)
  }

  static async removePvPSector(sectorUid) {
    if (global.isOffline) return 
    let pvpSectorRef = admin.database().ref(`/pvpSectors/${this.region}/${sectorUid}`)
    await pvpSectorRef.remove()
  }

  static async notifyRevision(revision) {
    let revisionRef = admin.database().ref(`/revision`)
    await revisionRef.set(revision)
  }

  static claimFreePort(nodeName) {
    let freePortRef = admin.database().ref(`/nodes/${this.region}/${nodeName}/lastPort/`)

    return new Promise((resolve, reject) => {
      freePortRef.transaction((lastPort) => {
        if (!lastPort) {
          return 5000
        } else if (lastPort === 5100) {
          return 5000
        } else if (lastPort === 5059) {
          return 5062 // 5060/5061 is blocked by chrome
        } else {
          return lastPort + 1
        }
      }, async (error, committed, snapshot) => {
          if (error) {
            let claimedPort = await this.claimFreePort(nodeName)
            if (claimedPort) {
              resolve(claimedPort)
            } else {
              resolve(null)
            }
          } else {
            let claimedPort = snapshot.val()
            resolve(claimedPort)
          }
      })
    })
  }



}

module.exports = FirebaseAdminHelper
