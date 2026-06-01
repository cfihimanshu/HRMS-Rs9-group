import mongoose, { Schema, Document } from "mongoose";

export interface IAttendance extends Document {
  employee: mongoose.Types.ObjectId; // User reference
  date: Date;
  status: "Present" | "Absent" | "Leave" | "inactive";
  checkIn?: Date;
  checkOut?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: ["Present", "Absent", "Leave", "inactive"], default: "Present" },
    checkIn: { type: Date },
    checkOut: { type: Date },
  },
  { timestamps: true }
);

// Unique index to ensure one attendance record per employee per day
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema);
