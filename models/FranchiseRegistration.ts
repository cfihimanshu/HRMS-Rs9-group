import mongoose, { Schema, Document } from "mongoose";

export interface IFranchiseRegistration extends Document {
  registeredBy: mongoose.Types.ObjectId; // User who submitted this
  partnerName: string;
  territory: string;
  brandProject: string;
  agreementUrl: string; // Cloudinary URL
  revenueShare: string;
  reportingPerson: string;
  riskLevel: "Low" | "Medium" | "High";
  status: "Active" | "Inactive" | "Pending";
  createdAt: Date;
  updatedAt: Date;
}

const FranchiseRegistrationSchema: Schema = new Schema(
  {
    registeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    partnerName: { type: String, required: true },
    territory: { type: String, required: true },
    brandProject: { type: String, required: true },
    agreementUrl: { type: String, required: true },
    revenueShare: { type: String, required: true },
    reportingPerson: { type: String, required: true },
    riskLevel: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
    status: { type: String, enum: ["Active", "Inactive", "Pending"], default: "Pending" },
  },
  { timestamps: true }
);

export default mongoose.models.FranchiseRegistration || mongoose.model<IFranchiseRegistration>("FranchiseRegistration", FranchiseRegistrationSchema);
