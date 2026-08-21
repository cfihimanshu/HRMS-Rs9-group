// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Grievance, { ensureGrievanceSchema } from "@/models/sequelize/Grievance";
import User from "@/models/sequelize/User";
import { logAudit } from "@/lib/audit";
import { Op } from "sequelize";

// GET: Fetch all active grievances (Common / Public Feed for all authenticated users)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role || "";
    const isHrOrOwner = ["Owner", "Director", "IT Admin", "HR Head", "HR Executive"].some(r => role.toLowerCase().includes(r.toLowerCase()));

    await sequelize.authenticate();
    await User.sync();
    await ensureGrievanceSchema();

    // Common feed: all active grievances visible to everyone
    const query: any = { status: { [Op.ne]: "inactive" } };

    const items = await Grievance.findAll({ 
      where: query,
      order: [['createdAt', 'DESC']],
      raw: true
    });

    const userIds = [...new Set([
      ...items.map((i: any) => i.raisedBy),
      ...items.map((i: any) => i.assignedTo)
    ].filter(Boolean))];

    let userMap: any = {};
    if (userIds.length > 0) {
      const users = await User.findAll({ where: { id: { [Op.in]: userIds } }, raw: true });
      users.forEach((u: any) => {
        userMap[u.id] = { name: u.name, email: u.email, role: u.role };
      });
    }

    // Privacy Protection: Mask identities for anonymous submissions and replies
    const maskedItems = items.map((item: any) => {
      let rawMessages: any[] = [];
      if (Array.isArray(item.messages_json)) {
        rawMessages = [...item.messages_json];
      } else if (typeof item.messages_json === "string") {
        try {
          rawMessages = JSON.parse(item.messages_json);
        } catch (_) {
          rawMessages = [];
        }
      }

      // Always ensure the original problem description is at the start of the thread
      const hasInitial = rawMessages.some((m: any) => m.message === item.description || m.id?.startsWith("msg_init_"));
      if (!hasInitial && item.description) {
        const initMsg = {
          id: "msg_init_" + item.id,
          senderId: item.raisedBy,
          senderName: item.anonymous ? "Anonymous Colleague" : (userMap[item.raisedBy]?.name || "Employee"),
          senderRole: item.anonymous ? "Employee" : (userMap[item.raisedBy]?.role || "Employee"),
          isOfficial: false,
          message: item.description,
          createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
        };
        rawMessages.unshift(initMsg);
      }

      // Ensure existing official resolution is in the thread
      if (item.resolutionReport) {
        const hasRes = rawMessages.some((m: any) => m.message === item.resolutionReport || m.id?.startsWith("msg_res_") || (m.isOfficial && m.message === item.resolutionReport));
        if (!hasRes) {
          const resMsg = {
            id: "msg_res_" + item.id,
            senderId: item.assignedTo,
            senderName: userMap[item.assignedTo]?.name ? `Official Redressal (by ${userMap[item.assignedTo].name})` : "Official HR & Management Redressal",
            senderRole: userMap[item.assignedTo]?.role || "HR / Management",
            isOfficial: true,
            message: item.resolutionReport,
            createdAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : (item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString()),
          };
          if (rawMessages.length > 0 && rawMessages[0].id?.startsWith("msg_init_")) {
            rawMessages.splice(1, 0, resMsg);
          } else {
            rawMessages.push(resMsg);
          }
        }
      }

      // Format & mask messages according to roles
      const formattedMessages = rawMessages.map((m: any) => {
        if (!m.isOfficial && !isHrOrOwner) {
          return {
            ...m,
            senderName: "Anonymous Colleague",
            senderRole: "Employee",
          };
        }
        return m;
      });

      const doc = { 
        ...item,
        raisedBy: userMap[item.raisedBy] || null,
        assignedTo: userMap[item.assignedTo] || null,
        messages: formattedMessages
      };

      if (doc.anonymous && !isHrOrOwner) {
        doc.raisedBy = { name: "Anonymous Colleague", email: "hidden", role: "Employee" };
      } else if (doc.anonymous && isHrOrOwner) {
        // HR/Owners can see who raised it for auditing with clear auditable tag
        doc.raisedBy = { 
          name: `Anonymous [Auditable: ${(doc.raisedBy as any)?.name || "Unknown"}]`,
          email: (doc.raisedBy as any)?.email,
          role: (doc.raisedBy as any)?.role 
        };
      }
      return doc;
    });

    return NextResponse.json({ success: true, data: maskedItems });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Submit a new grievance ticket OR add reply/follow-up message to an existing thread
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || "Employee";
    const userRole = (session.user as any).role || "Employee";
    const isHrOrOwner = ["Owner", "Director", "IT Admin", "HR Head", "HR Executive", "Department Manager"].some(r => userRole.toLowerCase().includes(r.toLowerCase()));

    const body = await req.json();
    const { action, grievanceId, messageText, isOfficial, status, category, priority, anonymous, description } = body;

    await sequelize.authenticate();
    await ensureGrievanceSchema();

    // Case 1: Add a reply / follow-up message to an existing thread
    if (action === "reply" || (grievanceId && messageText)) {
      if (!grievanceId || !messageText || !messageText.trim()) {
        return NextResponse.json({ success: false, error: "Grievance ID and message text are required" }, { status: 400 });
      }

      const record = await Grievance.findByPk(grievanceId);
      if (!record) {
        return NextResponse.json({ success: false, error: "Grievance thread not found" }, { status: 404 });
      }

      let currentMessages: any[] = [];
      if (Array.isArray(record.messages_json)) {
        currentMessages = [...record.messages_json];
      } else if (typeof record.messages_json === "string") {
        try {
          currentMessages = JSON.parse(record.messages_json);
        } catch (_) {
          currentMessages = [];
        }
      }

      // Always ensure initial description is preserved in currentMessages
      const hasInitial = currentMessages.some((m: any) => m.message === record.description || m.id?.startsWith("msg_init_"));
      if (!hasInitial && record.description) {
        currentMessages.unshift({
          id: "msg_init_" + record.id,
          senderId: record.raisedBy,
          senderName: record.anonymous ? "Anonymous Colleague" : "Employee",
          senderRole: "Employee",
          isOfficial: false,
          message: record.description,
          createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
        });
      }

      // Preserve previous resolution report if not in currentMessages
      if (record.resolutionReport && !isOfficial) {
        const hasRes = currentMessages.some((m: any) => m.message === record.resolutionReport || m.id?.startsWith("msg_res_"));
        if (!hasRes) {
          currentMessages.push({
            id: "msg_res_" + record.id,
            senderId: record.assignedTo,
            senderName: "Official HR & Management Redressal",
            senderRole: "HR / Management",
            isOfficial: true,
            message: record.resolutionReport,
            createdAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
          });
        }
      }

      const isOfficialResponse = !!(isOfficial && isHrOrOwner);
      const newMsg = {
        id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        senderId: userId,
        senderName: isOfficialResponse ? userName : "Anonymous Colleague",
        senderRole: isOfficialResponse ? userRole : "Employee",
        isOfficial: isOfficialResponse,
        message: messageText.trim(),
        createdAt: new Date().toISOString(),
      };

      currentMessages.push(newMsg);
      record.messages_json = currentMessages;
      record.changed("messages_json", true);

      if (status) {
        record.status = status;
      }

      if (isOfficialResponse) {
        record.resolutionReport = messageText.trim();
        record.assignedTo = userId;
      }

      await record.save();

      await logAudit({
        userId,
        action: isOfficialResponse ? "GRIEVANCE_OFFICIAL_RESPONSE" : "GRIEVANCE_REPLIED",
        entity: "Grievance",
        entityId: String(record.id),
        details: isOfficialResponse
          ? `Official HR response sent to grievance #${record.id.slice(-4)} by ${userName}.`
          : `Reply added to grievance #${record.id.slice(-4)}.`,
      });

      return NextResponse.json({ success: true, data: record });
    }

    // Case 2: Create a new grievance ticket
    if (!category || !priority || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields (Category, Priority, Description)" }, { status: 400 });
    }

    const initialMessages = [
      {
        id: "msg_init_" + Date.now(),
        senderId: userId,
        senderName: anonymous ? "Anonymous Colleague" : userName,
        senderRole: anonymous ? "Employee" : userRole,
        isOfficial: false,
        message: description.trim(),
        createdAt: new Date().toISOString(),
      }
    ];

    const record = await Grievance.create({
      id: Date.now().toString(),
      raisedBy: userId,
      category,
      priority,
      anonymous: !!anonymous,
      description: description.trim(),
      messages_json: initialMessages,
      status: "Open",
    });

    await logAudit({
      userId,
      action: "GRIEVANCE_FILED",
      entity: "Grievance",
      entityId: (record as any).id ? (record as any).id.toString() : record.id,
      details: `Grievance ticket filed. Category: ${category}, Priority: ${priority}, Anonymous: ${!!anonymous}`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Grievance submission failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Resolve or update ticket status (HR & Managers only)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || "HR Management";
    const role = (session.user as any).role || "";
    const permitted = ["Owner", "Director", "IT Admin", "HR Head", "HR Executive", "Department Manager"];
    const isPermitted = permitted.some(p => role.toLowerCase().includes(p.toLowerCase()));
    if (!isPermitted) {
      return NextResponse.json({ success: false, error: "Forbidden: Management privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const { grievanceId, status, resolutionReport } = body;

    if (!grievanceId || !status) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    await sequelize.authenticate();
    await ensureGrievanceSchema();

    const record = await Grievance.findByPk(grievanceId);
    if (!record) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    record.status = status;
    if (resolutionReport && resolutionReport.trim()) {
      record.resolutionReport = resolutionReport.trim();

      let currentMessages: any[] = [];
      if (Array.isArray(record.messages_json)) {
        currentMessages = [...record.messages_json];
      } else if (typeof record.messages_json === "string") {
        try {
          currentMessages = JSON.parse(record.messages_json);
        } catch (_) {
          currentMessages = [];
        }
      }

      currentMessages.push({
        id: "msg_hr_" + Date.now(),
        senderId: userId,
        senderName: userName,
        senderRole: role,
        isOfficial: true,
        message: resolutionReport.trim(),
        createdAt: new Date().toISOString(),
      });
      record.messages_json = currentMessages;
      record.changed("messages_json", true);
    }
    record.assignedTo = userId;
    await record.save();

    await logAudit({
      userId,
      action: "GRIEVANCE_RESOLVED",
      entity: "Grievance",
      entityId: (record as any).id ? (record as any).id.toString() : record.id,
      details: `Grievance ticket ID ${record.id} updated to status ${status} by ${userName}`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Grievance update failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
