import sequelize from './lib/sequelize';
import LegalRecoveryBill from './models/sequelize/LegalRecoveryBill';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    await LegalRecoveryBill.sync({ alter: true });
    console.log('LegalRecoveryBill table altered successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database or sync:', error);
    process.exit(1);
  }
})();
