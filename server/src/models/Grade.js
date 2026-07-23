import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const gradeSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    year: { type: Number, required: true },
    name: { type: localizedSchema, required: true },
    section: { type: String, default: '' },
    code: { type: String, required: true },
    responsibleTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
  },
  { timestamps: true }
);

tenantPlugin(gradeSchema);
gradeSchema.index({ tenantId: 1, sessionId: 1, code: 1 }, { unique: true });

export const Grade = mongoose.model('Grade', gradeSchema);
