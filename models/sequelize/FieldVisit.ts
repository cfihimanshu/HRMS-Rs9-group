import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class FieldVisit extends Model<any, any> { [key: string]: any; }

FieldVisit.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    employee_id: {
      type: DataTypes.STRING, // mongo_id
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    opening_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    opening_km: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    opening_location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    opening_coordinates: {
      type: DataTypes.STRING, // "lat,lng"
      allowNull: true,
    },
    vehicle_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fuel_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    client_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    purpose: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    visit_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    closing_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closing_km: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    closing_location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    closing_coordinates: {
      type: DataTypes.STRING, // "lat,lng"
      allowNull: true,
    },
    distance_travelled: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    expenses_json: {
      type: DataTypes.JSON, // { amount, reason }
      allowNull: true,
    },
    visit_summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    photos_json: {
      type: DataTypes.JSON, // URLs of uploaded photos
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Open", // Open, Closed
    },
  },
  {
    sequelize,
    tableName: "field_visits",
    timestamps: true,
  }
);

export default FieldVisit;
