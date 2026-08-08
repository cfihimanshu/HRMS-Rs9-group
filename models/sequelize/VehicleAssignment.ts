import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class VehicleAssignment extends Model<any, any> { [key: string]: any; }

VehicleAssignment.init({
  id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  vehicleId: { type: DataTypes.STRING, allowNull: false },
  action: { type: DataTypes.STRING, allowNull: false },
  fromPersonId: { type: DataTypes.STRING, allowNull: true },
  fromPersonName: { type: DataTypes.STRING, allowNull: true },
  toPersonId: { type: DataTypes.STRING, allowNull: true },
  toPersonName: { type: DataTypes.STRING, allowNull: true },
  assigneeType: { type: DataTypes.ENUM("Employee", "External"), allowNull: true },
  assignedAt: { type: DataTypes.DATE, allowNull: false },
  returnedAt: { type: DataTypes.DATE, allowNull: true },
  purpose: { type: DataTypes.TEXT, allowNull: true },
  odometer: { type: DataTypes.INTEGER, allowNull: true },
  handoverProofUrl: { type: DataTypes.TEXT, allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  performedById: { type: DataTypes.STRING, allowNull: false },
  performedByName: { type: DataTypes.STRING, allowNull: false },
}, {
  sequelize, tableName: "vehicle_assignments", timestamps: true,
  indexes: [{ fields: ["vehicleId"] }, { fields: ["toPersonId"] }, { fields: ["assignedAt"] }],
});

export default VehicleAssignment;
