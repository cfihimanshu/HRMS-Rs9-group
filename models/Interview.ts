import mongoose, { Schema, Document } from "mongoose";

export interface IInterview extends Document {
  candidate: mongoose.Types.ObjectId;
  candidateName?: string;
  round: number; // 1, 2, or 3
  scheduleTime: Date;
  videoLink?: string;
  mode?: "online" | "offline";
  vacancyName?: string;
  interviewer?: mongoose.Types.ObjectId; // User reference
  communicationScore?: number;
  skillScore?: number;
  behaviourScore?: number;
  stabilityScore?: number;
  riskScore?: number;
  remarks?: string;
  status: "Pending" | "Selected" | "Hold" | "Rejected" | "High Risk" | "inactive";
  customQuestions?: { question: string; isCorrect: boolean | null; rating?: string; score?: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema: Schema = new Schema(
  {
    candidate: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
    candidateName: { type: String },
    round: { type: Number, required: true, enum: [1, 2, 3] },
    scheduleTime: { type: Date, required: true },
    videoLink: { type: String },
    mode: { type: String, enum: ["online", "offline"], default: "online" },
    vacancyName: { type: String },
    interviewer: { type: Schema.Types.ObjectId, ref: "User" },
    communicationScore: { type: Number, min: 0, max: 100 },
    skillScore: { type: Number, min: 0, max: 100 },
    behaviourScore: { type: Number, min: 0, max: 100 },
    stabilityScore: { type: Number, min: 0, max: 100 },
    riskScore: { type: Number, min: 0, max: 100 },
    remarks: { type: String },
    status: {
      type: String,
      enum: ["Pending", "Selected", "Hold", "Rejected", "High Risk", "inactive"],
      default: "Pending",
    },
    customQuestions: [
      {
        question: { type: String, required: true },
        isCorrect: { type: Boolean, default: null },
        rating: { type: String, default: "" },
        score: { type: Number, default: 0 }
      }
    ],
  },
  { timestamps: true }
);

if (mongoose.models && (mongoose.models as any).Interview) {
  delete (mongoose.models as any).Interview;
}
export default mongoose.model<IInterview>("Interview", InterviewSchema);
