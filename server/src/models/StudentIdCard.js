import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const studentIdCardSchema = new mongoose.Schema(
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
    templateKey: {
      type: String,
      enum: ['pvc-prestige', 'pvc-classic'],
      default: 'pvc-prestige',
    },
    cardNumber: { type: String, required: true, trim: true },
    issueDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    bloodGroup: { type: String, default: '' },
    qrToken: { type: String, required: true, trim: true },
    barcode: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'revoked'],
      default: 'active',
    },
    printedAt: { type: Date, default: null },
    printedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

tenantPlugin(studentIdCardSchema);
studentIdCardSchema.index({ tenantId: 1, studentId: 1, sessionId: 1 }, { unique: true });
studentIdCardSchema.index({ tenantId: 1, cardNumber: 1 }, { unique: true });
studentIdCardSchema.index({ tenantId: 1, qrToken: 1 }, { unique: true });
/** Public verify looks up by token alone */
studentIdCardSchema.index({ qrToken: 1 }, { unique: true });

export const StudentIdCard = mongoose.model('StudentIdCard', studentIdCardSchema);
