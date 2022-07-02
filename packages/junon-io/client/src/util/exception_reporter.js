const BetterDedupe = require("./better_dedupe")

const dedupeIntegration = new BetterDedupe()


const ExceptionReporter = {
  init: () => {
    // https://github.com/quasarframework/quasar/issues/2233
    
    Sentry.init({ 
      dsn: 'https://51a838887e50448d8a5370ff84c2932c@sentry.io/1467965', 
      release: ["junon-io@", window.revision].join(""),
      maxBreadcrumbs: 100,
      integrations: [dedupeIntegration],
      ignoreErrors: ['ResizeObserver loop limit exceeded', 'interrupted connection or unreachable host', 'Network Error', 'Extension context invalidated']
    })

    this.initialized = true
  },
  getDedupeInstance() {
    return dedupeIntegration
  },
  getSentryInstance() {
    return Sentry
  },
  captureException: (e) => {
    console.error(e)

    if (typeof debugMode !== "undefined" && debugMode) {
      return
    }

    if (!this.initialized) ExceptionReporter.init()
    Sentry.captureException(e)
  }
}

module.exports = ExceptionReporter
