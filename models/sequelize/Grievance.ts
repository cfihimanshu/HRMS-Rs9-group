import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Grievance extends Model<any, any> { [key: string]: any; }

Grievance.init(
  {
    
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    raisedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    priority: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    anonymous: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assignedTo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resolutionReport: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    messages_json: {
      type: DataTypes.JSON,
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
    tableName: "grievances",
    timestamps: true,
  }
);

export async function ensureGrievanceSchema() {
  try {
    await Grievance.sync();
    const qi = sequelize.getQueryInterface();
    const cols = await qi.describeTable("grievances").catch(() => ({} as any));
    if (cols) {
      if (!cols.messages_json) {
        await qi.addColumn("grievances", "messages_json", {
          type: DataTypes.JSON,
          allowNull: true,
        }).catch(() => {});
      }
      if (cols.description && !cols.description.type?.toLowerCase().includes("text")) {
        await qi.changeColumn("grievances", "description", {
          type: DataTypes.TEXT,
          allowNull: true,
        }).catch(() => {});
      }
      if (cols.resolutionReport && !cols.resolutionReport.type?.toLowerCase().includes("text")) {
        await qi.changeColumn("grievances", "resolutionReport", {
          type: DataTypes.TEXT,
          allowNull: true,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("ensureGrievanceSchema error:", err);
  }
}

export default Grievance;
