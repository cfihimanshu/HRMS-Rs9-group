import mongoose, { Schema, Document } from "mongoose";

export interface IRole extends Document {
  name: string;
  permissions: string[];
  status: "active" | "inactive";
  companies?: mongoose.Types.ObjectId[];
}

const RoleSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    permissions: [{ type: String }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    companies: [{ type: Schema.Types.ObjectId, ref: "Company" }]
  },
  { timestamps: true }
);

export default mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);
