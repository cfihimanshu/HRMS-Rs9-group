import sequelize from "./sequelize";
import HRRecentActivity from "@/models/sequelize/HRRecentActivity";

interface HRActivityParams {
  userId: string;
  userRole: string;
  action: string;
  details: string;
}

export async function logHRActivity({
  userId,
  userRole: _userRole,
  action,
  details
}: HRActivityParams) {
  try {
    await sequelize.authenticate();
    await HRRecentActivity.create({
      id: `${Date.now()}${Math.random().toString(36).slice(2, 9)}`,
      user: userId,
      action,
      details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Failed to write HR recent activity:", error);
  }
}
