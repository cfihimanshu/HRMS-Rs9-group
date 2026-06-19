import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class EmployeeProfile extends Model {
  public mongo_id!: string;
  public user!: string;
  public employeeId!: string;
  public designation!: string;
  public department!: string;
  public dateOfJoining!: Date;
  public dateOfBirth!: Date;
  public gender!: string;
  public bloodGroup!: string;
  public panNumber!: string;
  public aadhaarNumber!: string;
  public uanNumber!: string;
  public pfNumber!: string;
  public esiNumber!: string;
  public bankName!: string;
  public accountNumber!: string;
  public ifscCode!: string;
  public baseSalary!: number;
}

EmployeeProfile.init(
  {
    mongo_id: {
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
  },
  {
    sequelize,
    tableName: "employeeprofiles",
    timestamps: true,
  }
);

export default EmployeeProfile;
