import mongoose, { Schema, Document } from "mongoose";

export interface IVendor extends Document {
  user: mongoose.Types.ObjectId; // User reference
  category:
    | "Advocate"
    | "CA/CS"
    | "Hotel/Guest House"
    | "Tiffin/Catering"
    | "IT"
    | "CCTV"
    | "Property Broker"
    | "Local Field Agent"
    | "Influencer"
    | "Reporter"
    | "Courier/Cab/Delivery"
    | "Printing/Stationery/Hardware";
  agreementUrl?: string;
  serviceType?: string;
  paymentTerms: string;
  riskCategory: "Low" | "Medium" | "High";
  performanceScore: number; // 0-100
  complaintsCount: number;
  renewalDate?: Date;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    category: {
      type: String,
      enum: [
        "Advocate",
        "CA/CS",
        "Hotel/Guest House",
        "Tiffin/Catering",
        "IT",
        "CCTV",
        "Property Broker",
        "Local Field Agent",
        "Influencer",
        "Reporter",
        "Courier/Cab/Delivery",
        "Printing/Stationery/Hardware",
      ],
      required: true,
    },
    agreementUrl: { type: String },
    serviceType: { type: String },
    paymentTerms: { type: String, required: true },
    riskCategory: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
    performanceScore: { type: Number, min: 0, max: 100, default: 100 },
    complaintsCount: { type: Number, default: 0 },
    renewalDate: { type: Date },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", VendorSchema);
