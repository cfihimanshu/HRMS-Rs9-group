import mongoose, { Schema, Document } from "mongoose";

export interface IProbation extends Document {
  employee: mongoose.Types.ObjectId; // User reference
  startDate: Date;
  endDate: Date;
  kpis: {
    kpiName: string;
    score: number; // 0-100
  }[];
  attendanceSummary: {
    totalDays: number;
    presentDays: number;
  };
  reportsSummary: {
    sodSubmitted: number;
    eodSubmitted: number;
  };
  feedback: string;
  status: "Confirm" | "Extend" | "Restrict role" | "Exit" | "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const ProbationSchema: Schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    kpis: [
      {
        kpiName: { type: String, required: true },
        score: { type: Number, min: 0, max: 100, required: true },
      },
    ],
    attendanceSummary: {
      totalDays: { type: Number, default: 0 },
      presentDays: { type: Number, default: 0 },
    },
    reportsSummary: {
      sodSubmitted: { type: Number, default: 0 },
      eodSubmitted: { type: Number, default: 0 },
    },
    feedback: { type: String },
    status: {
      type: String,
      enum: ["Confirm", "Extend", "Restrict role", "Exit", "active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Probation || mongoose.model<IProbation>("Probation", ProbationSchema);
