import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const stockMovementSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    kind: {
      type: String,
      enum: ['entry', 'exit', 'registration'],
      required: true,
    },
    /** purchase | usage | transfer | damage | expiry | return — for filters & UI */
    movementFlow: {
      type: String,
      enum: ['purchase', 'usage', 'transfer', 'damage', 'expiry', 'return', 'other', ''],
      default: '',
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
    },
    quantity: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    supplier: { type: localizedSchema, default: () => ({}) },
    notes: { type: localizedSchema, default: () => ({}) },
    usageLocation: { type: localizedSchema, default: () => ({}) },
    responsiblePerson: { type: localizedSchema, default: () => ({}) },
    reason: {
      type: String,
      enum: ['usage', 'damage', 'loss', 'purchase', 'receive', 'other', ''],
      default: '',
    },
    fromLocation: { type: String, default: '' },
    toLocation: { type: String, default: '' },
    department: { type: String, default: '' },
    referenceNo: { type: String, default: '' },
    purchaseUnitCost: { type: Number, default: 0, min: 0 },
    financeTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    status: { type: String, enum: ['posted', 'pending'], default: 'posted' },
  },
  { timestamps: true }
);

tenantPlugin(stockMovementSchema);
stockMovementSchema.index({ tenantId: 1, date: -1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
