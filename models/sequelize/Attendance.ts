import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Attendance extends Model {
  public id!: string;
  public employee!: string;
  public date!: Date;
  public status!: string;
  public checkIn!: Date;
  public checkOut!: Date;
}

Attendance.init(
  {
    
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    employee: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    checkIn: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    checkOut: {
      type: DataTypes.DATE,
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
    tableName: "attendances",
    timestamps: true,
    indexes: [
      { fields: ["employee"] },
      { fields: ["date"] }
    ]
  }
);

export default Attendance;
