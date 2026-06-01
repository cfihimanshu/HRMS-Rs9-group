import mongoose, { Schema, Document } from "mongoose";

export interface IEodReport extends Document {
  employee: mongoose.Types.ObjectId; // User reference
  date: Date;
  completedWork: string;
  pendingWork: string;
  issues: string;
  escalationNeeded: boolean;
  tomorrowPlan: string;
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

const EodReportSchema: Schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true, index: true },
    completedWork: { type: String, required: true },
    pendingWork: { type: String, required: true },
    issues: { type: String },
    escalationNeeded: { type: Boolean, default: false },
    tomorrowPlan: { type: String, required: true },
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

EodReportSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.models.EodReport || mongoose.model<IEodReport>("EodReport", EodReportSchema);
