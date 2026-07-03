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
    console.log("[company-users] userId:", userId);
    await sequelize.authenticate();

    // Get current user to find their companies array from DB (session may not have it)
    const currentUser = await User.findOne({ where: { id: userId }, raw: true }) as any;
    if (!currentUser) {
      console.log("[company-users] currentUser not found for ID:", userId);
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    console.log("[company-users] currentUser companies:", currentUser.companies);

    // Parse companies array (stored as JSON in DB)
    let userCompanies: string[] = [];
    try {
      const raw = currentUser.companies;
      if (raw) {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        userCompanies = Array.isArray(parsed) ? parsed.map(String) : [];
      }
    } catch (e) {
      console.log("[company-users] parse error for currentUser companies:", e);
      userCompanies = [];
    }

    console.log("[company-users] parsed userCompanies:", userCompanies);

    // If user has no company assigned, return empty
    if (userCompanies.length === 0) {
      console.log("[company-users] user has no companies assigned");
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch all users and filter those sharing at least one company
    const allUsers = await User.findAll({
      attributes: ["id", "name", "role", "email", "companies"],
      raw: true,
    }) as any[];

    console.log("[company-users] total users in system:", allUsers.length);

    const companyUsers = allUsers
      .filter((u: any) => {
        if (u.id === userId) return false; // exclude self
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

    console.log("[company-users] returning users:", companyUsers);

    return NextResponse.json({ success: true, data: companyUsers });
  } catch (error: any) {
    console.error("[company-users] CRITICAL ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
