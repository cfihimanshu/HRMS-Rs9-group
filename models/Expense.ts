import mongoose, { Schema, Document } from "mongoose";

export interface IExpense extends Document {
  employee: mongoose.Types.ObjectId; // Reference to User
  amount: number;
  category: "Travel" | "Food" | "Office Supplies" | "Internet" | "Other";
  dateIncurred: Date;
  description: string;
  receiptUrl?: string; // Cloudinary URL
  status: "Pending" | "Approved" | "Rejected" | "Reimbursed";
  approvedBy?: mongoose.Types.ObjectId; // Reference to User (Manager/Accounts)
  remarks?: string; // Approver's remarks
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    category: { 
      type: String, 
      enum: ["Travel", "Food", "Office Supplies", "Internet", "Other"], 
      required: true 
    },
    dateIncurred: { type: Date, required: true },
    description: { type: String, required: true },
    receiptUrl: { type: String },
    status: { 
      type: String, 
      enum: ["Pending", "Approved", "Rejected", "Reimbursed"], 
      default: "Pending" 
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    remarks: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
