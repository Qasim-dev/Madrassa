import mongoose from 'mongoose';

export const localizedSchema = new mongoose.Schema(
  {
    ur: { type: String, default: '' },
    en: { type: String, default: '' },
  },
  { _id: false }
);

export const tenantPlugin = (schema) => {
  schema.add({
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
  });
  schema.index({ tenantId: 1 });
};
