import mongoose, { Schema, Document } from "mongoose";

export interface ITerritory extends Document {
  name: string;
  assignedTo?: mongoose.Types.ObjectId; // User reference (e.g. Territory Partner)
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const TerritorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.Territory || mongoose.model<ITerritory>("Territory", TerritorySchema);
