import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';
import { READING_STATUS } from '../constants/readingEnums.js';

/** Per-user reading progress for a shared curriculum book (SubjectBook). */
const userBookProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectBook', required: true },
    currentPage: { type: Number, default: 0, min: 0 },
    lastReadDate: { type: Date, default: null },
    readingPercentage: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: Object.values(READING_STATUS),
      default: READING_STATUS.NOT_STARTED,
    },
  },
  { timestamps: true }
);

tenantPlugin(userBookProgressSchema);
userBookProgressSchema.index({ tenantId: 1, userId: 1, bookId: 1 }, { unique: true });

export const UserBookProgress = mongoose.model('UserBookProgress', userBookProgressSchema);
