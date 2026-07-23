import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';
import { LIBRARY_BORROWER_TYPES, LIBRARY_TX_STATUS } from '../constants/libraryEnums.js';

const libraryTransactionSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryBook', required: true },
    transactionType: { type: String, enum: ['issue', 'return'], default: 'issue' },
    borrowerType: { type: String, enum: LIBRARY_BORROWER_TYPES, default: 'student' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    borrowerName: { type: localizedSchema, default: () => ({}) },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, default: null },
    returnDate: { type: Date, default: null },
    status: { type: String, enum: LIBRARY_TX_STATUS, default: 'issued' },
    remarks: { type: String, default: '' },
    copies: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

tenantPlugin(libraryTransactionSchema);
libraryTransactionSchema.index({ tenantId: 1, bookId: 1, status: 1 });
libraryTransactionSchema.index({ tenantId: 1, issueDate: -1 });

export const LibraryTransaction = mongoose.model('LibraryTransaction', libraryTransactionSchema);
