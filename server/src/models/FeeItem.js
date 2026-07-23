import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const feeItemSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    tab: {
      type: String,
      enum: ['internal', 'class', 'collection', 'payer'],
      required: true,
    },
    title: { type: localizedSchema, required: true },
    amount: { type: Number, default: 0 },
    /** Billing cycle */
    frequency: {
      type: String,
      enum: ['monthly', 'annual', 'one_time'],
      default: 'monthly',
    },
    /** Class-wise (درجہ) — preferred */
    darjahId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Darjah',
      default: null,
    },
    /** Legacy grade link */
    gradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grade',
      default: null,
    },
  },
  { timestamps: true }
);

tenantPlugin(feeItemSchema);

export const FeeItem = mongoose.model('FeeItem', feeItemSchema);
