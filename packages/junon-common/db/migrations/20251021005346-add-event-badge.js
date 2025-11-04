'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
      try {
        await queryInterface.addColumn(
          'users',
          'badges',
          {
            type: Sequelize.DataTypes.TEXT, //this sucks. change it to its own table, or any alternative later if we have more than around 60 badges
            allowNull: true
          },
          { transaction }
        );
        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('users', 'badges', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
