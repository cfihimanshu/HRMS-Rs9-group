import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  mobile?: string;
  role: string; // 1 of 15 roles
  companies: mongoose.Types.ObjectId[];
  companyName?: string;
  departmentName?: string;
  status: "active" | "inactive" | "probation" | "on notice";
  loginHistory: {
    ip: string;
    userAgent: string;
    timestamp: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String },
    mobile: { type: String, index: true },
    role: {
      type: String,
      required: true,
      enum: [
        "Owner",
        "Director",
        "HR Head",
        "HR Executive",
        "Department Manager",
        "DSM",
        "Trainer",
        "Accounts",
        "IT Admin",
        "Employee",
        "Business Associate",
        "Vendor",
        "Franchisee",
        "Territory Partner",
        "RIBP / Risk Officer",
      ],
      default: "Employee",
    },
    companies: [{ type: Schema.Types.ObjectId, ref: "Company" }],
    companyName: { type: String },
    departmentName: { type: String },
    status: { type: String, enum: ["active", "inactive", "probation", "on notice"], default: "active" },
    loginHistory: [
      {
        ip: { type: String },
        userAgent: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
