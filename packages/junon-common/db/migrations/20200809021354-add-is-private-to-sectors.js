'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
   const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'sectors',
        'isPrivate',
        {
          type: Sequelize.DataTypes.BOOLEAN,
          allowNull: false
        },
        { transaction }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('sectors', 'isPrivate', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};


