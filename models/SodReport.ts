import mongoose, { Schema, Document } from "mongoose";

export interface ISodReport extends Document {
  employee: mongoose.Types.ObjectId; // User reference
  date: Date;
  plan: string; // Legacy
  taskSummary: string;
  taskType: string;
  callsPlanned: number;
  meetings: number;
  fieldVisits: number;
  target: string;
  remarks?: string;
  selfieUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const SodReportSchema: Schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true, index: true },
    plan: { type: String }, // Legacy
    taskSummary: { type: String, required: true },
    taskType: { type: String, required: true },
    callsPlanned: { type: Number, default: 0 },
    meetings: { type: Number, default: 0 },
    fieldVisits: { type: Number, default: 0 },
    target: { type: String },
    remarks: { type: String },
    selfieUrl: { type: String },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      timestamp: { type: Date },
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

SodReportSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.models.SodReport || mongoose.model<ISodReport>("SodReport", SodReportSchema);
