import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class TaskLog extends Model<any, any> {
  [key: string]: any;

  static async generateNextTaskId(userId?: string): Promise<string> {
    let prefix = "TSK";
    if (userId) {
      try {
        const [rows]: any[] = await sequelize.query(
          "SELECT companies FROM users WHERE id = :userId",
          {
            replacements: { userId },
            type: "SELECT"
          }
        );
        if (rows && rows.companies) {
          let companyIds: string[] = [];
          if (typeof rows.companies === "string") {
            companyIds = JSON.parse(rows.companies);
          } else if (Array.isArray(rows.companies)) {
            companyIds = rows.companies;
          }
          if (companyIds.length > 0) {
            const [compRows]: any[] = await sequelize.query(
              "SELECT name FROM companys WHERE id = :compId",
              {
                replacements: { compId: companyIds[0] },
                type: "SELECT"
              }
            );
            if (compRows && compRows.name) {
              const name = compRows.name;
              const upper = name.toUpperCase();
              if (upper.includes("CFI") || upper.includes("CHARTERED")) prefix = "CFI";
              else if (upper.includes("RAA") || upper.includes("RUKSANA")) prefix = "RAA";
              else if (upper.includes("CTPL") || upper.includes("CITILINE")) prefix = "CTP";
              else if (upper.includes("ATPL") || upper.includes("ACOLYTE")) prefix = "ATP";
              else if (upper.includes("RNPL") || upper.includes("RUHAN")) prefix = "RNP";
              else if (upper.includes("MVPL") || upper.includes("MAVICS")) prefix = "MVP";
              else {
                prefix = name.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase().padEnd(3, "X");
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch company prefix for task:", e);
      }
    }

    const tasks = await TaskLog.findAll({ attributes: ["id"] });
    let maxNum = 0;
    tasks.forEach(t => {
      if (t.id) {
        const idStr = String(t.id);
        let num = NaN;
        if (idStr.includes("-TSK-")) {
          num = parseInt(idStr.split("-TSK-")[1], 10);
        } else if (idStr.startsWith("TSK-")) {
          num = parseInt(idStr.split("-")[1], 10);
        } else if (/^\d+$/.test(idStr)) {
          num = parseInt(idStr, 10);
        }
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    return `${prefix}-TSK-${String(maxNum + 1).padStart(3, "0")}`;
  }
}

TaskLog.init(
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
    taskTitle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    taskType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    progressNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    followUpHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    forwardedTo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reminderSent: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    timerStart: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    timerState: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Stopped",
    },
    elapsedSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
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
    tableName: "tasklogs",
    timestamps: true,
  }
);

export default TaskLog;
