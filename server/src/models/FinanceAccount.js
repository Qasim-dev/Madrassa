import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const financeAccountSchema = new mongoose.Schema(
  {
    name: { type: localizedSchema, required: true },
    currentAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

tenantPlugin(financeAccountSchema);

export const FinanceAccount = mongoose.model('FinanceAccount', financeAccountSchema);
