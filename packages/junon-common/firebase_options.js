const Config = require('./config')

// Called before either service initializes the shared default Admin app.
module.exports = function firebaseOptions(environment, applicationDefault) {
  const config = Config[environment]
  if (environment === 'development') {
    // Keep server routing identical to the browser and firebase.json. Do not use
    // ADC locally, even if a developer has cloud credentials in their shell.
    process.env.FIREBASE_AUTH_EMULATOR_HOST = config.firebaseEmulators.auth
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = config.firebaseEmulators.database
    return {
      projectId: config.firebase.projectId,
      databaseURL: config.firebase.databaseURL
    }
  }

  return {
    credential: applicationDefault(),
    databaseURL: config.firebase.databaseURL
  }
}
