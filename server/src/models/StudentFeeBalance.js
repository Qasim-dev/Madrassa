import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const studentFeeBalanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    balance: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },
    due: { type: Number, default: 0 },
    /** Cumulative waived / معافی amount subtracted from due */
    maafi: { type: Number, default: 0 },
    /** Optional per-student override note / custom monthly amount */
    customMonthlyAmount: { type: Number, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

tenantPlugin(studentFeeBalanceSchema);
studentFeeBalanceSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

export const StudentFeeBalance = mongoose.model(
  'StudentFeeBalance',
  studentFeeBalanceSchema
);
