import mongoose, { Schema, Document } from "mongoose";

export interface ITaskLog extends Document {
  employee: mongoose.Types.ObjectId; // User reference
  date: Date;
  taskTitle: string;
  taskType: string;
  description: string;
  status: "Pending" | "In Progress" | "Completed";
  createdAt: Date;
  updatedAt: Date;
}

const TaskLogSchema: Schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true, index: true },
    taskTitle: { type: String, required: true },
    taskType: { type: String, required: true },
    description: { type: String },
    progressNotes: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Completed" },
  },
  { timestamps: true }
);

// We don't enforce unique constraint on employee+date because they can have multiple tasks per day
TaskLogSchema.index({ employee: 1, date: 1 });

export default mongoose.models.TaskLog || mongoose.model<ITaskLog>("TaskLog", TaskLogSchema);
