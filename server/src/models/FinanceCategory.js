import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const financeCategorySchema = new mongoose.Schema(
  {
    name: { type: localizedSchema, required: true },
    kind: { type: String, enum: ['income', 'expense', 'both'], default: 'both' },
  },
  { timestamps: true }
);

tenantPlugin(financeCategorySchema);

export const FinanceCategory = mongoose.model(
  'FinanceCategory',
  financeCategorySchema
);
