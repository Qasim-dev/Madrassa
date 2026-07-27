import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const idCardTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    name: { type: localizedSchema, default: () => ({}) },
    primaryColor: { type: String, default: '#1a2b3c' },
    accentColor: { type: String, default: '#c9a227' },
    secondaryColor: { type: String, default: '#32a852' },
    showQr: { type: Boolean, default: true },
    showBloodGroup: { type: Boolean, default: true },
    showAddress: { type: Boolean, default: true },
    defaultValidityMonths: { type: Number, default: 12 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tenantPlugin(idCardTemplateSchema);
idCardTemplateSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export const IdCardTemplate = mongoose.model('IdCardTemplate', idCardTemplateSchema);
