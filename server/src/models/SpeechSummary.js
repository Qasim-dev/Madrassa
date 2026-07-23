import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const speechSummarySchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    title: { type: localizedSchema, required: true },
    speaker: { type: localizedSchema, default: () => ({}) },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    summary: { type: localizedSchema, default: () => ({}) },
    speechDate: { type: Date, default: null },
    pdfUrl: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tenantPlugin(speechSummarySchema);
speechSummarySchema.index({ tenantId: 1, speechDate: -1 });
speechSummarySchema.index({ tenantId: 1, sessionId: 1, speechDate: -1 });

export const SpeechSummary = mongoose.model('SpeechSummary', speechSummarySchema);
