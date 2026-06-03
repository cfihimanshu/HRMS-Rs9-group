import mongoose, { Schema, Document } from "mongoose";

export interface IHRRecentActivity extends Document {
  user: mongoose.Types.ObjectId;
  action: string;
  details: string;
  timestamp: Date;
}

const HRRecentActivitySchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

if (mongoose.models && (mongoose.models as any).HRRecentActivity) {
  delete (mongoose.models as any).HRRecentActivity;
}

export default mongoose.model<IHRRecentActivity>("HRRecentActivity", HRRecentActivitySchema);
