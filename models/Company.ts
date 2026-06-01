import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  code: string;
  address?: string;
  status: "active" | "inactive";
}

const CompanySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    address: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema);
