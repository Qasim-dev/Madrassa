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
    deletedAt: { type: Date, default: null, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleteReason: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

tenantPlugin(feeItemSchema);
feeItemSchema.index({ tenantId: 1, sessionId: 1, tab: 1 });
feeItemSchema.index({ tenantId: 1, darjahId: 1 });
feeItemSchema.index({ tenantId: 1, isDeleted: 1, deletedAt: -1 });

export const FeeItem = mongoose.model('FeeItem', feeItemSchema);
