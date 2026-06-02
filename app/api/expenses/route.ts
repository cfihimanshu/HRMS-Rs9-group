import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Expense from "@/models/Expense";

// GET: Fetch Expenses
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const filter = (session.user as any).role === "Employee" ? { employee: (session.user as any).id } : {};
    
    const expenses = await Expense.find(filter)
      .populate("employee", "name email")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: expenses });
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

    await dbConnect();
    const { amount, category, dateIncurred, description, receiptUrl } = await req.json();

    if (!amount || !category || !dateIncurred || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const expense = await Expense.create({
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
