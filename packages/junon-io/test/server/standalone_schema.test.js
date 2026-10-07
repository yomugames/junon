// Standalone sqlite databases are built from the models rather than from the
// MySQL migrations (junon-common/db/standalone_schema.js), and must keep up
// when a model gains a column after the file was created.
const Sequelize = require('sequelize')
const syncStandaloneSchema = require('junon-common/db/standalone_schema')

function defineProfile(sequelize, attributes) {
  return sequelize.define('Profile', attributes, { tableName: 'profiles', freezeTableName: true })
}

test('creates missing tables and adds columns a model gained, keeping existing rows', async () => {
  const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })

  const ProfileV1 = defineProfile(sequelize, {
    uid: { type: Sequelize.STRING, primaryKey: true },
    username: Sequelize.STRING
  })
  await syncStandaloneSchema(sequelize)
  await ProfileV1.create({ uid: 'profileA', username: 'Rebel' })

  // a later version of the model with a new column
  sequelize.models = {}
  const ProfileV2 = defineProfile(sequelize, {
    uid: { type: Sequelize.STRING, primaryKey: true },
    username: Sequelize.STRING,
    gold: { type: Sequelize.INTEGER, defaultValue: 0 }
  })
  await syncStandaloneSchema(sequelize)

  const columns = await sequelize.getQueryInterface().describeTable('profiles')
  expect(Object.keys(columns)).toEqual(expect.arrayContaining(['uid', 'username', 'gold']))

  const profile = await ProfileV2.findByPk('profileA')
  expect(profile.username).toEqual('Rebel')

  await profile.update({ gold: 25 })
  expect((await ProfileV2.findByPk('profileA')).gold).toEqual(25)

  await sequelize.close()
})
