const ProducerConsumerNetwork = require("./producer_consumer_network")

class OxygenNetwork extends ProducerConsumerNetwork {

  getConnectedRooms() {
    let connectedRooms = {}

    this.forEachMember((hit) => {
      let room = hit.entity.room
      if (room) {
        connectedRooms[room.getId()] = room
      }

      let rooms = hit.entity.rooms
      if (rooms) {
        for (let roomId in rooms) {
          connectedRooms[roomId] = rooms[roomId]
        }
      }
    })

    return Object.values(connectedRooms)
  }

  getResourceName() {
    return "oxygen"
  }

}

module.exports = OxygenNetwork
