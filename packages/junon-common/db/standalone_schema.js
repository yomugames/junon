// Schema for the standalone (offline) sqlite database (see config.js).
//
// The migrations in db/migrations are MySQL history and many use raw MySQL
// SQL, so they can't run on sqlite and must not be rewritten. Standalone
// databases are instead built from the models: each table is created when
// missing, and columns a model gained since the file was created are added.
// Only additive changes are applied automatically; renaming or removing a
// column needs an explicit standalone step.
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
