import mongoose, { Schema, Document } from "mongoose";

export interface ITraining extends Document {
  candidate: mongoose.Types.ObjectId;
  trainer?: mongoose.Types.ObjectId; // User reference
  status: "Orientation" | "3 Days Training" | "Daily Assessment" | "Final Status" | "Activation" | "inactive";
  assessments: {
    dayNumber: number; // 1, 2, 3
    sopScore: number;
    crmScore: number;
    reportingScore: number;
    behaviourScore: number;
    remarks: string;
    date: Date;
  }[];
  recommendation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrainingSchema: Schema = new Schema(
  {
    candidate: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
    trainer: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["Orientation", "3 Days Training", "Daily Assessment", "Final Status", "Activation", "inactive"],
      default: "Orientation",
    },
    assessments: [
      {
        dayNumber: { type: Number, required: true },
        sopScore: { type: Number, min: 0, max: 100, required: true },
        crmScore: { type: Number, min: 0, max: 100, required: true },
        reportingScore: { type: Number, min: 0, max: 100, required: true },
        behaviourScore: { type: Number, min: 0, max: 100, required: true },
        remarks: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
    recommendation: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Training || mongoose.model<ITraining>("Training", TrainingSchema);
