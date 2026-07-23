import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';
import { TEACHER_STATUSES } from '../constants/attendanceEnums.js';

const teacherAttendanceSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceCategory', default: null },
    date: { type: Date, required: true },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    gradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grade',
      default: null,
    },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSlot', default: null },
    period: { type: String, default: '' },
    status: {
      type: String,
      enum: TEACHER_STATUSES,
      default: 'present',
    },
    /** @deprecated use status — kept for backward compatibility */
    present: { type: Boolean, default: true },
    dutyType: { type: String, enum: ['teaching', 'admin', 'general', ''], default: '' },
    remarks: { type: String, default: '' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    source: { type: String, enum: ['manual', 'import', 'auto'], default: 'manual' },
  },
  { timestamps: true }
);

teacherAttendanceSchema.pre('save', function syncPresent(next) {
  if (this.isModified('status') || this.isNew) {
    this.present = this.status === 'present' || this.status === 'late';
  } else if (this.isModified('present') && !this.isModified('status')) {
    this.status = this.present ? 'present' : 'absent';
  }
  next();
});

tenantPlugin(teacherAttendanceSchema);
teacherAttendanceSchema.index({ tenantId: 1, date: 1, teacherId: 1 });
teacherAttendanceSchema.index({ tenantId: 1, date: 1, gradeId: 1 });
teacherAttendanceSchema.index({
  tenantId: 1,
  sessionId: 1,
  date: 1,
  categoryId: 1,
  teacherId: 1,
  slotId: 1,
  gradeId: 1,
});

export const TeacherAttendance = mongoose.model(
  'TeacherAttendance',
  teacherAttendanceSchema
);
