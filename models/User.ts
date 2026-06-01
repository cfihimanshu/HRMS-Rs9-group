import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  mobile?: string;
  role: string; // 1 of 15 roles
  companies: mongoose.Types.ObjectId[];
  status: "active" | "inactive";
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
    status: { type: String, enum: ["active", "inactive"], default: "active" },
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
