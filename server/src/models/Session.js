import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const sessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

tenantPlugin(sessionSchema);
sessionSchema.index({ tenantId: 1, title: 1 }, { unique: true });

export const Session = mongoose.model('Session', sessionSchema);

