'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
   const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'sectors',
        'gameMode',
        {
          type: Sequelize.DataTypes.STRING,
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

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('sectors', 'gameMode', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};

