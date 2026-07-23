import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const subjectSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    name: { type: localizedSchema, required: true },
    systemType: { type: localizedSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tenantPlugin(subjectSchema);
subjectSchema.index({ tenantId: 1, sessionId: 1, 'name.ur': 1, 'name.en': 1 }, { unique: true });

export const Subject = mongoose.model('Subject', subjectSchema);

