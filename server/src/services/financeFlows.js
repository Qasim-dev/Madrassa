import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { StudentFeeBalance } from '../models/StudentFeeBalance.js';
import { TeacherSalary } from '../models/TeacherSalary.js';
import { FinanceAccount } from '../models/FinanceAccount.js';

function titleFromStudent(student, fallback) {
  if (!student?.name) return { ur: fallback || 'فیس', en: fallback || 'Fee' };
  return {
    ur: String(student.name.ur || student.name.en || fallback || 'فیس'),
    en: String(student.name.en || student.name.ur || fallback || 'Fee'),
  };
}

function titleFromTeacher(teacher, fallback) {
  if (!teacher?.name) return { ur: fallback || 'تنخواہ', en: fallback || 'Salary' };
  return {
    ur: String(teacher.name.ur || teacher.name.en || fallback || 'تنخواہ'),
    en: String(teacher.name.en || teacher.name.ur || fallback || 'Salary'),
  };
}

/**
 * Record fee collection: income transaction + balance update + optional cash account.
 */
export async function recordFeeCollection({
  tenantId,
  balanceId,
  amount,
  sessionId,
  accountId,
  paymentMethod,
  referenceNo,
  periodMonth,
  date,
  notes,
}) {
  const bal = await StudentFeeBalance.findOne({ _id: balanceId, tenantId }).populate('studentId');
  if (!bal) {
    const err = new Error('Student fee record not found');
    err.status = 404;
    throw err;
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    const err = new Error('Valid amount is required');
    err.status = 400;
    throw err;
  }
  const due = Math.max(0, Number(bal.due) || 0);
  if (amt > due + 1e-6) {
    const err = new Error('Amount exceeds outstanding fee');
    err.status = 400;
    throw err;
  }

  const pay = Math.min(amt, due);
  const over = amt - pay;
  bal.due = due - pay;
  if (over > 0) bal.advance = (Number(bal.advance) || 0) + over;

  const d = date ? new Date(date) : new Date();
  const tx = await Transaction.create({
    tenantId,
    sessionId: sessionId && mongoose.isValidObjectId(String(sessionId)) ? sessionId : null,
    accountId: accountId && mongoose.isValidObjectId(String(accountId)) ? accountId : null,
    title: titleFromStudent(bal.studentId, 'فیس وصولی'),
    amount: amt,
    date: d,
    type: 'income',
    fundType: 'fees',
    expenseCategory: 'other',
    fundSource: 'general',
    notes: String(notes || '').slice(0, 4000),
    usageFor: { ur: '', en: '' },
    status: 'posted',
    linkedFeeBalanceId: bal._id,
    studentId: bal.studentId?._id || bal.studentId,
    paymentMethod: paymentMethod ? String(paymentMethod).slice(0, 40) : '',
    referenceNo: referenceNo ? String(referenceNo).slice(0, 80) : '',
    periodMonth: periodMonth ? String(periodMonth).slice(0, 7) : '',
  });

  if (tx.accountId && amt > 0) {
    const acc = await FinanceAccount.findOne({ _id: tx.accountId, tenantId });
    if (acc) {
      acc.currentAmount += amt;
      await acc.save();
    }
  }
  await bal.save();
  const populated = await Transaction.findById(tx._id)
    .populate('studentId', 'name rollNumber')
    .populate('accountId')
    .lean();
  return populated;
}

/**
 * Pay teacher salary slip: expense + mark paid + optional cash account.
 */
export async function recordSalaryPayment({
  tenantId,
  salaryId,
  sessionId,
  accountId,
  paymentMethod,
  referenceNo,
  date,
  notes,
}) {
  const sal = await TeacherSalary.findOne({
    _id: salaryId,
    tenantId,
    paymentStatus: 'pending',
  }).populate('teacherId');
  if (!sal) {
    const err = new Error('Salary slip not found or already paid');
    err.status = 400;
    throw err;
  }
  const net = Number(sal.netSalary) || 0;
  if (!Number.isFinite(net) || net <= 0) {
    const err = new Error('Invalid salary amount');
    err.status = 400;
    throw err;
  }

  const d = date ? new Date(date) : new Date();
  const tx = await Transaction.create({
    tenantId,
    sessionId: sessionId && mongoose.isValidObjectId(String(sessionId)) ? sessionId : null,
    accountId: accountId && mongoose.isValidObjectId(String(accountId)) ? accountId : null,
    title: titleFromTeacher(sal.teacherId, 'تنخواہ'),
    amount: net,
    date: d,
    type: 'expense',
    fundType: 'general',
    expenseCategory: 'salary',
    fundSource: 'general',
    notes: String(notes || '').slice(0, 4000),
    usageFor: { ur: '', en: '' },
    status: 'posted',
    linkedTeacherSalaryId: sal._id,
    teacherId: sal.teacherId?._id || sal.teacherId,
    paymentMethod: paymentMethod ? String(paymentMethod).slice(0, 40) : '',
    referenceNo: referenceNo ? String(referenceNo).slice(0, 80) : '',
    periodMonth: sal.fromDate
      ? `${new Date(sal.fromDate).getFullYear()}-${String(new Date(sal.fromDate).getMonth() + 1).padStart(2, '0')}`
      : '',
  });

  if (tx.accountId && net > 0) {
    const acc = await FinanceAccount.findOne({ _id: tx.accountId, tenantId });
    if (acc) {
      acc.currentAmount -= net;
      await acc.save();
    }
  }
  sal.paymentStatus = 'paid';
  sal.paidAt = new Date();
  await sal.save();
  const populated = await Transaction.findById(tx._id)
    .populate('teacherId', 'name parentage')
    .populate('accountId')
    .lean();
  return populated;
}
