const { Sequelize, DataTypes } = require('sequelize');

async function run() {
  const sequelize = new Sequelize('fmojnedg_Rs9_Group_HRMS', 'fmojnedg_Rs9_Group', 'Legal786skr', {
    host: '103.191.208.201',
    dialect: 'mysql',
    logging: false,
  });

  const AssetRequest = sequelize.define("AssetRequest", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employee_id: { type: DataTypes.STRING, allowNull: false },
    requested_for: { type: DataTypes.STRING, allowNull: true },
    asset_type: { type: DataTypes.STRING, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    priority: { type: DataTypes.STRING, defaultValue: "Medium" },
    status: { type: DataTypes.STRING, defaultValue: "Pending" },
    admin_remarks: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: "asset_requests",
    timestamps: true,
  });

  try {
    await AssetRequest.sync({ alter: true });
    console.log("Database altered successfully.");
  } catch (e) {
    console.error(e);
  }
  
  await sequelize.close();
}
run();
