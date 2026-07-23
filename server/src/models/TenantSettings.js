import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const withdrawalReasonSchema = new mongoose.Schema(
  {
    name: { type: localizedSchema, required: true },
    marksYearComplete: { type: Boolean, default: false },
  },
  { _id: true }
);

const tenantSettingsSchema = new mongoose.Schema(
  {
    address: { type: localizedSchema, default: () => ({}) },
    collegeAffiliation: { type: localizedSchema, default: () => ({}) },
    logoUrl: { type: String, default: '' },
    /** Period labels (e.g. صبح، ظہر) — used in attendance UI */
    attendanceTimes: [{ type: String }],
    examNames: [{ type: localizedSchema }],
    lessonNames: [{ type: localizedSchema }],
    taughtStories: [{ type: localizedSchema }],
    /** Dropdown / lookup lists scoped to tenant (student forms, reports, etc.) */
    countries: [{ type: localizedSchema }],
    registeredAddresses: [{ type: localizedSchema }],
    districts: [{ type: localizedSchema }],
    guardianRelations: [{ type: localizedSchema }],
    previousMadarisNames: [{ type: localizedSchema }],
    withdrawalReasons: [withdrawalReasonSchema],
  },
  { timestamps: true }
);

tenantPlugin(tenantSettingsSchema);
export const TenantSettings = mongoose.model('TenantSettings', tenantSettingsSchema);
