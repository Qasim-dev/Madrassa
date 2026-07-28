import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { StudentFeeBalance } from '../models/StudentFeeBalance.js';
import { TeacherSalary } from '../models/TeacherSalary.js';
import { FinanceAccount } from '../models/FinanceAccount.js';
import { withMongoTransaction, sessionOpts } from '../utils/mongoTransaction.js';

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
 * Atomic when Mongo transactions are available.
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
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    const err = new Error('Valid amount is required');
    err.status = 400;
    throw err;
  }

  const txDoc = await withMongoTransaction(async (session) => {
    const balQuery = StudentFeeBalance.findOne({ _id: balanceId, tenantId }).populate('studentId');
    if (session) balQuery.session(session);
    const bal = await balQuery;
    if (!bal) {
      const err = new Error('Student fee record not found');
      err.status = 404;
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
    const resolvedAccountId =
      accountId && mongoose.isValidObjectId(String(accountId)) ? accountId : null;

    const [tx] = await Transaction.create(
      [
        {
          tenantId,
          sessionId: sessionId && mongoose.isValidObjectId(String(sessionId)) ? sessionId : null,
          accountId: resolvedAccountId,
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
        },
      ],
      sessionOpts(session)
    );

    if (resolvedAccountId && amt > 0) {
      const acc = await FinanceAccount.findOneAndUpdate(
        { _id: resolvedAccountId, tenantId },
        { $inc: { currentAmount: amt } },
        { new: true, ...sessionOpts(session) }
      );
      if (!acc) {
        const err = new Error('Finance account not found');
        err.status = 400;
        throw err;
      }
    }

    await bal.save(sessionOpts(session));
    return tx;
  });

  return Transaction.findById(txDoc._id)
    .populate('studentId', 'name rollNumber')
    .populate('accountId')
    .lean();
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
  const txDoc = await withMongoTransaction(async (session) => {
    const salQuery = TeacherSalary.findOne({
      _id: salaryId,
      tenantId,
      paymentStatus: 'pending',
    }).populate('teacherId');
    if (session) salQuery.session(session);
    const sal = await salQuery;
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
    const resolvedAccountId =
      accountId && mongoose.isValidObjectId(String(accountId)) ? accountId : null;

    const [tx] = await Transaction.create(
      [
        {
          tenantId,
          sessionId: sessionId && mongoose.isValidObjectId(String(sessionId)) ? sessionId : null,
          accountId: resolvedAccountId,
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
        },
      ],
      sessionOpts(session)
    );

    if (resolvedAccountId && net > 0) {
      const acc = await FinanceAccount.findOneAndUpdate(
        { _id: resolvedAccountId, tenantId },
        { $inc: { currentAmount: -net } },
        { new: true, ...sessionOpts(session) }
      );
      if (!acc) {
        const err = new Error('Finance account not found');
        err.status = 400;
        throw err;
      }
    }

    sal.paymentStatus = 'paid';
    sal.paidAt = new Date();
    await sal.save(sessionOpts(session));
    return tx;
  });

  return Transaction.findById(txDoc._id)
    .populate('teacherId', 'name parentage')
    .populate('accountId')
    .lean();
}

/**
 * Move funds between two finance accounts atomically.
 */
export async function recordAccountTransfer({
  tenantId,
  fromAccountId,
  toAccountId,
  amount,
  date,
  title,
}) {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    const err = new Error('Valid amount is required');
    err.status = 400;
    throw err;
  }
  if (String(fromAccountId) === String(toAccountId)) {
    const err = new Error('Cannot transfer to the same account');
    err.status = 400;
    throw err;
  }

  return withMongoTransaction(async (session) => {
    const from = await FinanceAccount.findOneAndUpdate(
      { _id: fromAccountId, tenantId, currentAmount: { $gte: amt } },
      { $inc: { currentAmount: -amt } },
      { new: true, ...sessionOpts(session) }
    );
    if (!from) {
      const err = new Error('Invalid source account or insufficient balance');
      err.status = 400;
      throw err;
    }
    const to = await FinanceAccount.findOneAndUpdate(
      { _id: toAccountId, tenantId },
      { $inc: { currentAmount: amt } },
      { new: true, ...sessionOpts(session) }
    );
    if (!to) {
      const err = new Error('Invalid destination account');
      err.status = 400;
      throw err;
    }

    const { AccountTransfer } = await import('../models/AccountTransfer.js');
    const [doc] = await AccountTransfer.create(
      [
        {
          tenantId,
          fromAccountId,
          toAccountId,
          amount: amt,
          date: date ? new Date(date) : new Date(),
          title: title || {},
        },
      ],
      sessionOpts(session)
    );
    return doc;
  });
}
