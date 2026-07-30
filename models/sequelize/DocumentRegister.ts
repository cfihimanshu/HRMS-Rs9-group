import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class DocumentRegister extends Model<any, any> {
  [key: string]: any;
}

DocumentRegister.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    documentNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
    title: { type: DataTypes.STRING, allowNull: false },
    documentType: { type: DataTypes.STRING, allowNull: false },
    documentNature: {
      type: DataTypes.ENUM("Original", "Photocopy", "Certified Copy", "Digital"),
      allowNull: false,
      defaultValue: "Original",
    },
    sourceName: { type: DataTypes.STRING, allowNull: false },
    sourceDepartment: { type: DataTypes.STRING, allowNull: true },
    sourceContact: { type: DataTypes.STRING, allowNull: true },
    purpose: { type: DataTypes.TEXT, allowNull: false },
    receivedById: { type: DataTypes.STRING, allowNull: true },
    receivedByName: { type: DataTypes.STRING, allowNull: false },
    receivedAt: { type: DataTypes.DATE, allowNull: false },
    currentHolderId: { type: DataTypes.STRING, allowNull: true },
    currentHolderName: { type: DataTypes.STRING, allowNull: false },
    currentHolderDepartment: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM("In Custody", "Pending Acceptance", "Handed Over", "Returned", "Archived", "Missing", "Damaged", "Under Investigation", "Destroyed", "Confidential Hold"),
      allowNull: false,
      defaultValue: "In Custody",
    },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    fileUrl: { type: DataTypes.TEXT, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    visibility: {
      type: DataTypes.ENUM("Internal", "Department Only", "Management", "Confidential", "Highly Confidential"),
      allowNull: false,
      defaultValue: "Internal",
    },
    owningDepartment: { type: DataTypes.STRING, allowNull: true },
    linkedEntityType: { type: DataTypes.STRING, allowNull: true },
    linkedEntityId: { type: DataTypes.STRING, allowNull: true },
    physicalLocation: { type: DataTypes.STRING, allowNull: true },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: true },
    pendingHolderId: { type: DataTypes.STRING, allowNull: true },
    pendingHolderName: { type: DataTypes.STRING, allowNull: true },
    pendingHolderDepartment: { type: DataTypes.STRING, allowNull: true },
    pendingMovementId: { type: DataTypes.STRING, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    createdById: { type: DataTypes.STRING, allowNull: false },
    createdByName: { type: DataTypes.STRING, allowNull: false },
  },
  {
    sequelize,
    tableName: "document_register",
    timestamps: true,
    indexes: [
      { fields: ["documentNumber"], unique: true },
      { fields: ["status"] },
      { fields: ["currentHolderId"] },
      { fields: ["receivedAt"] },
      { fields: ["expiryDate"] },
      { fields: ["pendingHolderId"] },
    ],
  }
);

export default DocumentRegister;
