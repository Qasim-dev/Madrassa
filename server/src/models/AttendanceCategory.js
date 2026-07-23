import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const attendanceCategorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: { type: localizedSchema, required: true },
    subjectType: { type: String, enum: ['student', 'teacher', 'both'], default: 'student' },
    slotMode: { type: String, enum: ['timetable', 'fixed_slots', 'adhoc'], default: 'fixed_slots' },
    statusOptions: [{ type: String }],
    requiresGrade: { type: Boolean, default: true },
    requiresSlot: { type: Boolean, default: true },
    affectsSalary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tenantPlugin(attendanceCategorySchema);
attendanceCategorySchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const AttendanceCategory = mongoose.model('AttendanceCategory', attendanceCategorySchema);
