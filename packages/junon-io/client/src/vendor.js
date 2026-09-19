window.PIXI  = require('pixi.js')
window.Sentry = require("@sentry/browser")
window.Protobuf = require("protobufjs")
window.Howl = require("howler").Howl
window.TWEEN = require("./lib/tween.min.js")
// Only app, auth and database are used. Taking them as scoped packages rather
// than through the `firebase` umbrella keeps firestore, functions and their
// node-fetch out of the tree entirely. `firebase/app` was itself just
// `@firebase/app` plus the registerVersion call kept below.
window.firebase = require("@firebase/app").default
window.firebase.registerVersion("firebase", "7.24.0", "app")
require("@firebase/auth")
require("@firebase/database")
window.FingerprintJS = require("@fingerprintjs/fingerprintjs")
