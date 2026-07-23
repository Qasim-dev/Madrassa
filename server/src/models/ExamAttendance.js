import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';
import { EXAM_ATTENDANCE_STATUS } from '../constants/examEnums.js';

const SALAH_STATUS = ['', 'present', 'absent', 'excused'];

const salahAttendanceSchema = new mongoose.Schema(
  {
    fajr: { type: String, enum: SALAH_STATUS, default: '' },
    zuhr: { type: String, enum: SALAH_STATUS, default: '' },
    asr: { type: String, enum: SALAH_STATUS, default: '' },
    maghrib: { type: String, enum: SALAH_STATUS, default: '' },
    isha: { type: String, enum: SALAH_STATUS, default: '' },
  },
  { _id: false }
);

const examAttendanceSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamContainer',
      required: true,
    },
    darjahId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Darjah',
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    studentSnapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamStudentSnapshot',
      required: true,
    },
    status: {
      type: String,
      enum: EXAM_ATTENDANCE_STATUS,
      default: 'present',
    },
    /** نماز کی حاضری — per prayer */
    salahAttendance: {
      type: salahAttendanceSchema,
      default: () => ({}),
    },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

tenantPlugin(examAttendanceSchema);
examAttendanceSchema.index(
  { tenantId: 1, sessionId: 1, examId: 1, darjahId: 1, sectionId: 1, studentSnapshotId: 1 },
  { unique: true }
);
examAttendanceSchema.index({ tenantId: 1, examId: 1, darjahId: 1, sectionId: 1 });

export const ExamAttendance = mongoose.model('ExamAttendance', examAttendanceSchema);
