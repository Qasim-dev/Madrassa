import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const sequenceSchema = new mongoose.Schema(
  {
    /** Name of the counter, e.g. "studentId" */
    name: { type: String, required: true, trim: true },
    /** Optional scope id (we use Session._id to generate per-session sequences) */
    scopeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    /** Next integer to use (1-based) */
    next: { type: Number, required: true, default: 1, min: 1 },
  },
  { timestamps: true }
);

tenantPlugin(sequenceSchema);
sequenceSchema.index({ tenantId: 1, name: 1, scopeId: 1 }, { unique: true });

export const Sequence = mongoose.model('Sequence', sequenceSchema);

