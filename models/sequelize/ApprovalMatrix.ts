import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class ApprovalMatrix extends Model<any, any> { [key: string]: any; }

ApprovalMatrix.init(
  {
    formKey: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    formName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    approverRoles: {
      type: DataTypes.TEXT, // Stored as JSON string array e.g. '["Owner", "Accounts"]'
      allowNull: true,
    },
    approverUsers: {
      type: DataTypes.TEXT, // Stored as JSON string array of user IDs
      allowNull: true,
    },
    notifyEmail: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    notifyApp: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    userOverrides: {
      type: DataTypes.TEXT, // Stored as JSON string array of { applicantId, approverUserIds }
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "approval_matrix",
    timestamps: true,
  }
);

export default ApprovalMatrix;
