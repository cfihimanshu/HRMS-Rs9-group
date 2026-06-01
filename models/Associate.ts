import mongoose, { Schema, Document } from "mongoose";

export interface IAssociate extends Document {
  user: mongoose.Types.ObjectId; // User reference
  territory?: string;
  leadsGenerated: number;
  conversionRate: number;
  payoutTerms: string;
  reportingDiscipline: number;
  complaintRatio: number;
  clientFeedback: number;
  riskScore: number; // 0-100
  exitRisk: "Low" | "Medium" | "High";
  flags: ("side settlement" | "personal payment" | "client diversion" | "territory capture" | "fake commitment" | "competitor link")[];
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const AssociateSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    territory: { type: String },
    leadsGenerated: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    payoutTerms: { type: String, required: true },
    reportingDiscipline: { type: Number, min: 0, max: 100, default: 100 },
    complaintRatio: { type: Number, min: 0, max: 100, default: 0 },
    clientFeedback: { type: Number, min: 0, max: 100, default: 100 },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    exitRisk: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
    flags: [
      {
        type: String,
        enum: [
          "side settlement",
          "personal payment",
          "client diversion",
          "territory capture",
          "fake commitment",
          "competitor link",
        ],
      },
    ],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.Associate || mongoose.model<IAssociate>("Associate", AssociateSchema);
