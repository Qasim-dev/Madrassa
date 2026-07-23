import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const accountTransferSchema = new mongoose.Schema(
  {
    title: { type: localizedSchema, default: () => ({}) },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    fromAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinanceAccount',
      required: true,
    },
    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinanceAccount',
      required: true,
    },
  },
  { timestamps: true }
);

tenantPlugin(accountTransferSchema);

export const AccountTransfer = mongoose.model(
  'AccountTransfer',
  accountTransferSchema
);
