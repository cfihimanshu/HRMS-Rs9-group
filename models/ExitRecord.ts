import mongoose, { Schema, Document } from "mongoose";

export interface IExitRecord extends Document {
  employee: mongoose.Types.ObjectId; // User reference
  exitReason: string;
  assetsReturned: boolean;
  accessRevoked: boolean;
  ndaReminder: boolean;
  dataAudit: boolean;
  clientTransfer: boolean;
  postExitWatch: boolean;
  finalSettlementStatus: "Pending" | "Completed" | "Hold";
  exitInterviewNotes?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const ExitRecordSchema: Schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    exitReason: { type: String, required: true },
    assetsReturned: { type: Boolean, default: false },
    accessRevoked: { type: Boolean, default: false },
    ndaReminder: { type: Boolean, default: false },
    dataAudit: { type: Boolean, default: false },
    clientTransfer: { type: Boolean, default: false },
    postExitWatch: { type: Boolean, default: false },
    finalSettlementStatus: { type: String, enum: ["Pending", "Completed", "Hold"], default: "Pending" },
    exitInterviewNotes: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.ExitRecord || mongoose.model<IExitRecord>("ExitRecord", ExitRecordSchema);
