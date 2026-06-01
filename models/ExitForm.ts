import mongoose, { Schema, Document } from "mongoose";

export interface IExitForm extends Document {
  submittedBy: mongoose.Types.ObjectId; // User who submitted this
  name: string;
  category: "Employee" | "Associate" | "Vendor";
  exitReason: string;
  assetReturn: boolean;
  accessRevoke: boolean;
  handover: boolean;
  finalSettlement: boolean;
  exitFeedback: string;
  postExitRisk: "Low" | "Medium" | "High";
  createdAt: Date;
  updatedAt: Date;
}

const ExitFormSchema: Schema = new Schema(
  {
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    category: { type: String, enum: ["Employee", "Associate", "Vendor"], required: true },
    exitReason: { type: String, required: true },
    assetReturn: { type: Boolean, default: false },
    accessRevoke: { type: Boolean, default: false },
    handover: { type: Boolean, default: false },
    finalSettlement: { type: Boolean, default: false },
    exitFeedback: { type: String },
    postExitRisk: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
  },
  { timestamps: true }
);

export default mongoose.models.ExitForm || mongoose.model<IExitForm>("ExitForm", ExitFormSchema);
