import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const idCardPrintHistorySchema = new mongoose.Schema(
  {
    printedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    printedAt: { type: Date, default: Date.now },
    templateKey: { type: String, default: 'pvc-prestige' },
    copies: { type: Number, default: 1, min: 1 },
    printType: {
      type: String,
      enum: ['single', 'selected', 'class', 'session', 'bulk'],
      default: 'selected',
    },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

tenantPlugin(idCardPrintHistorySchema);
idCardPrintHistorySchema.index({ tenantId: 1, printedAt: -1 });

export const IdCardPrintHistory = mongoose.model('IdCardPrintHistory', idCardPrintHistorySchema);
