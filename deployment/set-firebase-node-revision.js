#!/usr/bin/env node

const { applicationDefault, deleteApp, initializeApp } = require('firebase-admin/app')
const { getDatabase } = require('firebase-admin/database')
const Config = require('junon-common/config')

const validFirebaseKey = /^[A-Za-z0-9_-]+$/

function getDeploymentConfig(args, environment) {
  const [region, nodeName, revision] = args

  if (!validFirebaseKey.test(region || '') || !validFirebaseKey.test(nodeName || '')) {
    throw new Error('Region and node name must contain only letters, numbers, underscores, or hyphens')
  }

  if (!/^[0-9a-f]{7,40}$/.test(revision || '')) {
    throw new Error('Revision must be a 7- to 40-character lowercase Git SHA')
  }

  const firebaseConfig = Config[environment] && Config[environment].firebase
  if (!firebaseConfig || !firebaseConfig.databaseURL) {
    throw new Error(`No Firebase database URL is configured for NODE_ENV=${environment}`)
  }

  return { region, nodeName, revision, firebaseConfig }
}

async function setNodeRevision({ region, nodeName, revision, firebaseConfig, firebaseAdmin }) {
  const app = firebaseAdmin.initializeApp({
    credential: firebaseAdmin.applicationDefault(),
    databaseURL: firebaseConfig.databaseURL
  })

  try {
    await firebaseAdmin.getDatabase(app).ref(`/nodes/${region}/${nodeName}/revision`).set(revision)
    console.log(`Set Firebase revision for ${region}/${nodeName} to ${revision}`)
  } finally {
    await firebaseAdmin.deleteApp(app)
  }
}

async function main() {
  const environment = process.env.NODE_ENV || 'production'
  const deploymentConfig = getDeploymentConfig(process.argv.slice(2), environment)
  await setNodeRevision({
    ...deploymentConfig,
    firebaseAdmin: { applicationDefault, deleteApp, getDatabase, initializeApp }
  })
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Unable to set Firebase node revision: ${error.message}`)
    process.exitCode = 1
  })
}

module.exports = { getDeploymentConfig, setNodeRevision }
