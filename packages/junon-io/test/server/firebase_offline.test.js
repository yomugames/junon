const { execFileSync } = require('child_process')
const path = require('path')

const repositoryRoot = path.resolve(__dirname, '../../../..')

function assertOfflineBootstrapDoesNotInitializeFirebase(servicePath, helperPath) {
  const serviceModule = path.join(repositoryRoot, servicePath)
  const helperModule = path.join(repositoryRoot, helperPath)
  const script = `
    process.env.NODE_ENV = 'development'
    require(${JSON.stringify(serviceModule)})
    if (!global.isOffline) process.exit(1)
    const { getApps } = require('firebase-admin/app')
    const FirebaseAdminHelper = require(${JSON.stringify(helperModule)})
    FirebaseAdminHelper.init()
    if (getApps().length !== 0) process.exit(1)
  `

  execFileSync(process.execPath, ['-e', script], { cwd: repositoryRoot })
}

test('offline development does not initialize Firebase Admin', () => {
  assertOfflineBootstrapDoesNotInitializeFirebase(
    'packages/junon-io/server/server',
    'packages/junon-io/server/util/firebase_admin_helper'
  )
  assertOfflineBootstrapDoesNotInitializeFirebase(
    'packages/junon-matchmaker/src/index',
    'packages/junon-matchmaker/src/firebase_admin_helper'
  )
})
