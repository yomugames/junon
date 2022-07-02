global.env = "staging"
const FirebaseAdminHelper = require("./../firebase_admin_helper")

const run = async () => {
  FirebaseAdminHelper.init()
  let admin = FirebaseAdminHelper.admin()

  let regions = ["nyc1", "fra1"]
  let sectors = {}

  for (var i = 0; i < regions.length; i++) {
    let region = regions[i]
    console.log("region: " + region)
    let snapshot = await admin.database().ref(`/sectors/${region}/all`).once('value')
    snapshot.forEach((childSnapshot) => {
      sectors[childSnapshot.key] = childSnapshot.val()
    })
  }


  console.log(Object.keys(sectors).length)
  copySectorsToAll(admin, sectors)
}

const copySectorsToAll = async (admin, sectors) => {
  for (let sectorId in sectors) {
    let data = sectors[sectorId]
    let sectorAllRef = admin.database().ref(`/sectors/all/${sectorId}`)
    await sectorAllRef.set(data)
  }
}

run()
