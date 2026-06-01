import mongoose, { Schema, Document } from "mongoose";

export interface IVendorRegistration extends Document {
  registeredBy: mongoose.Types.ObjectId; // User who submitted this
  vendorName: string;
  category: string;
  contact: string;
  panGst: string;
  serviceType: string;
  agreementUrl: string; // Cloudinary URL
  paymentTerms: string;
  riskLevel: "Low" | "Medium" | "High";
  createdAt: Date;
  updatedAt: Date;
}

const VendorRegistrationSchema: Schema = new Schema(
  {
    registeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    vendorName: { type: String, required: true },
    category: { type: String, required: true },
    contact: { type: String, required: true },
    panGst: { type: String, required: true },
    serviceType: { type: String, required: true },
    agreementUrl: { type: String, required: true },
    paymentTerms: { type: String, required: true },
    riskLevel: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
  },
  { timestamps: true }
);

export default mongoose.models.VendorRegistration || mongoose.model<IVendorRegistration>("VendorRegistration", VendorRegistrationSchema);
