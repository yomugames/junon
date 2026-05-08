const Config = require("junon-common/config")
const ExceptionReporter = require("./../util/exception_reporter")
const Cookies = require("js-cookie")

class FirebaseClientHelper {

  static async getServerAnnouncement() {
    if (firebase.apps.length === 0) return 
    let snapshot = await firebase.database().ref(`/announcement`).once('value')
    return snapshot.val()
  }

  static createFirebaseUser(uid, username, cb) {
    firebase.database().ref('users/' + uid).set({
      username: username
    }, (error) => {
      if (error) return cb(error)
      cb()
    })
  }

  static isElectron() {
    var userAgent = navigator.userAgent.toLowerCase();
    return userAgent === 'chrome' 
    // electron app modified userAgent to be chrome
    // to work 
    // https://stackoverflow.com/a/59722822
  }

  static signIn(providerName) {
    let provider  
    if (providerName === 'google') {
      provider = this.googleProvider
    } else if (providerName === 'facebook') {
      provider = this.facebookProvider
    } else {
      provider = this.googleProvider
    }

    // if (main.isMobile || this.isElectron()) {
    //   firebase.auth().signInWithRedirect(provider)
    //   return
    // }

    firebase.auth().signInWithPopup(provider).then((result) => {
      let token = result.credential.accessToken
      let user = result.user

      this.onSignInSuccessful(user)
    }).catch((error) => {
      this.onSignInError(error)
    })
  }

  static onSignInError(error) {
    document.querySelector("#login_btn").style.display = 'none'
    document.querySelector("#social_login_container").style.display = 'none'

    document.querySelector(".login_error").style.display = 'block'
    document.querySelector(".login_error_message").innerText = error.message
  }

  static onSignInSuccessful(user) {
    Cookies.set("uid", user.uid)  
    Cookies.set("email", user.email)  
  }

  static signOut(cb) {
    firebase.auth().signOut().then(() => {
      Cookies.remove("uid")  
      Cookies.remove("email")  
      cb()
    }).catch((error) => {
      alert("Logout failed")
    })
  }

  static initFirebase(callback) {
    firebase.initializeApp(Config[env].firebase)
    this.googleProvider = new firebase.auth.GoogleAuthProvider()
    this.facebookProvider = new firebase.auth.FacebookAuthProvider()

    firebase.auth().onAuthStateChanged((user) => {
      callback(user)
    })

    firebase.auth().getRedirectResult().then((result) => {
      let user = result.user
      if (user) {
        this.onSignInSuccessful(user)
      }
    }).catch((error) => {
      this.onSignInError(error)
    })
  }

  static getUIConfig() {
    let signInType = main.isMobile ? 'redirect' : 'popup'

    return {
      callbacks: {
        signInSuccessWithAuthResult: (authResult, redirectUrl) => {
          if (authResult.user) {
          }

          return false // Do not redirect.
        },
        uiShown: () => {
          let img = document.querySelector(".firebaseui-idp-google .firebaseui-idp-icon")
          let googleIconBasePath = "/assets/images/google_white_icon.png"

          if (!img) return

          if (this.isItchPage()) {
            img.src = window.location.href.replace("/index.html", googleIconBasePath)
          } else {
            img.src = googleIconBasePath
          }
        }
      },
      signInFlow: signInType,
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.FacebookAuthProvider.PROVIDER_ID
      ]
    }
  }

  static initFirebaseUI() {
    // this.ui.start('#firebaseui-auth-container', this.getUIConfig())
  }

  static rerenderFirebaseLoginUI() {
    // this.ui.start('#firebaseui-auth-container', this.getUIConfig())
  }

  static isItchPage() {
    return window.location.hostname.match("hwcdn.net")  
  }

  static listenToFirebaseAuth(cb) {
    firebase.auth().onAuthStateChanged(cb)
  }

  static fetchFirebaseIdToken(cb) {
    let forceRefresh = true
    firebase.auth().currentUser.getIdToken(forceRefresh).then((idToken) => {
      cb(idToken)
    }).catch((e) => {
      ExceptionReporter.captureException(e)
      cb(null)
    })
  }

  static isLoggedIn() {
    return firebase.auth().currentUser
  }

  static getFirebaseInstance() {
    return firebase
  }

}

module.exports = FirebaseClientHelper