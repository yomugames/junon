'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
   const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'ip_bans',
        'username',
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
      await queryInterface.removeColumn('ip_bans', 'username', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};



