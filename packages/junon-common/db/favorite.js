const sequelize = require("./sequelize")
const Sequelize = require("sequelize")

class Favorite extends Sequelize.Model {
  static async createOne(attributes) {
    return this.create(attributes)
  }
}

Favorite.init({
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userUid: Sequelize.STRING,
  sectorUid: {
    type: Sequelize.STRING,
    references: {
      model: 'sectors',
      key: 'uid'
    },
    onDelete: 'SET NULL',
    allowNull: true
  },
  createdAt: Sequelize.DATE,
  updatedAt: Sequelize.DATE
},{
  sequelize,
  modelName: 'Favorite',
  tableName: 'favorites',
  freezeTableName: true // prevent pluralization of names
})

module.exports = Favorite