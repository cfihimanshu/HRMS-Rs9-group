import mongoose, { Schema, Document } from "mongoose";

export interface IAssociatePerformance extends Document {
  evaluator: mongoose.Types.ObjectId; // User who submitted this (Admin/Manager)
  associateName: string; // Captured text or ref
  associateId?: mongoose.Types.ObjectId;
  territory: string;
  leads: number;
  conversion: number; // Percentage
  collectionPayout: string;
  complaint: number;
  reporting: number; // Percentage
  riskFlag: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssociatePerformanceSchema: Schema = new Schema(
  {
    evaluator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    associateName: { type: String, required: true },
    associateId: { type: Schema.Types.ObjectId, ref: "User" }, // Optional strict link
    territory: { type: String, required: true },
    leads: { type: Number, required: true },
    conversion: { type: Number, required: true },
    collectionPayout: { type: String, required: true },
    complaint: { type: Number, required: true },
    reporting: { type: Number, required: true },
    riskFlag: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.AssociatePerformance || mongoose.model<IAssociatePerformance>("AssociatePerformance", AssociatePerformanceSchema);
