import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  user?: mongoose.Types.ObjectId; // User reference (can be null for anonymous or public candidate forms)
  action: string; // e.g. "CREATE_JOB", "SUBMIT_CANDIDATE", "APPROVE_ONBOARDING"
  entity: string; // e.g. "Job", "Candidate", "User"
  entityId?: string; // ID of the referenced object
  details: string; // Text summary or JSON data
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true, index: true },
  entity: { type: String, required: true, index: true },
  entityId: { type: String },
  details: { type: String, required: true },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
});

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
