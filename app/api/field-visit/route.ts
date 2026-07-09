import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import FieldVisit from "@/models/sequelize/FieldVisit";
import { logAudit } from "@/lib/audit";
import { Op } from "sequelize";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeIdFilter = searchParams.get("employeeId");
    
    await sequelize.authenticate();
    await FieldVisit.sync({ alter: true });

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // Check if user has managerial role
    const isManager = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(userRole);

    let whereClause: any = {};
    if (!isManager) {
      // Regular employees can only see their own visits
      whereClause.employee_id = userId;
    } else {
      if (employeeIdFilter) {
        whereClause.employee_id = employeeIdFilter;
      }
    }

    const visits = await FieldVisit.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]]
    });

    // Resolve employee details to attach to visits
    const users = await User.findAll({
      attributes: ["id", "name", "email"]
    });
    const profiles = await EmployeeProfile.findAll({
      attributes: ["user", "department"]
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.id] = { name: u.name, email: u.email };
      return acc;
    }, {});

    const profileMap = profiles.reduce((acc: any, p: any) => {
      acc[p.user] = p.department;
      return acc;
    }, {});

    const enrichedVisits = visits.map((v: any) => {
      const vJson = v.toJSON();
      const emp = userMap[vJson.employee_id] || { name: "Unknown", email: "" };
      return {
        ...vJson,
        employee: {
          ...emp,
          department: profileMap[vJson.employee_id] || "General"
        }
      };
    });

    // Check if employee currently has an active open visit
    const activeVisit = await FieldVisit.findOne({
      where: { employee_id: userId, status: "Open" }
    });

    return NextResponse.json({
      success: true,
      data: enrichedVisits,
      activeVisit: activeVisit ? activeVisit.toJSON() : null
    });
  } catch (error: any) {
    console.error("Error in GET /api/field-visit:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { action } = body;

    await sequelize.authenticate();
    await FieldVisit.sync({ alter: true });

    if (action === "start") {
      const { opening_km, opening_coordinates, opening_location, vehicle_number, fuel_status, photo_url } = body;

      if (opening_km === undefined || opening_km === null) {
        return NextResponse.json({ success: false, error: "Opening KM reading is required." }, { status: 400 });
      }

      if (!opening_coordinates) {
        return NextResponse.json({ success: false, error: "Strict Rule: Device's live GPS location is mandatory to start a field visit." }, { status: 400 });
      }

      // Check if there is already an active visit
      const activeVisit = await FieldVisit.findOne({
        where: { employee_id: userId, status: "Open" }
      });
      if (activeVisit) {
        return NextResponse.json({ success: false, error: "You already have an active open field visit. Please close it first." }, { status: 400 });
      }

      const todayStr = new Date().toISOString().split("T")[0];

      const newVisit = await FieldVisit.create({
        employee_id: userId,
        date: todayStr,
        opening_time: new Date(),
        opening_km: Number(opening_km),
        opening_location: opening_location || "Field",
        opening_coordinates: opening_coordinates || null,
        vehicle_number: vehicle_number || "Self",
        fuel_status: fuel_status || "Full",
        photos_json: photo_url ? [photo_url] : [],
        status: "Open"
      });

      await logAudit({
        userId,
        action: "FIELD_VISIT_STARTED",
        entity: "FieldVisit",
        entityId: newVisit.id.toString(),
        details: `Employee started a field visit. Vehicle: ${vehicle_number || "Self"}, Start KM: ${opening_km}.`,
      });

      return NextResponse.json({
        success: true,
        message: "Field visit started successfully.",
        data: newVisit
      });

    } else if (action === "close") {
      const { closing_km, closing_coordinates, closing_location, client_name, purpose, visit_notes, visit_summary, photo_url, expenses } = body;

      if (closing_km === undefined || closing_km === null) {
        return NextResponse.json({ success: false, error: "Closing KM reading is required." }, { status: 400 });
      }

      if (!closing_coordinates) {
        return NextResponse.json({ success: false, error: "Strict Rule: Device's live GPS location is mandatory to close a field visit." }, { status: 400 });
      }

      // Find active open visit
      const activeVisit = await FieldVisit.findOne({
        where: { employee_id: userId, status: "Open" }
      });

      if (!activeVisit) {
        return NextResponse.json({ success: false, error: "No active field visit found to close." }, { status: 400 });
      }

      const parsedClosingKm = Number(closing_km);
      if (parsedClosingKm < activeVisit.opening_km) {
        return NextResponse.json({ success: false, error: `Closing KM (${parsedClosingKm}) cannot be less than Opening KM (${activeVisit.opening_km}).` }, { status: 400 });
      }

      const distance = parsedClosingKm - activeVisit.opening_km;
      let currentPhotos = activeVisit.photos_json;
      if (!currentPhotos) {
        currentPhotos = [];
      } else if (typeof currentPhotos === "string") {
        try {
          currentPhotos = JSON.parse(currentPhotos);
        } catch (e) {
          currentPhotos = [];
        }
      }
      if (!Array.isArray(currentPhotos)) {
        currentPhotos = [];
      }

      if (photo_url) {
        currentPhotos.push(photo_url);
      }

      await activeVisit.update({
        closing_time: new Date(),
        closing_km: parsedClosingKm,
        closing_location: closing_location || "Field",
        closing_coordinates: closing_coordinates || null,
        client_name: client_name || "N/A",
        purpose: purpose || "Field Visit",
        visit_notes: visit_notes || "",
        visit_summary: visit_summary || "",
        distance_travelled: distance,
        expenses_json: expenses ? expenses : null,
        photos_json: currentPhotos,
        status: "Closed"
      });

      await logAudit({
        userId,
        action: "FIELD_VISIT_CLOSED",
        entity: "FieldVisit",
        entityId: activeVisit.id.toString(),
        details: `Employee closed field visit at client: ${client_name || "N/A"}. Total Distance: ${distance} km. Purpose: ${purpose || "Field Visit"}.`,
      });

      return NextResponse.json({
        success: true,
        message: "Field visit closed successfully.",
        data: activeVisit
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Error in POST /api/field-visit:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
