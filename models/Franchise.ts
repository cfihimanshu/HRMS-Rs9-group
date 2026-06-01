import mongoose, { Schema, Document } from "mongoose";

export interface IFranchise extends Document {
  user: mongoose.Types.ObjectId; // User reference
  territory: mongoose.Types.ObjectId; // Territory reference
  agreementUrl?: string;
  revenueSharing: string;
  leadsGenerated: number;
  reportsSubmitted: number;
  brandingCompliance: "Compliant" | "Non-Compliant";
  territoryRisk: "Low" | "Medium" | "High";
  complaintsCount: number;
  escalationsCount: number;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const FranchiseSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    territory: { type: Schema.Types.ObjectId, ref: "Territory", required: true },
    agreementUrl: { type: String },
    revenueSharing: { type: String, required: true },
    leadsGenerated: { type: Number, default: 0 },
    reportsSubmitted: { type: Number, default: 0 },
    brandingCompliance: { type: String, enum: ["Compliant", "Non-Compliant"], default: "Compliant" },
    territoryRisk: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
    complaintsCount: { type: Number, default: 0 },
    escalationsCount: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.Franchise || mongoose.model<IFranchise>("Franchise", FranchiseSchema);
