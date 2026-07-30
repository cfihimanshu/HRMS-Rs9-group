import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Vehicle extends Model<any, any> { [key: string]: any; }

Vehicle.init({
  id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  registrationNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  companyId: { type: DataTypes.STRING, allowNull: true },
  companyName: { type: DataTypes.STRING, allowNull: false },
  ownerName: { type: DataTypes.STRING, allowNull: false },
  vehicleName: { type: DataTypes.STRING, allowNull: false },
  vehicleType: { type: DataTypes.STRING, allowNull: false },
  make: { type: DataTypes.STRING, allowNull: false },
  model: { type: DataTypes.STRING, allowNull: false },
  variant: { type: DataTypes.STRING, allowNull: true },
  manufacturingYear: { type: DataTypes.INTEGER, allowNull: true },
  color: { type: DataTypes.STRING, allowNull: true },
  fuelType: { type: DataTypes.STRING, allowNull: true },
  chassisNumber: { type: DataTypes.STRING, allowNull: true },
  engineNumber: { type: DataTypes.STRING, allowNull: true },
  purchaseDate: { type: DataTypes.DATEONLY, allowNull: true },
  purchaseValue: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  odometer: { type: DataTypes.INTEGER, allowNull: true },
  ownershipType: { type: DataTypes.STRING, allowNull: false, defaultValue: "Company Owned" },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "Available" },
  currentAssigneeId: { type: DataTypes.STRING, allowNull: true },
  currentAssigneeName: { type: DataTypes.STRING, allowNull: true },
  currentAssigneeType: { type: DataTypes.ENUM("Employee", "External"), allowNull: true },
  assignedAt: { type: DataTypes.DATE, allowNull: true },
  location: { type: DataTypes.STRING, allowNull: true },
  photoUrl: { type: DataTypes.TEXT, allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  createdById: { type: DataTypes.STRING, allowNull: false },
  createdByName: { type: DataTypes.STRING, allowNull: false },
}, {
  sequelize, tableName: "vehicles", timestamps: true,
  indexes: [
    { fields: ["registrationNumber"], unique: true },
    { fields: ["companyId"] }, { fields: ["status"] }, { fields: ["currentAssigneeId"] },
  ],
});

export default Vehicle;
