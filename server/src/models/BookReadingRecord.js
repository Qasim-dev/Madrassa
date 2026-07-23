import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';
import { computePagesRead } from '../constants/readingEnums.js';

const bookReadingRecordSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectBook', required: true },
    readingDate: { type: Date, required: true },
    startPage: { type: Number, required: true, min: 1 },
    endPage: { type: Number, required: true, min: 1 },
    pagesRead: { type: Number, required: true, min: 1 },
    durationMinutes: { type: Number, min: 0, default: null },
    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true }
);

tenantPlugin(bookReadingRecordSchema);
bookReadingRecordSchema.index({ tenantId: 1, userId: 1, bookId: 1, readingDate: -1 });
bookReadingRecordSchema.index({ tenantId: 1, bookId: 1, userId: 1, startPage: 1, endPage: 1 });

bookReadingRecordSchema.pre('validate', function setPagesRead() {
  if (this.startPage != null && this.endPage != null) {
    this.pagesRead = computePagesRead(this.startPage, this.endPage);
  }
});

export const BookReadingRecord = mongoose.model('BookReadingRecord', bookReadingRecordSchema);
