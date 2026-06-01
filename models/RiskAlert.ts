import mongoose, { Schema, Document } from "mongoose";

export interface IRiskAlert extends Document {
  source: string; // "candidate" | "employee" | "financial" | "data" | etc.
  level: "Low" | "Medium" | "High" | "Critical";
  description: string;
  triggeredBy?: mongoose.Types.ObjectId; // User reference
  status: "Open" | "Investigating" | "Resolved" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const RiskAlertSchema: Schema = new Schema(
  {
    source: { type: String, required: true },
    level: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    description: { type: String, required: true },
    triggeredBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["Open", "Investigating", "Resolved", "inactive"], default: "Open" },
  },
  { timestamps: true }
);

export default mongoose.models.RiskAlert || mongoose.model<IRiskAlert>("RiskAlert", RiskAlertSchema);
