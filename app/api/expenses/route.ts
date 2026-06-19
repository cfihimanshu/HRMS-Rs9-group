import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import Expense from "@/models/sequelize/Expense";

// GET: Fetch Expenses
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();

    const filter = (session.user as any).role === "Employee" ? { employee: (session.user as any).id } : {};
    
    const expenses = await Expense.findAll({ 
      where: filter,
      order: [['createdAt', 'DESC']]
    });

    const userIds = Array.from(new Set([
      ...expenses.map(e => (e as any).employee).filter(Boolean),
      ...expenses.map(e => (e as any).approvedBy).filter(Boolean)
    ]));

    const users = await User.findAll({
      where: { mongo_id: userIds },
      attributes: ['mongo_id', 'name', 'email']
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.mongo_id] = u.toJSON();
      return acc;
    }, {});

    const data = expenses.map(e => {
      const eJson = e.toJSON() as any;
      eJson.employee = userMap[eJson.employee] || null;
      eJson.approvedBy = userMap[eJson.approvedBy] || null;
      return eJson;
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Submit a new Expense Claim
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    const { amount, category, dateIncurred, description, receiptUrl } = await req.json();

    if (!amount || !category || !dateIncurred || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const expense = await Expense.create({
      mongo_id: Date.now().toString(),
      employee: (session.user as any).id,
      amount,
      category,
      dateIncurred,
      description,
      receiptUrl,
      status: "Pending"
    });

    return NextResponse.json({ success: true, data: expense });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
