import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';
import { FUND_TYPES, TX_STATUSES } from '../constants/financeEnums.js';

const transactionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    title: { type: localizedSchema, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinanceAccount',
      default: null,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinanceCategory',
      default: null,
    },
    /** Income: which fund received the amount */
    fundType: { type: String, enum: FUND_TYPES, default: 'general' },
    /** Expense: line category (built-in slugs or custom labels, max 60 chars) */
    expenseCategory: { type: String, default: 'other', maxlength: 60 },
    /** Expense: which dedicated fund paid this (built-in keys or custom, max 40 chars) */
    fundSource: { type: String, default: 'general', maxlength: 40 },
    notes: { type: String, default: '' },
    usageFor: { type: localizedSchema, default: () => ({}) },
    status: { type: String, enum: TX_STATUSES, default: 'posted' },
    receiptUrl: { type: String, default: '' },
    /** Marks a teacher salary slip paid when set (expense + salary) */
    linkedTeacherSalaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherSalary',
      default: null,
    },
    /** Applies fee payment against student balance when set (income + fees fund) */
    linkedFeeBalanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentFeeBalance',
      default: null,
    },
    /** Optional links for reporting & dynamic forms */
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', default: null },
    linkedStockMovementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StockMovement',
      default: null,
    },
    paymentMethod: { type: String, default: '' },
    referenceNo: { type: String, default: '' },
    /** YYYY-MM for fee month / salary period */
    periodMonth: { type: String, default: '' },
  },
  { timestamps: true }
);

tenantPlugin(transactionSchema);
transactionSchema.index({ tenantId: 1, date: -1 });
transactionSchema.index({ tenantId: 1, sessionId: 1, date: -1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
