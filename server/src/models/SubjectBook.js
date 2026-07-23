import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const subjectBookSchema = new mongoose.Schema(
  {
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    darjahId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Darjah',
      required: true,
    },
    title: { type: localizedSchema, required: true },
    author: { type: localizedSchema, default: () => ({}) },
    /** Total pages in the book — required for reading progress tracking */
    totalPages: { type: Number, min: 1, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tenantPlugin(subjectBookSchema);
subjectBookSchema.index({ tenantId: 1, subjectId: 1, darjahId: 1, 'title.ur': 1, 'title.en': 1 }, { unique: true });

export const SubjectBook = mongoose.model('SubjectBook', subjectBookSchema);

