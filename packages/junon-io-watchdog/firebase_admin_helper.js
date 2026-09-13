const { applicationDefault, initializeApp } = require('firebase-admin/app')
const { getDatabase } = require('firebase-admin/database')
const Config = require("junon-common/config")

const admin = {
  initializeApp,
  credential: { applicationDefault },
  database: getDatabase
}

class FirebaseAdminHelper {
  static init() {
    if (!this.isInitialized) {
      if (!global.isOffline) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          databaseURL: Config[env].firebase.databaseURL
        })
      }

      this.isInitialized = true
    }
  }

  static onRevisionChanged(cb) {
    let revisionRef = admin.database().ref("/revision")

    revisionRef.on('value', (snapshot) => {
      let revision = snapshot.val()
      cb(revision)
    })
  }

  static async notifyNodeRevision(region, nodeKey, revision) {
    let nodeRevisionRef = admin.database().ref(`/nodes/${region}/${nodeKey}/revision`)
    await nodeRevisionRef.set(revision)
  }

}

module.exports = FirebaseAdminHelper
