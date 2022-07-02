const ValidationUtil = {
  errorIfHasUndefined: (obj) => {
    ValidationUtil.doErrorIfHasUndefined(obj, '')
  },
  doErrorIfHasUndefined: (obj, stack) => {
    for (let property in obj) {
      if (obj.hasOwnProperty(property)) {
        if (typeof obj[property] === "object") {
          ValidationUtil.doErrorIfHasUndefined(obj[property], stack + '.' + property)
        } else if (typeof obj[property] === "undefined") {
          throw new Error("undefined value for " + stack + '.' + property)
        } else if (Number.isNaN(obj[property])) {
          throw new Error("NaN value for " + stack + '.' + property)
        }
      }
    }
  }
}

module.exports = ValidationUtil
