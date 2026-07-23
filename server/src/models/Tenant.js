import mongoose from 'mongoose';
import { localizedSchema } from './common.js';

const tenantSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: localizedSchema, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Tenant = mongoose.model('Tenant', tenantSchema);
