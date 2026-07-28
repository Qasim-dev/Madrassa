import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const teacherAssignmentSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    darjahId: { type: mongoose.Schema.Types.ObjectId, ref: 'Darjah', default: null },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectBook', default: null },
  },
  { _id: true }
);

const teacherSchema = new mongoose.Schema(
  {
    name: { type: localizedSchema, required: true },
    parentage: { type: localizedSchema, default: () => ({}) },
    idCard: { type: String, default: '' },
    phone: { type: String, default: '' },
    maritalStatus: { type: String, enum: ['', 'single', 'married', 'widowed', 'divorced'], default: '' },
    dateOfBirth: { type: Date, default: null },
    country: { type: localizedSchema, default: () => ({}) },
    state: { type: localizedSchema, default: () => ({}) },
    cityLoc: { type: localizedSchema, default: () => ({}) },
    addressCurrent: { type: localizedSchema, default: () => ({}) },
    addressPermanent: { type: localizedSchema, default: () => ({}) },
    districtCurrent: { type: localizedSchema, default: () => ({}) },
    districtPermanent: { type: localizedSchema, default: () => ({}) },
    deeniTaleem: { type: String, default: '' },
    asriTaleem: { type: String, default: '' },
    extraSkills: { type: String, default: '' },
    jobStartDate: { type: Date, default: null },
    jobEndDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'inactive', 'leave'],
      default: 'active',
    },
    assignments: [teacherAssignmentSchema],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleteReason: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

tenantPlugin(teacherSchema);
teacherSchema.index({ tenantId: 1, status: 1 });
teacherSchema.index({ tenantId: 1, 'assignments.sessionId': 1 });
teacherSchema.index({ tenantId: 1, isDeleted: 1, deletedAt: -1 });

export const Teacher = mongoose.model('Teacher', teacherSchema);
