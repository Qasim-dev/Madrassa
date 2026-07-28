import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const RECYCLE_MODULES = [
  'student',
  'teacher',
  'fee_item',
];

const recycleBinItemSchema = new mongoose.Schema(
  {
    module: { type: String, enum: RECYCLE_MODULES, required: true, index: true },
    recordId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    recordCollection: { type: String, required: true },
    recordName: {
      ur: { type: String, default: '' },
      en: { type: String, default: '' },
    },
    recordCode: { type: String, default: '', index: true },
    parentInfo: { type: String, default: '' },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null, index: true },
    deletedAt: { type: Date, required: true, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    deleteReason: { type: String, default: '' },
    status: {
      type: String,
      enum: ['deleted', 'restored', 'purged'],
      default: 'deleted',
      index: true,
    },
    restoredAt: { type: Date, default: null },
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    purgedAt: { type: Date, default: null },
    purgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

tenantPlugin(recycleBinItemSchema);
recycleBinItemSchema.index({ tenantId: 1, status: 1, deletedAt: -1 });
recycleBinItemSchema.index({ tenantId: 1, module: 1, status: 1 });
recycleBinItemSchema.index({ tenantId: 1, recordId: 1, module: 1 });

export const RecycleBinItem = mongoose.model('RecycleBinItem', recycleBinItemSchema);
export { RECYCLE_MODULES };
