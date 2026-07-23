import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const darjahAssignmentSchema = new mongoose.Schema(
  {
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectBook', default: null },
  },
  { _id: true }
);

const darjahSchema = new mongoose.Schema(
  {
    name: { type: localizedSchema, required: true },
    code: { type: String, default: '', trim: true },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    subjectIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
    /** Optional per-darjah mapping: subject → teacher → book */
    assignments: [darjahAssignmentSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tenantPlugin(darjahSchema);
darjahSchema.index({ tenantId: 1, sessionId: 1, code: 1 }, { unique: true, partialFilterExpression: { code: { $type: 'string', $ne: '' } } });

export const Darjah = mongoose.model('Darjah', darjahSchema);

