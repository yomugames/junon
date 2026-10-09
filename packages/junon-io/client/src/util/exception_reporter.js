// Client errors are logged locally. There is no hosted error reporting.
const ExceptionReporter = {
  captureException: (e) => {
    console.error(e)
  }
}

module.exports = ExceptionReporter
