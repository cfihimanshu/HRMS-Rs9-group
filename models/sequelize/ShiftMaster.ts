import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class ShiftMaster extends Model<any, any> { [key: string]: any; }

ShiftMaster.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    grace_period_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 15,
    },
    half_day_hours: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 4,
    },
    full_day_hours: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 8,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "shift_masters",
    timestamps: true,
  }
);

export default ShiftMaster;
