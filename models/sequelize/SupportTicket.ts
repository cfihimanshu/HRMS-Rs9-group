import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class SupportTicket extends Model<any, any> { [key: string]: any; }

SupportTicket.init({
  id: { type: DataTypes.STRING, primaryKey: true },
  ticketNo: { type: DataTypes.STRING, allowNull: false, unique: true },
  title: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false, defaultValue: "General" },
  moduleName: { type: DataTypes.STRING, allowNull: true },
  issueType: { type: DataTypes.STRING, allowNull: false, defaultValue: "Issue" },
  priority: { type: DataTypes.STRING, allowNull: false, defaultValue: "Medium" },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "Open" },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: false },
  expectedResolution: { type: DataTypes.TEXT, allowNull: true },
  raisedById: { type: DataTypes.STRING, allowNull: false },
  raisedByName: { type: DataTypes.STRING, allowNull: false },
  raisedByRole: { type: DataTypes.STRING, allowNull: true },
  assignedToId: { type: DataTypes.STRING, allowNull: true },
  assignedToName: { type: DataTypes.STRING, allowNull: true },
  assignedToRole: { type: DataTypes.STRING, allowNull: true },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true },
  resolution: { type: DataTypes.TEXT, allowNull: true },
  lastActionBy: { type: DataTypes.STRING, allowNull: true },
  lastActionAt: { type: DataTypes.DATE, allowNull: true },
  closedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  tableName: "support_tickets",
  timestamps: true,
  indexes: [
    { name: "idx_support_ticket_status", fields: ["status"] },
    { name: "idx_support_ticket_assigned", fields: ["assignedToId"] },
    { name: "idx_support_ticket_raised", fields: ["raisedById"] },
    { name: "idx_support_ticket_created", fields: ["createdAt"] },
  ],
});

export default SupportTicket;
