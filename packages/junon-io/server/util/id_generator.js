class IDGenerator {

  constructor() {
    this.idMap = {}  
  }

  generate(type) {
    return this.getNextIdForType(type)
  }

  getNextIdForType(type) {
    if (typeof this.idMap[type] === "undefined") this.idMap[type] = 0

    this.idMap[type]++ 

    return this.idMap[type]
  }

}

module.exports = IDGenerator