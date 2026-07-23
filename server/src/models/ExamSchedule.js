import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const examScheduleSchema = new mongoose.Schema(
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
    subjectMappingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSubjectMapping',
      required: true,
    },
    examDate: { type: Date, required: true },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    room: { type: String, default: '' },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
  },
  { timestamps: true }
);

tenantPlugin(examScheduleSchema);
examScheduleSchema.index({ tenantId: 1, sessionId: 1, examId: 1, darjahId: 1, examDate: 1 });
examScheduleSchema.index({ tenantId: 1, examId: 1, subjectMappingId: 1 });

export const ExamSchedule = mongoose.model('ExamSchedule', examScheduleSchema);
