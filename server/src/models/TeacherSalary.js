import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const teacherSalarySchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    basicSalary: { type: Number, required: true, min: 0 },
    houseAllowance: { type: Number, default: 0, min: 0 },
    medicalAllowance: { type: Number, default: 0, min: 0 },
    transportAllowance: { type: Number, default: 0, min: 0 },
    otherAllowances: { type: Number, default: 0, min: 0 },
    taxDeduction: { type: Number, default: 0, min: 0 },
    otherDeductions: { type: Number, default: 0, min: 0 },
    totalSalary: { type: Number, default: 0, min: 0 },
    totalDeduction: { type: Number, default: 0, min: 0 },
    netSalary: { type: Number, default: 0 },
    fromDate: { type: Date, default: null },
    toDate: { type: Date, default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String, default: '' },
    /** Salary slip / payment tracking */
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paidAt: { type: Date, default: null },
    invoiceNumber: { type: String, default: '' },
  },
  { timestamps: true }
);

function recomputeTotals(doc) {
  const basic = Number(doc.basicSalary) || 0;
  const add =
    (Number(doc.houseAllowance) || 0) +
    (Number(doc.medicalAllowance) || 0) +
    (Number(doc.transportAllowance) || 0) +
    (Number(doc.otherAllowances) || 0);
  doc.totalSalary = basic + add;
  doc.totalDeduction = (Number(doc.taxDeduction) || 0) + (Number(doc.otherDeductions) || 0);
  doc.netSalary = doc.totalSalary - doc.totalDeduction;
}

teacherSalarySchema.pre('save', function (next) {
  recomputeTotals(this);
  if (this.isNew && !this.invoiceNumber) {
    this.invoiceNumber = `SL-${Date.now().toString(36).toUpperCase()}`;
  }
  if (this.paymentStatus === 'paid' && !this.paidAt) {
    this.paidAt = new Date();
  }
  if (this.paymentStatus === 'pending') {
    this.paidAt = null;
  }
  next();
});

tenantPlugin(teacherSalarySchema);
teacherSalarySchema.index({ tenantId: 1, teacherId: 1, fromDate: -1 });

export const TeacherSalary = mongoose.model('TeacherSalary', teacherSalarySchema);
