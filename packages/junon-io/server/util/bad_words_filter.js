const fs = require("fs")
const path = require("path")

class BadWordsFilter {

  static init() {
    if (!this.isInitialized) {
      this.initDictionary()
      this.initRegExp()
      this.initJapaneseRegExp()
      this.isInitialized = true
    }
  }

  static initDictionary() {
    this.dictionary = {}

    let badWordsText = fs.readFileSync(path.resolve(__dirname, "bad_words.txt"), 'utf8')
    badWordsText.split("\n").forEach((word) => {
      this.dictionary[word.toLowerCase()] = true
    })
  }

  static initRegExp() {
    let badWordsText = fs.readFileSync(path.resolve(__dirname, "bad_words.txt"), 'utf8')
    badWordsText = badWordsText.split("\n").filter((word) => {
      return word
    })

    this.regExp = new RegExp("(" + badWordsText.join("|") + ")", 'gi')
  }

  static initJapaneseRegExp() {
    let japaneseBadWordsText = fs.readFileSync(path.resolve(__dirname, "japanese_bad_words.txt"), 'utf8')
    japaneseBadWordsText = japaneseBadWordsText.split("\n").filter((word) => {
      return word
    })

    this.japaneseRegExp = new RegExp("(" + japaneseBadWordsText.join("|") + ")", 'gi')
  }

  static replaceBadWordsJapanese(message) {
    return message.replace(this.japaneseRegExp, '****')  
  }

  static replaceBadWordsEnglish(message) {
    let tokens = message.split(" ")
    return tokens.map((token) => {
      let match = token.match(/\w+/)
      let word = match && match[0]
      
      let clean

      if (word && this.isBadWordSimple(word)) {
        clean = token.replace(word, "****")
      } else {
        clean = token
      }

      return clean.replace(/fuck/g,"****")
    }).join(" ")
  }


  static isBadWordSimple(text) {
    this.init()

    return this.dictionary[text.toLowerCase()]
  }
  
  static isBadWord(text) {
    this.init()

    return text.toLowerCase().match(this.regExp)
  }


}

module.exports = BadWordsFilter
