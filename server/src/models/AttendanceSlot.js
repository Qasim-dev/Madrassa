import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const attendanceSlotSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceCategory', required: true },
    code: { type: String, required: true, trim: true },
    label: { type: localizedSchema, required: true },
    sortOrder: { type: Number, default: 0 },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    dayOfWeek: [{ type: String, enum: ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] }],
    linkedTimetableSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeSlot', default: null },
    linkedSubjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tenantPlugin(attendanceSlotSchema);
attendanceSlotSchema.index({ tenantId: 1, categoryId: 1, code: 1, sessionId: 1 }, { unique: true });

export const AttendanceSlot = mongoose.model('AttendanceSlot', attendanceSlotSchema);
