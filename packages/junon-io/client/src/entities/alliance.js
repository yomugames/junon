const IDGenerator = require('../util/id_generator')

class Alliance {
  constructor(name) {
    this.id = IDGenerator.generate("entity")
    this.name = name  
    this.members = {}
  }

  addMember(member) {
    this.members[member.id] = member
  }

  removeMember(member) {
    delete this.members[member.id] 
  }

  
}

module.exports = Alliance