const Badges = {}

Badges.None = require('./none')
Badges.OG = require('./og')
Badges.Scrooge = require('./scrooge')
Badges.Event = require('./event')

let idToName = new Map()
for(let i in Badges) {
    idToName.set(Badges[i].prototype.getId(), i)
}

module.exports = {badges: Badges, map: idToName}