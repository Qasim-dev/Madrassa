import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const timeSlotSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    label: { type: String, default: '', trim: true },
    startTime: { type: String, required: true, trim: true }, // "HH:MM"
    endTime: { type: String, required: true, trim: true }, // "HH:MM"
    sortOrder: { type: Number, default: 0 },
    /** When true, row spans all days (break / assembly / lunch). */
    isBreak: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tenantPlugin(timeSlotSchema);
timeSlotSchema.index({ tenantId: 1, sessionId: 1, sortOrder: 1 });

export const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

