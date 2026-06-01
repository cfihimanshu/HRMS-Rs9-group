import mongoose, { Schema, Document } from "mongoose";

export interface IOnboarding extends Document {
  candidate: mongoose.Types.ObjectId;
  category: "Staff" | "Associate" | "Vendor" | "Franchise";
  generatedDocs: {
    name: string; // "Offer Letter", "NDA", etc.
    url: string;  // Path or URL to file
    generatedAt: Date;
  }[];
  signedDocs: {
    name: string;
    url: string;
    signedAt: Date;
  }[];
  status: "Pending" | "Completed" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const OnboardingSchema: Schema = new Schema(
  {
    candidate: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
    category: { type: String, enum: ["Staff", "Associate", "Vendor", "Franchise"], required: true },
    generatedDocs: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        generatedAt: { type: Date, default: Date.now },
      },
    ],
    signedDocs: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        signedAt: { type: Date, default: Date.now },
      },
    ],
    status: { type: String, enum: ["Pending", "Completed", "inactive"], default: "Pending" },
  },
  { timestamps: true }
);

export default mongoose.models.Onboarding || mongoose.model<IOnboarding>("Onboarding", OnboardingSchema);
