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
      type: DataTypes.STRING, // id
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
    opening_photo_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    closing_photo_url: {
      type: DataTypes.STRING,
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
    indexes: [
      { fields: ["employee_id"] },
      { fields: ["date"] }
    ]
  }
);

let fieldVisitColsChecked = false;

export async function ensureFieldVisitSchema() {
  if (fieldVisitColsChecked) return;
  try {
    const [cols]: any[] = await sequelize.query("SHOW COLUMNS FROM field_visits").catch(() => [[]]);
    if (Array.isArray(cols) && cols.length > 0) {
      const existingCols = cols.map((c: any) => (c.Field || c.field || "").toLowerCase());
      if (!existingCols.includes("opening_photo_url")) {
        await sequelize.query("ALTER TABLE field_visits ADD COLUMN `opening_photo_url` VARCHAR(255) NULL").catch(() => {});
        console.log("[FIELD_VISITS SCHEMA] Dynamically added opening_photo_url column");
      }
      if (!existingCols.includes("closing_photo_url")) {
        await sequelize.query("ALTER TABLE field_visits ADD COLUMN `closing_photo_url` VARCHAR(255) NULL").catch(() => {});
        console.log("[FIELD_VISITS SCHEMA] Dynamically added closing_photo_url column");
      }
      fieldVisitColsChecked = true;
    }
  } catch (err) {
    console.warn("[FIELD VISIT SCHEMA EVOLUTION] Warning:", err);
  }
}

export default FieldVisit;
