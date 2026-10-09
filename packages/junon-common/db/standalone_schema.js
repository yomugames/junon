// Schema for the game's sqlite database (see config.js). There are no
// migrations (the hosted game's MySQL migrations were removed with it): the
// database is built from the models. Each table is created when missing, and
// columns a model gained since the file was created are added. Only additive
// changes are applied automatically; renaming or removing a column needs an
// explicit step here.
async function syncStandaloneSchema(sequelize) {
  let queryInterface = sequelize.getQueryInterface()

  // syncing each model on its own sidesteps the "cyclic dependency" error
  // sequelize.sync() raises over the sectors <-> users foreign keys
  for (let model of Object.values(sequelize.models)) {
    await model.sync()

    let columns = await queryInterface.describeTable(model.getTableName())
    for (let attribute of Object.values(model.rawAttributes)) {
      if (!columns[attribute.field]) {
        await queryInterface.addColumn(model.getTableName(), attribute.field, attribute)
      }
    }
  }
}

module.exports = syncStandaloneSchema
