import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";

export const dynamic = "force-dynamic";

// GET: Fetch all users in the current session user's company
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await sequelize.authenticate();

    // Get current user to find their companies array from DB (session may not have it)
    const currentUser = await User.findOne({ where: { id: userId }, raw: true }) as any;
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const userRole = (session.user as any).role || "Employee";

    // Fetch all users
    const allUsers = await User.findAll({
      attributes: ["id", "name", "role", "email", "companies"],
      raw: true,
    }) as any[];

    if (userRole === "Owner") {
      const mapped = allUsers.map((u: any) => ({
        id: u.id,
        name: u.name || "Unknown",
        role: u.role || "Employee",
        email: u.email || "",
      }));
      return NextResponse.json({ success: true, data: mapped });
    }

    // Parse companies array (stored as JSON in DB)
    let userCompanies: string[] = [];
    try {
      const raw = currentUser.companies;
      if (raw) {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        userCompanies = Array.isArray(parsed) ? parsed.map(String) : [];
      }
    } catch (e) {
      userCompanies = [];
    }

    // If user has no company assigned, return empty
    if (userCompanies.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const companyUsers = allUsers
      .filter((u: any) => {
        if (u.id === userId) return false; // exclude self for forwarding
        let uCompanies: string[] = [];
        try {
          const raw = u.companies;
          if (raw) {
            const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
            uCompanies = Array.isArray(parsed) ? parsed.map(String) : [];
          }
        } catch { uCompanies = []; }
        // Check if any company ID matches
        return uCompanies.some((c: string) => userCompanies.includes(c));
      })
      .map((u: any) => ({
        id: u.id,
        name: u.name || "Unknown",
        role: u.role || "Employee",
        email: u.email || "",
      }));

    return NextResponse.json({ success: true, data: companyUsers });
  } catch (error: any) {
    console.error("[company-users] CRITICAL ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
