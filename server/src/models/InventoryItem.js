import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';
import { INV_CATEGORIES, INV_UNITS } from '../constants/inventoryEnums.js';

const inventoryItemSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    name: { type: localizedSchema, required: true },
    sku: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    damaged: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    received: { type: Number, default: 0 },
    purchased: { type: Number, default: 0 },
    category: { type: String, enum: INV_CATEGORIES, default: 'other' },
    unit: { type: String, enum: INV_UNITS, default: 'piece' },
    unitPrice: { type: Number, default: 0, min: 0 },
    /** quantity * unitPrice, updated on save */
    lineValue: { type: Number, default: 0, min: 0 },
    minStockLevel: { type: Number, default: 5, min: 0 },
    supplier: { type: localizedSchema, default: () => ({}) },
    purchaseDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    location: { type: String, default: '' },
    barcode: { type: String, default: '' },
    notes: { type: String, default: '' },
    receiptUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

function recomputeLineValue(doc) {
  const q = Number(doc.quantity) || 0;
  const p = Number(doc.unitPrice) || 0;
  doc.lineValue = Math.round(q * p * 100) / 100;
}

inventoryItemSchema.pre('save', function (next) {
  recomputeLineValue(this);
  next();
});

tenantPlugin(inventoryItemSchema);
inventoryItemSchema.index({ tenantId: 1, sessionId: 1, category: 1 });
inventoryItemSchema.index({ tenantId: 1, sessionId: 1, createdAt: -1 });

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
