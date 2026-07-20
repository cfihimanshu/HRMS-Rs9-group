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
  userRole,
  action,
  details
}: HRActivityParams) {
  try {
    await sequelize.authenticate();
    await HRRecentActivity.create({
      user: userId,
      action,
      details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Failed to write HR recent activity:", error);
  }
}

