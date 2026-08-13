import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class EmployeeProfile extends Model {
  declare id: string;
  declare user: string;
  declare employeeId: string;
  declare designation: string;
  declare department: string;
  declare vertical: string;
  declare dateOfJoining: Date;
  declare dateOfBirth: Date;
  declare gender: string;
  declare bloodGroup: string;
  declare panNumber: string;
  declare aadhaarNumber: string;
  declare uanNumber: string;
  declare pfNumber: string;
  declare esiNumber: string;
  declare bankName: string;
  declare accountNumber: string;
  declare ifscCode: string;
  declare baseSalary: number;
  declare allocatedAsset: string;
  declare allocatedSim: string;
  declare allocatedGmail: string;
  declare allocatedWhatsapp: string;
  declare reportingManager: string;
  declare assignedManager: string;
  declare profilePhoto: string;
  declare dailyWorkingHours: number;
  declare workingDays: string;
}

EmployeeProfile.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    user: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    vertical: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reportingManager: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assignedManager: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profilePhoto: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dailyWorkingHours: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 8
    },
    workingDays: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Mon,Tue,Wed,Thu,Fri,Sat"
    },
    dateOfJoining: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bloodGroup: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    panNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aadhaarNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    uanNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pfNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    esiNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ifscCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    baseSalary: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    "salaryStructure.basic": {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    "salaryStructure.hra": {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    "salaryStructure.conveyance": {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    "salaryStructure.specialAllowance": {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    "leaveBalances.casualLeave": {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    "leaveBalances.sickLeave": {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    "leaveBalances.earnedLeave": {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    allocatedAsset: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    allocatedSim: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    allocatedGmail: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    allocatedWhatsapp: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
  },
  {
    sequelize,
    tableName: "employeeprofiles",
    timestamps: true,
    indexes: [
      { fields: ["user"] },
      { fields: ["department"] },
      { fields: ["designation"] }
    ]
  }
);

export default EmployeeProfile;
