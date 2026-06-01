import mongoose, { Schema, Document } from "mongoose";

export interface ILeave extends Document {
  employee: mongoose.Types.ObjectId; // Reference to User
  type: "Casual Leave" | "Sick Leave" | "Earned Leave" | "Unpaid Leave";
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  approvedBy?: mongoose.Types.ObjectId; // Reference to User (Manager/HR)
  remarks?: string; // Manager's remarks
  attachmentUrl?: string; // e.g., Medical certificate for Sick Leave
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema: Schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { 
      type: String, 
      enum: ["Casual Leave", "Sick Leave", "Earned Leave", "Unpaid Leave"], 
      required: true 
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { 
      type: String, 
      enum: ["Pending", "Approved", "Rejected"], 
      default: "Pending" 
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    remarks: { type: String },
    attachmentUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Leave || mongoose.model<ILeave>("Leave", LeaveSchema);
