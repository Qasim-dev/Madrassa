import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

/**
 * Configurable activity / character assessment category (never hardcode product categories).
 * Reusable assessment-engine building block.
 */
const studentActivityCategorySchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    /** Stable optional key for seeds (e.g. namaz, akhlaq) — not required for custom categories */
    key: { type: String, default: '', trim: true, lowercase: true },
    name: { type: localizedSchema, required: true },
    description: { type: localizedSchema, default: () => ({ ur: '', en: '' }) },
    icon: { type: String, default: 'star', trim: true },
    color: { type: String, default: '#0f8f5f', trim: true },
    displayOrder: { type: Number, default: 0 },
    defaultScore: { type: Number, default: null },
    maxScore: { type: Number, default: 5 },
    minScore: { type: Number, default: 0 },
    ratingType: {
      type: String,
      enum: ['score', 'grade', 'boolean', 'stars', 'emoji'],
      default: 'stars',
    },
    /** Optional grade labels when ratingType === 'grade' */
    gradeOptions: {
      type: [
        {
          value: { type: String, required: true },
          label: { type: localizedSchema, default: () => ({ ur: '', en: '' }) },
          scoreEquivalent: { type: Number, default: null },
        },
      ],
      default: undefined,
    },
    isRequired: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

tenantPlugin(studentActivityCategorySchema);
studentActivityCategorySchema.index({ tenantId: 1, displayOrder: 1 });
studentActivityCategorySchema.index({ tenantId: 1, isActive: 1 });
studentActivityCategorySchema.index(
  { tenantId: 1, key: 1 },
  { unique: true, partialFilterExpression: { key: { $type: 'string', $gt: '' } } }
);

export const StudentActivityCategory = mongoose.model(
  'StudentActivityCategory',
  studentActivityCategorySchema
);
