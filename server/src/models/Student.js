import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const guardianRowSchema = new mongoose.Schema(
  {
    name: { type: localizedSchema, default: () => ({}) },
    relation: { type: localizedSchema, default: () => ({}) },
    profession: { type: String, default: '' },
    phone: { type: String, default: '' },
    idCard: { type: String, default: '' },
    address: { type: localizedSchema, default: () => ({}) },
  },
  { _id: true }
);

const previousSchoolRowSchema = new mongoose.Schema(
  {
    year: { type: String, default: '' },
    grade: { type: String, default: '' },
    institute: { type: String, default: '' },
    marks: { type: String, default: '' },
    result: { type: String, default: '' },
  },
  { _id: true }
);

const lessonTrackRowSchema = new mongoose.Schema(
  {
    para: { type: Number, required: true, min: 1, max: 30 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { _id: true }
);

const studentSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    studentId: { type: String, required: true, trim: true },
    name: { type: localizedSchema, required: true },
    gradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grade',
      default: null,
    },
    /** Tartibat-driven bindings (new flow) */
    darjahId: { type: mongoose.Schema.Types.ObjectId, ref: 'Darjah', default: null },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    /** Primary book (legacy); kept in sync with first entry in bookIds */
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectBook', default: null },
    /** Multiple assigned curriculum books (کتب) */
    bookIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubjectBook' }],
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    fatherName: { type: localizedSchema, default: () => ({}) },
    gender: { type: String, enum: ['', 'male', 'female'], default: '' },
    idCard: { type: String, default: '' },
    dateOfBirth: { type: Date, default: null },
    phone: { type: String, default: '' },
    /** Legacy searchable city string (kept for backward compatibility) */
    city: { type: String, default: '' },
    /** Copies of Tartibat rows (Urdu/English) chosen in the student form */
    country: { type: localizedSchema, default: () => ({}) },
    state: { type: localizedSchema, default: () => ({}) },
    cityLoc: { type: localizedSchema, default: () => ({}) },
    districtCurrent: { type: localizedSchema, default: () => ({}) },
    districtPermanent: { type: localizedSchema, default: () => ({}) },
    addressCurrent: { type: localizedSchema, default: () => ({}) },
    addressPermanent: { type: localizedSchema, default: () => ({}) },
    classTypeLabel: { type: String, default: '' },
    rollNumber: { type: String, default: '' },
    exitReason: { type: localizedSchema, default: () => ({}) },
    photoUrl: { type: String, default: '' },
    guardian: {
      name: { type: localizedSchema, default: () => ({}) },
      relation: { type: localizedSchema, default: () => ({}) },
      phone: { type: String, default: '' },
      address: { type: localizedSchema, default: () => ({}) },
    },
    guardians: [guardianRowSchema],
    previousSchools: [previousSchoolRowSchema],
    lessonTrack: [lessonTrackRowSchema],
    previousSchool: { type: localizedSchema, default: () => ({}) },
    degree: { type: localizedSchema, default: () => ({}) },
    previousGradeText: { type: localizedSchema, default: () => ({}) },
    currentGradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grade',
      default: null,
    },
    previousGradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grade',
      default: null,
    },
    enrollmentDate: { type: Date, default: null },
    exitDate: { type: Date, default: null },
  },
  { timestamps: true }
);

tenantPlugin(studentSchema);
studentSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

export const Student = mongoose.model('Student', studentSchema);
