import { Router } from 'express';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { FinanceAccount } from '../models/FinanceAccount.js';
import { FinanceCategory } from '../models/FinanceCategory.js';
import { Transaction } from '../models/Transaction.js';
import { AccountTransfer } from '../models/AccountTransfer.js';
import { StudentFeeBalance } from '../models/StudentFeeBalance.js';
import { TeacherSalary } from '../models/TeacherSalary.js';
import { uploadFinanceReceipt } from '../config/upload.js';
import { FUND_TYPES, TX_STATUSES } from '../constants/financeEnums.js';
import { Student } from '../models/Student.js';
import { Teacher } from '../models/Teacher.js';
import { sanitizeUpdateBody } from '../utils/sanitizeUpdateBody.js';

const router = Router();

function inEnum(val, list, fallback) {
  return val && list.includes(val) ? val : fallback;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickTitle(body) {
  if (body.title && typeof body.title === 'object') {
    return { ur: String(body.title.ur || ''), en: String(body.title.en || '') };
  }
  return { ur: String(body.titleUr || ''), en: String(body.titleEn || '') };
}

function pickUsageFor(body) {
  if (body.usageFor && typeof body.usageFor === 'object') {
    return { ur: String(body.usageFor.ur || ''), en: String(body.usageFor.en || '') };
  }
  return { ur: String(body.usageForUr || ''), en: String(body.usageForEn || '') };
}

function buildTransactionFilter(tenantId, query) {
  const {
    sessionId,
    dateFrom,
    dateTo,
    fundType,
    expenseCategory,
    fundSource,
    status,
    type,
    search,
    ledgerFund,
    studentId,
    teacherId,
  } = query || {};
  const filter = { tenantId };
  if (sessionId && mongoose.isValidObjectId(sessionId)) filter.sessionId = sessionId;
  if (studentId && mongoose.isValidObjectId(studentId)) filter.studentId = studentId;
  if (teacherId && mongoose.isValidObjectId(teacherId)) filter.teacherId = teacherId;
  if (type === 'income' || type === 'expense') filter.type = type;
  if (fundType && FUND_TYPES.includes(fundType)) filter.fundType = fundType;
  if (expenseCategory && String(expenseCategory).trim()) {
    filter.expenseCategory = String(expenseCategory).trim().slice(0, 60);
  }
  if (fundSource && String(fundSource).trim()) {
    filter.fundSource = String(fundSource).trim().slice(0, 40);
  }
  if (status && TX_STATUSES.includes(status)) filter.status = status;
  if (dateFrom) {
    const d = new Date(dateFrom);
    if (!Number.isNaN(d.getTime())) filter.date = { ...(filter.date || {}), $gte: d };
  }
  if (dateTo) {
    const d = new Date(dateTo);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      filter.date = { ...(filter.date || {}), $lte: d };
    }
  }

  const parts = [];
  const q = search && String(search).trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    parts.push({
      $or: [
        { 'title.ur': rx },
        { 'title.en': rx },
        { notes: rx },
        { 'usageFor.ur': rx },
        { 'usageFor.en': rx },
      ],
    });
  }
  if (ledgerFund && FUND_TYPES.includes(ledgerFund) && ledgerFund !== 'general') {
    parts.push({
      $or: [
        { type: 'income', fundType: ledgerFund },
        { type: 'expense', fundSource: ledgerFund },
      ],
    });
  }
  if (parts.length === 1) Object.assign(filter, parts[0]);
  else if (parts.length > 1) filter.$and = parts;

  return filter;
}

function monthKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function computeAnalytics(txs) {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }
  const monthlyMap = Object.fromEntries(months.map((m) => [m, { income: 0, expense: 0 }]));
  const expenseByCat = {};
  const incomeByFund = {};
  FUND_TYPES.forEach((f) => {
    incomeByFund[f] = 0;
  });

  txs.forEach((t) => {
    const d = t.date ? new Date(t.date) : null;
    if (!d || Number.isNaN(d.getTime())) return;
    const mk = monthKey(d);
    if (monthlyMap[mk]) {
      if (t.type === 'income') monthlyMap[mk].income += Number(t.amount) || 0;
      else monthlyMap[mk].expense += Number(t.amount) || 0;
    }
    if (t.type === 'expense') {
      const cat = (t.expenseCategory && String(t.expenseCategory).trim()) || 'other';
      expenseByCat[cat] = (expenseByCat[cat] || 0) + (Number(t.amount) || 0);
    }
    if (t.type === 'income') {
      const ft = inEnum(t.fundType, FUND_TYPES, 'general');
      incomeByFund[ft] = (incomeByFund[ft] || 0) + (Number(t.amount) || 0);
    }
  });

  const monthlyIncomeExpense = months.map((m) => ({
    month: m,
    income: monthlyMap[m].income,
    expense: monthlyMap[m].expense,
  }));

  const fundPie = FUND_TYPES.filter((f) => incomeByFund[f] > 0).map((f) => ({
    fund: f,
    value: incomeByFund[f],
  }));

  const expenseBreakdown = Object.entries(expenseByCat)
    .filter(([, v]) => v > 0)
    .map(([category, value]) => ({ category, value }));

  const displayFundOrder = ['zakat', 'sadaqah', 'khairat', 'lillah', 'donations', 'construction', 'fees'];
  const fundCardKeys = FUND_TYPES.filter((f) => f !== 'general').sort((a, b) => {
    const ia = displayFundOrder.indexOf(a);
    const ib = displayFundOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const fundSummaries = fundCardKeys.map((key) => {
    let received = 0;
    let used = 0;
    txs.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income' && t.fundType === key) received += amt;
      if (t.type === 'expense' && t.fundSource === key) used += amt;
    });
    return { key, received, used, remaining: received - used };
  });

  const feeIncome = txs
    .filter((t) => t.type === 'income' && t.fundType === 'fees')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return {
    monthlyIncomeExpense,
    fundPie,
    expenseBreakdown,
    fundSummaries,
    feeIncome,
  };
}

router.get('/accounts', async (req, res, next) => {
  try {
    const list = await FinanceAccount.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/accounts', async (req, res, next) => {
  try {
    const doc = await FinanceAccount.create({ ...req.body, tenantId: req.tenantId });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/accounts/:id', async (req, res, next) => {
  try {
    const doc = await FinanceAccount.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: sanitizeUpdateBody(req.body, ['balance']) },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const list = await FinanceCategory.find({ tenantId: req.tenantId });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    const doc = await FinanceCategory.create({ ...req.body, tenantId: req.tenantId });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.get('/transactions', async (req, res, next) => {
  try {
    const filter = buildTransactionFilter(req.tenantId, req.query);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .populate('accountId')
        .populate('categoryId')
        .populate('studentId', 'name rollNumber')
        .populate('teacherId', 'name parentage')
        .populate('inventoryItemId', 'name quantity unit')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    res.json({ items, total, page, limit });
  } catch (e) {
    next(e);
  }
});

router.get('/transactions/export', async (req, res, next) => {
  try {
    const filter = buildTransactionFilter(req.tenantId, req.query);
    const list = await Transaction.find(filter).sort({ date: -1 }).limit(5000).lean();
    const rows = list.map((t) => ({
      Date: t.date ? new Date(t.date).toISOString().slice(0, 10) : '',
      Type: t.type,
      TitleUr: t.title?.ur || '',
      TitleEn: t.title?.en || '',
      Amount: t.amount,
      FundType: t.fundType,
      ExpenseCategory: t.expenseCategory,
      FundSource: t.fundSource,
      Status: t.status,
      Notes: t.notes || '',
      UsageUr: t.usageFor?.ur || '',
      UsageEn: t.usageFor?.en || '',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Date: '', Note: 'No rows' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="finance-transactions.xlsx"');
    res.send(buf);
  } catch (e) {
    next(e);
  }
});

function parseCreateBody(req, file) {
  const b = req.body || {};
  const title = pickTitle(b);
  const usageFor = pickUsageFor(b);
  const type = b.type === 'expense' ? 'expense' : 'income';
  const amount = Number(b.amount);
  const date = b.date ? new Date(b.date) : new Date();
  const sessionId =
    b.sessionId && mongoose.isValidObjectId(String(b.sessionId)) ? String(b.sessionId) : null;
  const accountId =
    b.accountId && mongoose.isValidObjectId(String(b.accountId)) ? String(b.accountId) : null;
  const fundType = inEnum(b.fundType, FUND_TYPES, 'general');
  const expenseCategoryRaw = String(b.expenseCategory ?? '').trim().slice(0, 60);
  const expenseCategory =
    type === 'expense' ? (expenseCategoryRaw || 'other') : 'other';
  const fundSourceRaw = String(b.fundSource ?? '').trim().slice(0, 40);
  const fundSource = type === 'expense' ? (fundSourceRaw || 'general') : 'general';
  const status = inEnum(b.status, TX_STATUSES, 'posted');
  const notes = String(b.notes || '').slice(0, 4000);
  const receiptUrl = file ? `/uploads/${file.filename}` : String(b.receiptUrl || '').slice(0, 500);
  const linkedTeacherSalaryId =
    b.linkedTeacherSalaryId && mongoose.isValidObjectId(String(b.linkedTeacherSalaryId))
      ? String(b.linkedTeacherSalaryId)
      : null;
  const linkedFeeBalanceId =
    b.linkedFeeBalanceId && mongoose.isValidObjectId(String(b.linkedFeeBalanceId))
      ? String(b.linkedFeeBalanceId)
      : null;
  const studentId =
    b.studentId && mongoose.isValidObjectId(String(b.studentId)) ? String(b.studentId) : null;
  const teacherId =
    b.teacherId && mongoose.isValidObjectId(String(b.teacherId)) ? String(b.teacherId) : null;
  const inventoryItemId =
    b.inventoryItemId && mongoose.isValidObjectId(String(b.inventoryItemId))
      ? String(b.inventoryItemId)
      : null;
  const linkedStockMovementId =
    b.linkedStockMovementId && mongoose.isValidObjectId(String(b.linkedStockMovementId))
      ? String(b.linkedStockMovementId)
      : null;
  const categoryId =
    b.categoryId && mongoose.isValidObjectId(String(b.categoryId)) ? String(b.categoryId) : null;
  const paymentMethod = String(b.paymentMethod || '').slice(0, 40);
  const referenceNo = String(b.referenceNo || '').slice(0, 80);
  const periodMonth = String(b.periodMonth || '').slice(0, 7);
  return {
    title,
    amount,
    date,
    type,
    sessionId,
    accountId,
    categoryId,
    fundType: type === 'income' ? fundType : 'general',
    expenseCategory: type === 'expense' ? expenseCategory : 'other',
    fundSource: type === 'expense' ? fundSource : 'general',
    notes,
    usageFor,
    status,
    receiptUrl,
    linkedTeacherSalaryId,
    linkedFeeBalanceId,
    studentId,
    teacherId,
    inventoryItemId,
    linkedStockMovementId,
    paymentMethod,
    referenceNo,
    periodMonth,
  };
}

/** Same as create, but keep existing receipt when the client does not send a new file or explicit receiptUrl. */
function parseUpdateBody(req, file, existing) {
  const parsed = parseCreateBody(req, file);
  if (!file) {
    const b = req.body || {};
    if (b.receiptUrl === undefined || b.receiptUrl === null) {
      parsed.receiptUrl = existing?.receiptUrl || '';
    }
  }
  parsed.linkedTeacherSalaryId = existing?.linkedTeacherSalaryId || null;
  parsed.linkedFeeBalanceId = existing?.linkedFeeBalanceId || null;
  return parsed;
}

async function adjustAccountForTransaction(tenantId, accountId, type, amount, sign) {
  if (!accountId || !Number.isFinite(amount) || amount <= 0) return;
  const acc = await FinanceAccount.findOne({ _id: accountId, tenantId });
  if (!acc) return;
  const delta = (type === 'income' ? 1 : -1) * sign * amount;
  acc.currentAmount += delta;
  await acc.save();
}

async function applyLinksOnCreate(tenantId, parsed) {
  if (parsed.linkedTeacherSalaryId && parsed.type === 'expense' && parsed.expenseCategory === 'salary') {
    const sal = await TeacherSalary.findOne({
      _id: parsed.linkedTeacherSalaryId,
      tenantId,
      paymentStatus: 'pending',
    });
    if (!sal) {
      const err = new Error('Salary slip not found or already paid');
      err.status = 400;
      throw err;
    }
    sal.paymentStatus = 'paid';
    sal.paidAt = new Date();
    await sal.save();
  }
  if (parsed.linkedFeeBalanceId && parsed.type === 'income' && parsed.fundType === 'fees') {
    const bal = await StudentFeeBalance.findOne({ _id: parsed.linkedFeeBalanceId, tenantId });
    if (!bal) {
      const err = new Error('Student fee record not found');
      err.status = 400;
      throw err;
    }
    const amt = Number(parsed.amount) || 0;
    const due = Math.max(0, Number(bal.due) || 0);
    const pay = Math.min(amt, due);
    bal.due = due - pay;
    const over = amt - pay;
    if (over > 0) bal.advance = (Number(bal.advance) || 0) + over;
    await bal.save();
  }
}

async function reverseLinksOnDelete(tenantId, tx) {
  if (tx.linkedTeacherSalaryId) {
    await TeacherSalary.updateOne(
      { _id: tx.linkedTeacherSalaryId, tenantId },
      { $set: { paymentStatus: 'pending', paidAt: null } }
    );
  }
  if (tx.linkedFeeBalanceId) {
    const bal = await StudentFeeBalance.findOne({ _id: tx.linkedFeeBalanceId, tenantId });
    if (bal) {
      bal.due = (Number(bal.due) || 0) + (Number(tx.amount) || 0);
      await bal.save();
    }
  }
}

router.post(
  '/transactions',
  (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('multipart/form-data')) {
      return uploadFinanceReceipt.single('receipt')(req, res, (err) => {
        if (err) return next(err);
        next();
      });
    }
    next();
  },
  async (req, res, next) => {
    try {
      const file = req.file || null;
      const parsed = parseCreateBody(req, file);
      if (!parsed.title.ur && !parsed.title.en) {
        return res.status(400).json({ message: 'Title is required' });
      }
      if (!Number.isFinite(parsed.amount) || parsed.amount <= 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
      }
      if (Number.isNaN(parsed.date.getTime())) {
        return res.status(400).json({ message: 'Valid date is required' });
      }

      if (parsed.linkedTeacherSalaryId && (parsed.type !== 'expense' || parsed.expenseCategory !== 'salary')) {
        return res.status(400).json({ message: 'Salary link requires expense with salary category' });
      }
      if (parsed.linkedFeeBalanceId && (parsed.type !== 'income' || parsed.fundType !== 'fees')) {
        return res.status(400).json({ message: 'Fee link requires income with fees fund' });
      }

      const created = await Transaction.create({
        ...parsed,
        tenantId: req.tenantId,
        sessionId: parsed.sessionId || undefined,
        accountId: parsed.accountId || undefined,
        categoryId: parsed.categoryId || undefined,
        linkedTeacherSalaryId: parsed.linkedTeacherSalaryId || undefined,
        linkedFeeBalanceId: parsed.linkedFeeBalanceId || undefined,
        studentId: parsed.studentId || undefined,
        teacherId: parsed.teacherId || undefined,
        inventoryItemId: parsed.inventoryItemId || undefined,
        linkedStockMovementId: parsed.linkedStockMovementId || undefined,
        paymentMethod: parsed.paymentMethod || undefined,
        referenceNo: parsed.referenceNo || undefined,
        periodMonth: parsed.periodMonth || undefined,
      });

      if (parsed.accountId && parsed.amount != null) {
        const acc = await FinanceAccount.findOne({
          _id: parsed.accountId,
          tenantId: req.tenantId,
        });
        if (acc) {
          if (parsed.type === 'income') acc.currentAmount += Number(parsed.amount);
          else acc.currentAmount -= Number(parsed.amount);
          await acc.save();
        }
      }
      await applyLinksOnCreate(req.tenantId, parsed);
      res.status(201).json(created);
    } catch (e) {
      if (e.status === 400) return res.status(400).json({ message: e.message });
      next(e);
    }
  }
);

router.put(
  '/transactions/:id',
  (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('multipart/form-data')) {
      return uploadFinanceReceipt.single('receipt')(req, res, (err) => {
        if (err) return next(err);
        next();
      });
    }
    next();
  },
  async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    try {
      const existing = await Transaction.findOne({
        _id: req.params.id,
        tenantId: req.tenantId,
      });
      if (!existing) {
        return res.status(404).json({ message: 'Not found' });
      }

      const file = req.file || null;
      const parsed = parseUpdateBody(req, file, existing);
      if (!parsed.title.ur && !parsed.title.en) {
        return res.status(400).json({ message: 'Title is required' });
      }
      if (!Number.isFinite(parsed.amount) || parsed.amount <= 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
      }
      if (Number.isNaN(parsed.date.getTime())) {
        return res.status(400).json({ message: 'Valid date is required' });
      }

      const oldAcc = existing.accountId ? String(existing.accountId) : null;
      const oldAmt = Number(existing.amount) || 0;
      const oldType = existing.type;

      await adjustAccountForTransaction(req.tenantId, oldAcc, oldType, oldAmt, -1);

      existing.title = parsed.title;
      existing.amount = parsed.amount;
      existing.date = parsed.date;
      existing.type = parsed.type;
      existing.sessionId = parsed.sessionId || null;
      existing.accountId = parsed.accountId || null;
      existing.fundType = parsed.fundType;
      existing.expenseCategory = parsed.expenseCategory;
      existing.fundSource = parsed.fundSource;
      existing.notes = parsed.notes;
      existing.usageFor = parsed.usageFor;
      existing.status = parsed.status;
      existing.receiptUrl = parsed.receiptUrl;
      existing.linkedTeacherSalaryId = parsed.linkedTeacherSalaryId || null;
      existing.linkedFeeBalanceId = parsed.linkedFeeBalanceId || null;
      existing.categoryId = parsed.categoryId || null;
      existing.studentId = parsed.studentId || null;
      existing.teacherId = parsed.teacherId || null;
      existing.inventoryItemId = parsed.inventoryItemId || null;
      existing.linkedStockMovementId = parsed.linkedStockMovementId || null;
      existing.paymentMethod = parsed.paymentMethod || '';
      existing.referenceNo = parsed.referenceNo || '';
      existing.periodMonth = parsed.periodMonth || '';
      await existing.save();

      const newAcc = existing.accountId ? String(existing.accountId) : null;
      await adjustAccountForTransaction(req.tenantId, newAcc, existing.type, parsed.amount, 1);

      const populated = await Transaction.findById(existing._id)
        .populate('accountId')
        .populate('categoryId')
        .populate('studentId', 'name rollNumber')
        .populate('teacherId', 'name parentage')
        .populate('inventoryItemId', 'name quantity unit')
        .lean();
      res.json(populated);
    } catch (e) {
      next(e);
    }
  }
);

router.delete('/transactions/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  try {
    const existing = await Transaction.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!existing) {
      return res.status(404).json({ message: 'Not found' });
    }

    const oldAcc = existing.accountId ? String(existing.accountId) : null;
    const oldAmt = Number(existing.amount) || 0;
    await adjustAccountForTransaction(req.tenantId, oldAcc, existing.type, oldAmt, -1);

    await reverseLinksOnDelete(req.tenantId, existing);

    await Transaction.deleteOne({ _id: existing._id, tenantId: req.tenantId });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

router.get('/transfers', async (req, res, next) => {
  try {
    const list = await AccountTransfer.find({ tenantId: req.tenantId })
      .populate('fromAccountId')
      .populate('toAccountId')
      .sort({ date: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/transfers', async (req, res, next) => {
  try {
    const { fromAccountId, toAccountId, amount, date, title } = req.body;
    const amt = Number(amount);
    const from = await FinanceAccount.findOne({ _id: fromAccountId, tenantId: req.tenantId });
    const to = await FinanceAccount.findOne({ _id: toAccountId, tenantId: req.tenantId });
    if (!from || !to) {
      return res.status(400).json({ message: 'Invalid accounts' });
    }
    from.currentAmount -= amt;
    to.currentAmount += amt;
    await from.save();
    await to.save();
    const doc = await AccountTransfer.create({
      tenantId: req.tenantId,
      fromAccountId,
      toAccountId,
      amount: amt,
      date: new Date(date),
      title: title || {},
    });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.get('/overview', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { sessionId } = req.query;
    const txFilter = { tenantId };
    if (sessionId && mongoose.isValidObjectId(sessionId)) txFilter.sessionId = sessionId;
    const accounts = await FinanceAccount.find({ tenantId });
    const totalAccountCurrent = accounts.reduce((s, a) => s + (a.currentAmount || 0), 0);
    const txs = await Transaction.find(txFilter).lean();
    let totalIncome = 0;
    let totalExpenses = 0;
    txs.forEach((t) => {
      if (t.type === 'income') totalIncome += t.amount || 0;
      else totalExpenses += t.amount || 0;
    });
    const netPlus = totalIncome - totalExpenses;

    const balMatch = { tenantId: new mongoose.Types.ObjectId(String(tenantId)) };
    if (sessionId && mongoose.isValidObjectId(sessionId)) {
      const studIds = await Student.find({
        tenantId,
        sessionId,
      }).distinct('_id');
      balMatch.studentId = { $in: studIds };
    }
    const feeDueAgg = await StudentFeeBalance.aggregate([
      { $match: balMatch },
      { $group: { _id: null, totalDue: { $sum: '$due' } } },
    ]);
    const totalFeesDue = feeDueAgg[0]?.totalDue || 0;

    const salaryFilter = { tenantId };
    if (sessionId && mongoose.isValidObjectId(sessionId)) {
      const teacherIds = await Teacher.find({
        tenantId,
        assignments: { $elemMatch: { sessionId } },
      }).distinct('_id');
      salaryFilter.teacherId = { $in: teacherIds };
    }
    const salaryRows = await TeacherSalary.find(salaryFilter).lean();
    let salaryPaidTotal = 0;
    let salaryPendingTotal = 0;
    let salaryPendingCount = 0;
    salaryRows.forEach((s) => {
      const n = Number(s.netSalary) || 0;
      if (s.paymentStatus === 'paid') salaryPaidTotal += n;
      else {
        salaryPendingTotal += n;
        salaryPendingCount += 1;
      }
    });

    const analytics = computeAnalytics(txs);
    const feeRecoveryRate =
      analytics.feeIncome + totalFeesDue > 0
        ? Math.round((100 * analytics.feeIncome) / (analytics.feeIncome + totalFeesDue))
        : null;

    res.json({
      totalAccountCurrent,
      totalIncome,
      totalExpenses,
      netPlus,
      totalFeesDue,
      feeRecoveryRate,
      salaryPaidTotal,
      salaryPendingTotal,
      salaryPendingCount,
      ...analytics,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
