import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import FieldVisit from "@/models/sequelize/FieldVisit";
import SodReport from "@/models/sequelize/SodReport";
import EodReport from "@/models/sequelize/EodReport";
import { Op } from "sequelize";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "Owner" && role !== "Director") {
      // return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }

    // Get today's start and end date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all employees
    const users = await User.findAll({
      attributes: ['id', 'name', 'role'],
    });

    const sods = await SodReport.findAll({
      where: { createdAt: { [Op.between]: [today, endOfDay] }, latitude: { [Op.not]: null } }
    });

    const eods = await EodReport.findAll({
      where: { createdAt: { [Op.between]: [today, endOfDay] }, latitude: { [Op.not]: null } }
    });

    const visits = await FieldVisit.findAll({
      where: { createdAt: { [Op.between]: [today, endOfDay] }, opening_coordinates: { [Op.not]: null } }
    });

    // Consolidate and find the latest coordinate for each user
    const userLocations: Record<string, { lat: number; lng: number; lastUpdate: Date; type: string }> = {};

    const processRecord = (employeeId: string, lat: number, lng: number, timestamp: Date, type: string) => {
      if (!userLocations[employeeId] || userLocations[employeeId].lastUpdate < timestamp) {
        userLocations[employeeId] = { lat, lng, lastUpdate: timestamp, type };
      }
    };

    sods.forEach(s => {
      const rec = s as any;
      if (rec.latitude && rec.longitude) {
        processRecord(rec.employee, rec.latitude, rec.longitude, rec.createdAt, "SOD Login");
      }
    });

    eods.forEach(e => {
      const rec = e as any;
      if (rec.latitude && rec.longitude) {
        processRecord(rec.employee, rec.latitude, rec.longitude, rec.createdAt, "EOD Logout");
      }
    });

    visits.forEach(v => {
      const rec = v as any;
      
      if (rec.closing_coordinates) {
        const [lat, lng] = rec.closing_coordinates.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          processRecord(rec.employee_id, lat, lng, rec.updatedAt || rec.createdAt, "Field Visit Closed - " + (rec.client_name || "Client"));
        }
      } else if (rec.opening_coordinates) {
        const [lat, lng] = rec.opening_coordinates.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          processRecord(rec.employee_id, lat, lng, rec.createdAt, "Field Visit Opened - " + (rec.client_name || "Client"));
        }
      }
    });

    // Map the results back to user details
    const activePins = [];
    for (const u of users) {
      const loc = userLocations[u.id as any];
      if (loc) {
        activePins.push({
          userId: u.id,
          name: u.name,
          role: u.role,
          lat: loc.lat,
          lng: loc.lng,
          lastUpdate: loc.lastUpdate,
          type: loc.type
        });
      }
    }

    return NextResponse.json({ success: true, data: activePins });
  } catch (error: any) {
    console.error("Live Tracking API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
