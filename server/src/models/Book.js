import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const bookSchema = new mongoose.Schema(
  {
    title: { type: localizedSchema, required: true },
    author: { type: localizedSchema, default: () => ({}) },
  },
  { timestamps: true }
);

tenantPlugin(bookSchema);

export const Book = mongoose.model('Book', bookSchema);
