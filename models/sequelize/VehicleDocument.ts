import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class VehicleDocument extends Model<any, any> { [key: string]: any; }

VehicleDocument.init({
  id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  vehicleId: { type: DataTypes.STRING, allowNull: false },
  documentType: { type: DataTypes.STRING, allowNull: false },
  documentNumber: { type: DataTypes.STRING, allowNull: true },
  issueDate: { type: DataTypes.DATEONLY, allowNull: true },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: true },
  fileUrl: { type: DataTypes.TEXT, allowNull: false },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  uploadedById: { type: DataTypes.STRING, allowNull: false },
  uploadedByName: { type: DataTypes.STRING, allowNull: false },
}, {
  sequelize, tableName: "vehicle_documents", timestamps: true,
  indexes: [{ fields: ["vehicleId"] }, { fields: ["documentType"] }, { fields: ["expiryDate"] }],
});

export default VehicleDocument;
