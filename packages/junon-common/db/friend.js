const sequelize = require("./sequelize")
const Sequelize = require("sequelize")

class Friend extends Sequelize.Model {
  static async createOne(attributes) {
    return this.create(attributes)
  }
}

/* statuses
  requested, denied, friends, blocked
*/

Friend.init({
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userUid: Sequelize.STRING,
  friendUid: Sequelize.STRING,
  status: Sequelize.STRING,
  createdAt: Sequelize.DATE,
  updatedAt: Sequelize.DATE
},{
  sequelize,
  modelName: 'Friend',
  tableName: 'friends',
  freezeTableName: true // prevent pluralization of names
})

module.exports = Friend