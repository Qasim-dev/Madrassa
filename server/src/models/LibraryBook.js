import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';
import { LIBRARY_LANGUAGES, LIBRARY_SUBJECTS } from '../constants/libraryEnums.js';

const libraryBookSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    /** نمبر شمار — accession serial */
    serialNumber: { type: Number, required: true, min: 1 },
    title: { type: localizedSchema, required: true },
    author: { type: localizedSchema, default: () => ({}) },
    volumes: { type: Number, default: 1, min: 1 },
    shelfNumber: { type: String, default: '', trim: true },
    /** Physical place where the book is kept (مقام) */
    location: { type: String, default: '', trim: true },
    language: { type: String, enum: LIBRARY_LANGUAGES, default: 'ar' },
    languageCustom: { type: String, default: '', trim: true },
    publisher: { type: localizedSchema, default: () => ({}) },
    editor: { type: localizedSchema, default: () => ({}) },
    conditionNotes: { type: localizedSchema, default: () => ({}) },
    subjectCategory: { type: String, enum: LIBRARY_SUBJECTS, default: 'other' },
    subjectCategoryCustom: { type: String, default: '', trim: true },
    totalCopies: { type: Number, default: 1, min: 1 },
    availableCopies: { type: Number, default: 1, min: 0 },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

libraryBookSchema.pre('save', function syncAvailable(next) {
  if (this.isNew && this.availableCopies == null) {
    this.availableCopies = this.totalCopies ?? 1;
  }
  if (this.availableCopies > this.totalCopies) {
    this.availableCopies = this.totalCopies;
  }
  next();
});

tenantPlugin(libraryBookSchema);
libraryBookSchema.index({ tenantId: 1, serialNumber: 1 }, { unique: true });
libraryBookSchema.index({ tenantId: 1, sessionId: 1, subjectCategory: 1 });
libraryBookSchema.index({ tenantId: 1, 'title.ur': 1, 'title.en': 1 });

export const LibraryBook = mongoose.model('LibraryBook', libraryBookSchema);
