import mongoose, { Schema, Document } from "mongoose";

type CheckStatus = "Pending" | "Verified" | "Hold" | "Rejected" | "High Risk";

export interface IVerification extends Document {
  candidate: mongoose.Types.ObjectId;
  aadhaarStatus: CheckStatus;
  panStatus: CheckStatus;
  addressStatus: CheckStatus;
  employerStatus: CheckStatus;
  referencesStatus: CheckStatus;
  cibilStatus: CheckStatus;
  bankStatus: CheckStatus;
  policeStatus: CheckStatus;
  socialMediaStatus: CheckStatus;
  remarks?: string;
  status: "Pending" | "Verified" | "Hold" | "Rejected" | "High Risk" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const VerificationSchema: Schema = new Schema(
  {
    candidate: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
    aadhaarStatus: { type: String, enum: ["Pending", "Verified", "Hold", "Rejected", "High Risk"], default: "Pending" },
    panStatus: { type: String, enum: ["Pending", "Verified", "Hold", "Rejected", "High Risk"], default: "Pending" },
    addressStatus: { type: String, enum: ["Pending", "Verified", "Hold", "Rejected", "High Risk"], default: "Pending" },
    employerStatus: { type: String, enum: ["Pending", "Verified", "Hold", "Rejected", "High Risk"], default: "Pending" },
    referencesStatus: { type: String, enum: ["Pending", "Verified", "Hold", "Rejected", "High Risk"], default: "Pending" },
    cibilStatus: { type: String, enum: ["Pending", "Verified", "Hold", "Rejected", "High Risk"], default: "Pending" },
    bankStatus: { type: String, enum: ["Pending", "Verified", "Hold", "Rejected", "High Risk"], default: "Pending" },
    policeStatus: { type: String, enum: ["Pending", "Verified", "Hold", "Rejected", "High Risk"], default: "Pending" },
    socialMediaStatus: { type: String, enum: ["Pending", "Verified", "Hold", "Rejected", "High Risk"], default: "Pending" },
    remarks: { type: String },
    status: {
      type: String,
      enum: ["Pending", "Verified", "Hold", "Rejected", "High Risk", "inactive"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Verification || mongoose.model<IVerification>("Verification", VerificationSchema);
