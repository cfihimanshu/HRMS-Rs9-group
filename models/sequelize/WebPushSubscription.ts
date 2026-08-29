import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class WebPushSubscription extends Model<any, any> { [key: string]: any; }

WebPushSubscription.init({
  id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  userId: { type: DataTypes.STRING, allowNull: false },
  endpoint: { type: DataTypes.TEXT, allowNull: false },
  p256dh: { type: DataTypes.TEXT, allowNull: false },
  auth: { type: DataTypes.TEXT, allowNull: false },
  userAgent: { type: DataTypes.TEXT, allowNull: true },
}, {
  sequelize,
  tableName: "web_push_subscriptions",
  timestamps: true,
  indexes: [{ name: "idx_web_push_user", fields: ["userId"] }],
});

export default WebPushSubscription;
