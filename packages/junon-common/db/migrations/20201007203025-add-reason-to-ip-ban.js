'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'ip_bans',
        'reason',
        {
          type: Sequelize.DataTypes.STRING,
          allowNull: true
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'ip_bans',
        'dayCount',
        {
          type: Sequelize.DataTypes.INTEGER,
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
      await queryInterface.removeColumn('ip_bans', 'reason', { transaction });
      await queryInterface.removeColumn('ip_bans', 'dayCount', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
