const fs = require("fs")
const path = require("path")

class BadWordsFilter {

  static init() {
    if (!this.isInitialized) {
      this.initRegExp()
      this.isInitialized = true
    }
  }

  static initRegExp() {
    let badWordsText = fs.readFileSync(path.resolve(__dirname, "bad_words.txt"), 'utf8')
    badWordsText = badWordsText.split("\n").filter((word) => {
      return word
    })

    this.regExp = new RegExp("(" + badWordsText.join("|") + ")", 'gi')
  }

  static isBadWord(text) {
    this.init()

    return text.toLowerCase().match(this.regExp)
  }
}

module.exports = BadWordsFilter
