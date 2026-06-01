import mongoose, { Schema, Document } from "mongoose";

export interface IGrievance extends Document {
  raisedBy: mongoose.Types.ObjectId; // User reference
  category: string;
  priority: "Low" | "Medium" | "High";
  anonymous: boolean;
  description: string;
  assignedTo?: mongoose.Types.ObjectId; // User reference (HR / Manager)
  status: "Open" | "In-Progress" | "Resolved" | "inactive";
  resolutionReport?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GrievanceSchema: Schema = new Schema(
  {
    raisedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    anonymous: { type: Boolean, default: false },
    description: { type: String, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["Open", "In-Progress", "Resolved", "inactive"], default: "Open" },
    resolutionReport: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Grievance || mongoose.model<IGrievance>("Grievance", GrievanceSchema);
