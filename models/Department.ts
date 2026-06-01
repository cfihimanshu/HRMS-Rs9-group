import mongoose, { Schema, Document } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  company: mongoose.Types.ObjectId;
  status: "active" | "inactive";
}

const DepartmentSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.Department || mongoose.model<IDepartment>("Department", DepartmentSchema);
