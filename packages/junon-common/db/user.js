const sequelize = require("./sequelize")
const Sequelize = require("sequelize")

const Sector = require('./sector')
const Favorite = require('./favorite')
const SectorBan = require('./sector_ban')
const Friend = require('./friend')

class User extends Sequelize.Model {
  static async validateCreate(attributes) {
    let user

    if (!attributes.username) {
      return 'Username cant be blank'
    }

    let maxLength = 16
    if (attributes.username.length > maxLength) {
      return `Cannot be more than ${maxLength} characters`
    }

    if (attributes.username.match(/[^a-zA-Z0-9_]/)) {
      return "username can only contain alphanumeric characters and _"
    }

    if (attributes.username.length > maxLength) {
      return `Cannot be more than ${maxLength} characters`
    }

    user = await this.findOne({ where: { username: attributes.username } })
    if (user) {
      return `Username is already taken`
    }

    user = await this.findOne({ where: { uid: attributes.uid } })
    if (user) {
      return `uid is already taken`
    }

    // email

    if (attributes.email) {
      user = await this.findOne({ where: { email: attributes.email } })
      if (user) {
        return `Email is already taken`
      }
    }

  }

  static async isUsernameTaken(name) {
    let user = await this.findOne({ where: { username: name } })
    if (user) {
      return true
    }

    return false
  }

  static async createOne(attributes) {
    let error = await this.validateCreate(attributes)
    if (error) {
      return Promise.resolve({ error: error })
    }

    return this.create(attributes)
  }

  getData() {
    return this.toJSON()
  }
}

User.init({
  uid: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  username: Sequelize.STRING,
  email: Sequelize.STRING,
  gold: Sequelize.INTEGER,
  currentSectorUid: {
    type: Sequelize.STRING,
    references: {
      model: 'sectors',
      key: 'uid'
    },
    onDelete: 'SET NULL',
    allowNull: true
  },
  isRulesRead: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  isFriendRequestAllowed: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  },
  ip: Sequelize.STRING
},{
  sequelize,
  modelName: 'User',
  tableName: 'users',
  freezeTableName: true // prevent pluralization of names
})

Sector.belongsTo(User, {
  foreignKey: 'creatorUid',
  as: 'creator'
})

User.hasMany(Sector, {
  foreignKey: 'creatorUid',
  as: 'saves'
})

Sector.hasMany(User, {
  foreignKey: 'currentSectorUid',
  as: 'currentUsers'
})

User.belongsToMany(User, {
  through: Friend,
  foreignKey: 'userUid',
  as: 'friends'
})

Friend.belongsTo(User, {
  foreignKey: 'userUid',
  as: 'sender'
})

Friend.belongsTo(User, {
  foreignKey: 'friendUid',
  as: 'receiver'
})

Sector.hasMany(Favorite, {
  foreignKey: 'sectorUid',
  as: 'favorites'
})

Sector.hasMany(SectorBan, {
  foreignKey: 'sectorUid',
  as: 'sectorBans'
})

Favorite.belongsTo(Sector, {
  foreignKey: 'sectorUid',
  as: 'sector'
})

User.belongsTo(Sector, {
  foreignKey: 'currentSectorUid',
  as: 'sector'
})

User.belongsToMany(Sector, { 
  through: Favorite ,
  as: 'favorites',
  foreignKey: 'userUid'
})

Sector.belongsToMany(User, { 
  through: Favorite ,
  as: 'followers',
  foreignKey: 'sectorUid'
})

module.exports = User