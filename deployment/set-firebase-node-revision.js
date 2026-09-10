#!/usr/bin/env node

const admin = require('firebase-admin')
const Config = require('junon-common/config')

const [region, nodeName, revision] = process.argv.slice(2)
const validFirebaseKey = /^[A-Za-z0-9_-]+$/

if (!validFirebaseKey.test(region || '') || !validFirebaseKey.test(nodeName || '')) {
  throw new Error('Region and node name must contain only letters, numbers, underscores, or hyphens')
}

if (!/^[0-9a-f]{7,40}$/.test(revision || '')) {
  throw new Error('Revision must be a 7- to 40-character lowercase Git SHA')
}

const environment = process.env.NODE_ENV || 'production'
const firebaseConfig = Config[environment] && Config[environment].firebase

if (!firebaseConfig || !firebaseConfig.databaseURL) {
  throw new Error(`No Firebase database URL is configured for NODE_ENV=${environment}`)
}

async function setNodeRevision() {
  const app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: firebaseConfig.databaseURL
  })

  try {
    await app.database().ref(`/nodes/${region}/${nodeName}/revision`).set(revision)
    console.log(`Set Firebase revision for ${region}/${nodeName} to ${revision}`)
  } finally {
    await app.delete()
  }
}

setNodeRevision().catch((error) => {
  console.error(`Unable to set Firebase node revision: ${error.message}`)
  process.exitCode = 1
})
