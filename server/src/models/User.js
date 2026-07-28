import mongoose from 'mongoose';
import { localizedSchema } from './common.js';

const userSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    /** Kept in sync with email for legacy code paths (JWT, displays). */
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, trim: true, default: '' },
    name: { type: localizedSchema, default: () => ({}) },
    passwordHash: { type: String, required: true, select: false },
    preferredLocale: { type: String, enum: ['ur', 'en'], default: 'ur' },
    role: { type: String, enum: ['admin', 'staff'], default: 'admin' },
    /** Hashed refresh JWT jti / token for revocation */
    refreshTokenHash: { type: String, select: false, default: '' },
    passwordResetTokenHash: { type: String, select: false, default: '' },
    passwordResetExpires: { type: Date, select: false, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
