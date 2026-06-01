import mongoose, { Schema, Document } from "mongoose";

export interface IPayroll extends Document {
  employee: mongoose.Types.ObjectId; // Reference to User
  month: string; // e.g., "January"
  year: number; // e.g., 2026
  
  // Earnings
  basicPay: number;
  hra: number;
  conveyance: number;
  specialAllowance: number;
  bonus?: number;
  totalEarnings: number;
  
  // Deductions
  pfDeduction: number;
  esiDeduction: number;
  ptDeduction: number; // Professional Tax
  tdsDeduction: number;
  lossOfPay?: number; // based on unpaid leaves
  totalDeductions: number;
  
  netPay: number;
  
  status: "Draft" | "Processed" | "Paid";
  paymentDate?: Date;
  transactionRef?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema: Schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    
    basicPay: { type: Number, required: true },
    hra: { type: Number, required: true },
    conveyance: { type: Number, required: true },
    specialAllowance: { type: Number, required: true },
    bonus: { type: Number, default: 0 },
    totalEarnings: { type: Number, required: true },
    
    pfDeduction: { type: Number, required: true },
    esiDeduction: { type: Number, required: true },
    ptDeduction: { type: Number, required: true },
    tdsDeduction: { type: Number, required: true },
    lossOfPay: { type: Number, default: 0 },
    totalDeductions: { type: Number, required: true },
    
    netPay: { type: Number, required: true },
    
    status: { type: String, enum: ["Draft", "Processed", "Paid"], default: "Draft" },
    paymentDate: { type: Date },
    transactionRef: { type: String },
  },
  { timestamps: true }
);

// Ensure only one payslip per employee per month/year
PayrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.Payroll || mongoose.model<IPayroll>("Payroll", PayrollSchema);
