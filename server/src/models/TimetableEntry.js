import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const timetableEntrySchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    darjahId: { type: mongoose.Schema.Types.ObjectId, ref: 'Darjah', required: true },
    day: { type: String, required: true, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeSlot', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectBook', default: null },
    room: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

tenantPlugin(timetableEntrySchema);
// One entry per darjah/day/slot
timetableEntrySchema.index({ tenantId: 1, sessionId: 1, darjahId: 1, day: 1, slotId: 1 }, { unique: true });
// Conflict detection helper index
timetableEntrySchema.index({ tenantId: 1, sessionId: 1, teacherId: 1, day: 1, slotId: 1 });

export const TimetableEntry = mongoose.model('TimetableEntry', timetableEntrySchema);

