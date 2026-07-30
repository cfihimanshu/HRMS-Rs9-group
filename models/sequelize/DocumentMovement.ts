import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class DocumentMovement extends Model<any, any> {
  [key: string]: any;
}

DocumentMovement.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    documentId: { type: DataTypes.STRING, allowNull: false },
    sequence: { type: DataTypes.INTEGER, allowNull: false },
    action: {
      type: DataTypes.ENUM("RECEIVED", "HANDOVER_REQUESTED", "HANDOVER", "HANDOVER_REJECTED", "RETURNED", "ARCHIVED", "REOPENED", "CORRECTED", "INCIDENT"),
      allowNull: false,
    },
    fromPersonId: { type: DataTypes.STRING, allowNull: true },
    fromPersonName: { type: DataTypes.STRING, allowNull: false },
    toPersonId: { type: DataTypes.STRING, allowNull: true },
    toPersonName: { type: DataTypes.STRING, allowNull: false },
    toDepartment: { type: DataTypes.STRING, allowNull: true },
    purpose: { type: DataTypes.TEXT, allowNull: false },
    movedAt: { type: DataTypes.DATE, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    acknowledgementUrl: { type: DataTypes.TEXT, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    performedById: { type: DataTypes.STRING, allowNull: false },
    performedByName: { type: DataTypes.STRING, allowNull: false },
    acceptanceStatus: {
      type: DataTypes.ENUM("NOT_REQUIRED", "PENDING", "ACCEPTED", "REJECTED"),
      allowNull: false,
      defaultValue: "NOT_REQUIRED",
    },
    respondedAt: { type: DataTypes.DATE, allowNull: true },
    responseRemarks: { type: DataTypes.TEXT, allowNull: true },
    changeDetails: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "document_movements",
    timestamps: true,
    indexes: [
      { fields: ["documentId", "sequence"], unique: true },
      { fields: ["movedAt"] },
      { fields: ["toPersonId"] },
    ],
  }
);

export default DocumentMovement;
