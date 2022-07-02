const sequelize = require("./sequelize")
const TokenGenerator = require("./token_generator")
const Sequelize = require("sequelize")

class Sector extends Sequelize.Model {

  static async createOne(attributes) {
    if (!attributes.uid) {
      let token = await this.generateToken()
      attributes.uid = token
    }
    
    if (!attributes['daysAlive']) { 
      attributes['daysAlive'] = 1
    }

    return this.create(attributes)
  }


  static generateToken() {
    let token = TokenGenerator.generate(12)

    return this.findOne({ where: { uid: token } })
                .then(function(user){
      const isUserTokenTaken = user !== null
      if (isUserTokenTaken) {
        return this.generateToken()
      } else {
        return Promise.resolve(token)
      }
    })
  }


}

Sector.init({
  uid: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  name: Sequelize.STRING,
  creatorUid: Sequelize.STRING,
  daysAlive:  Sequelize.INTEGER,
  screenshot:  Sequelize.STRING,
  createdAt: Sequelize.DATE,
  updatedAt: Sequelize.DATE,
  gameMode: Sequelize.STRING,
  data: Sequelize.BLOB("medium"),
  isPrivate: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  rating: {
    type: Sequelize.TINYINT,
    defaultValue: 0
  },
  upvoteCount: {
    type: Sequelize.SMALLINT,
    defaultValue: 0
  },
  downvoteCount: {
    type: Sequelize.SMALLINT,
    defaultValue: 0
  }
},{
  sequelize,
  modelName: "Sector",
  tableName: 'sectors',
  freezeTableName: true // prevent pluralization of names
})

module.exports = Sector