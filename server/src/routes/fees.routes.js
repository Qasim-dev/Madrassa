import { Router } from 'express';
import mongoose from 'mongoose';
import { FeeItem } from '../models/FeeItem.js';
import { Student } from '../models/Student.js';
import { StudentFeeBalance } from '../models/StudentFeeBalance.js';
import { FeeAuditLog } from '../models/FeeAuditLog.js';
import { recordFeeCollection } from '../services/financeFlows.js';

const router = Router();

async function writeFeeAudit({
  tenantId,
  sessionId,
  studentId,
  balanceId,
  action,
  amount,
  beforeValue,
  afterValue,
  reason,
  changedBy,
}) {
  await FeeAuditLog.create({
    tenantId,
    sessionId: sessionId || null,
    studentId: studentId || null,
    balanceId: balanceId || null,
    action,
    amount: Number(amount) || 0,
    beforeValue,
    afterValue,
    reason: String(reason || '').trim(),
    changedBy: changedBy || null,
    changedAt: new Date(),
  });
}

function snapshotBalance(bal) {
  return {
    balance: Number(bal.balance) || 0,
    advance: Number(bal.advance) || 0,
    due: Number(bal.due) || 0,
    maafi: Number(bal.maafi) || 0,
    customMonthlyAmount: bal.customMonthlyAmount ?? null,
  };
}

router.get('/items', async (req, res, next) => {
  try {
    const { tab, sessionId } = req.query;
    const filter = { tenantId: req.tenantId };
    if (tab) filter.tab = tab;
    if (sessionId && mongoose.isValidObjectId(sessionId)) filter.sessionId = sessionId;
    const list = await FeeItem.find(filter)
      .populate('darjahId', 'name code')
      .populate('gradeId')
      .populate('sessionId')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/items', async (req, res, next) => {
  try {
    const body = { ...req.body, tenantId: req.tenantId };
    if (body.darjahId === '') body.darjahId = null;
    if (body.gradeId === '') body.gradeId = null;
    const doc = await FeeItem.create(body);
    const populated = await FeeItem.findById(doc._id).populate('darjahId', 'name code');
    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
});

router.put('/items/:id', async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (body.darjahId === '') body.darjahId = null;
    const doc = await FeeItem.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: body },
      { new: true }
    ).populate('darjahId', 'name code');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/items/:id', async (req, res, next) => {
  try {
    const doc = await FeeItem.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * Apply a class fee item to all students in that darjah (session-scoped).
 * Adds amount to each student's due (creates balance if missing).
 * Optional studentId = apply only to one student (per-student variation).
 */
router.post('/items/:id/apply', async (req, res, next) => {
  try {
    const item = await FeeItem.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) return res.status(404).json({ message: 'Fee item not found' });

    const { studentId, customAmount } = req.body || {};
    const amount = Number(customAmount != null ? customAmount : item.amount) || 0;
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const studentFilter = { tenantId: req.tenantId };
    if (item.sessionId) studentFilter.sessionId = item.sessionId;
    if (studentId && mongoose.isValidObjectId(studentId)) {
      studentFilter._id = studentId;
    } else if (item.darjahId) {
      studentFilter.darjahId = item.darjahId;
    } else {
      return res.status(400).json({
        message: 'Class fee needs a darjah, or pass studentId for a single student',
      });
    }

    const students = await Student.find(studentFilter).select('_id');
    let updated = 0;
    for (const s of students) {
      await StudentFeeBalance.findOneAndUpdate(
        { tenantId: req.tenantId, studentId: s._id },
        {
          $inc: { due: amount },
          $setOnInsert: {
            tenantId: req.tenantId,
            studentId: s._id,
            sessionId: item.sessionId || null,
            balance: 0,
            advance: 0,
          },
        },
        { upsert: true, new: true }
      );
      updated += 1;
    }
    res.json({ ok: true, applied: updated, amount });
  } catch (e) {
    next(e);
  }
});

router.get('/balances', async (req, res, next) => {
  try {
    const { sessionId, studentId } = req.query || {};
    const filter = { tenantId: req.tenantId };
    if (studentId && mongoose.isValidObjectId(String(studentId))) {
      filter.studentId = studentId;
    } else if (sessionId && mongoose.isValidObjectId(String(sessionId))) {
      const studIds = await Student.find({
        tenantId: req.tenantId,
        sessionId,
      }).distinct('_id');
      filter.studentId = { $in: studIds };
    }
    const list = await StudentFeeBalance.find(filter)
      .populate({ path: 'studentId', populate: { path: 'darjahId', select: 'name code' } })
      .sort({ due: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/balances/student/:studentId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.studentId)) {
      return res.status(400).json({ message: 'Invalid student id' });
    }
    let doc = await StudentFeeBalance.findOne({
      tenantId: req.tenantId,
      studentId: req.params.studentId,
    }).populate('studentId');
    if (!doc) {
      return res.json({
        studentId: req.params.studentId,
        balance: 0,
        advance: 0,
        due: 0,
        customMonthlyAmount: null,
      });
    }
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.post('/balances', async (req, res, next) => {
  try {
    const doc = await StudentFeeBalance.create({ ...req.body, tenantId: req.tenantId });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/balances/:id', async (req, res, next) => {
  try {
    const doc = await StudentFeeBalance.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: req.body },
      { new: true }
    ).populate('studentId');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

/** Set / adjust due for a student (creates balance if needed) */
router.post('/balances/upsert-due', async (req, res, next) => {
  try {
    const { studentId, due, customMonthlyAmount, notes, sessionId, reason } = req.body || {};
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'studentId required' });
    }
    const existing = await StudentFeeBalance.findOne({ tenantId: req.tenantId, studentId });
    const before = existing ? snapshotBalance(existing) : null;

    const set = {};
    if (due != null) set.due = Number(due) || 0;
    if (customMonthlyAmount != null) {
      set.customMonthlyAmount =
        customMonthlyAmount === '' || customMonthlyAmount == null
          ? null
          : Number(customMonthlyAmount);
    }
    if (notes != null) set.notes = String(notes);
    if (sessionId) set.sessionId = sessionId;

    const doc = await StudentFeeBalance.findOneAndUpdate(
      { tenantId: req.tenantId, studentId },
      {
        $set: set,
        $setOnInsert: {
          tenantId: req.tenantId,
          studentId,
          balance: 0,
          advance: 0,
          maafi: 0,
          due: set.due != null ? set.due : 0,
        },
      },
      { upsert: true, new: true }
    ).populate('studentId');

    await writeFeeAudit({
      tenantId: req.tenantId,
      sessionId: sessionId || doc.sessionId,
      studentId,
      balanceId: doc._id,
      action: 'adjust_due',
      amount: set.due != null ? set.due : 0,
      beforeValue: before,
      afterValue: snapshotBalance(doc),
      reason: reason || notes || 'Due adjusted',
      changedBy: req.user?.userId || req.user?._id || null,
    });

    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.post('/balances/:id/collect', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid balance id' });
    }
    const before = await StudentFeeBalance.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    const beforeSnap = before ? snapshotBalance(before) : null;
    const tx = await recordFeeCollection({
      tenantId: req.tenantId,
      balanceId: req.params.id,
      amount: req.body.amount,
      sessionId: req.body.sessionId,
      accountId: req.body.accountId,
      paymentMethod: req.body.paymentMethod,
      referenceNo: req.body.referenceNo,
      periodMonth: req.body.periodMonth,
      date: req.body.date,
      notes: req.body.notes,
    });
    const after = await StudentFeeBalance.findById(req.params.id);
    await writeFeeAudit({
      tenantId: req.tenantId,
      sessionId: req.body.sessionId || after?.sessionId,
      studentId: after?.studentId,
      balanceId: req.params.id,
      action: 'collect',
      amount: req.body.amount,
      beforeValue: beforeSnap,
      afterValue: after ? snapshotBalance(after) : null,
      reason: req.body.notes || req.body.referenceNo || '',
      changedBy: req.user?.userId || req.user?._id || null,
    });
    res.status(201).json(tx);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

/**
 * معافی (maafi / waiver): subtract amount from due and add to maafi total.
 * Requires reason for audit.
 */
router.post('/balances/:id/maafi', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid balance id' });
    }
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 3) {
      return res.status(400).json({ message: 'Reason is required for maafi (min. 3 characters)' });
    }
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const bal = await StudentFeeBalance.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!bal) return res.status(404).json({ message: 'Not found' });

    const due = Math.max(0, Number(bal.due) || 0);
    if (due <= 0) {
      return res.status(400).json({ message: 'No outstanding due — maafi cannot be applied' });
    }
    if (amount > due + 1e-6) {
      return res.status(400).json({
        message: `Maafi amount cannot exceed outstanding due (${due})`,
      });
    }

    const before = snapshotBalance(bal);
    const waive = Math.min(amount, due);
    bal.due = due - waive;
    bal.maafi = (Number(bal.maafi) || 0) + waive;
    await bal.save();

    const after = snapshotBalance(bal);
    await writeFeeAudit({
      tenantId: req.tenantId,
      sessionId: req.body.sessionId || bal.sessionId,
      studentId: bal.studentId,
      balanceId: bal._id,
      action: 'maafi',
      amount: waive,
      beforeValue: before,
      afterValue: after,
      reason,
      changedBy: req.user?.userId || req.user?._id || null,
    });

    const populated = await StudentFeeBalance.findById(bal._id).populate({
      path: 'studentId',
      populate: { path: 'darjahId', select: 'name code' },
    });
    res.json(populated);
  } catch (e) {
    next(e);
  }
});

/**
 * Apply credit balance against due (بیلنس سے واجب منہا).
 * Requires reason for audit.
 */
router.post('/balances/:id/apply-balance', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid balance id' });
    }
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 3) {
      return res.status(400).json({ message: 'Reason is required (min. 3 characters)' });
    }

    const bal = await StudentFeeBalance.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!bal) return res.status(404).json({ message: 'Not found' });

    const credit = Math.max(0, Number(bal.balance) || 0);
    const due = Math.max(0, Number(bal.due) || 0);
    if (credit <= 0) {
      return res.status(400).json({ message: 'No credit balance to apply' });
    }
    if (due <= 0) {
      return res.status(400).json({ message: 'No outstanding due to reduce' });
    }

    let applyAmt = Math.min(credit, due);
    if (req.body?.amount != null && req.body.amount !== '') {
      const requested = Number(req.body.amount);
      if (!Number.isFinite(requested) || requested <= 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
      }
      applyAmt = Math.min(applyAmt, requested);
    }

    const before = snapshotBalance(bal);
    bal.balance = credit - applyAmt;
    bal.due = due - applyAmt;
    await bal.save();

    const after = snapshotBalance(bal);
    await writeFeeAudit({
      tenantId: req.tenantId,
      sessionId: req.body.sessionId || bal.sessionId,
      studentId: bal.studentId,
      balanceId: bal._id,
      action: 'apply_balance',
      amount: applyAmt,
      beforeValue: before,
      afterValue: after,
      reason,
      changedBy: req.user?.userId || req.user?._id || null,
    });

    const populated = await StudentFeeBalance.findById(bal._id).populate({
      path: 'studentId',
      populate: { path: 'darjahId', select: 'name code' },
    });
    res.json(populated);
  } catch (e) {
    next(e);
  }
});

router.get('/audit', async (req, res, next) => {
  try {
    const { sessionId, studentId, limit } = req.query || {};
    const filter = { tenantId: req.tenantId };
    if (sessionId && mongoose.isValidObjectId(String(sessionId))) filter.sessionId = sessionId;
    if (studentId && mongoose.isValidObjectId(String(studentId))) filter.studentId = studentId;
    const lim = Math.min(Number(limit) || 50, 200);
    const list = await FeeAuditLog.find(filter)
      .populate('studentId', 'name studentId')
      .populate('changedBy', 'name email')
      .sort({ changedAt: -1 })
      .limit(lim);
    res.json(list);
  } catch (e) {
    next(e);
  }
});

/**
 * Delete a student fee balance row. Requires a reason (audit).
 */
router.post('/balances/:id/delete', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid balance id' });
    }
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 5) {
      return res.status(400).json({
        message: 'Deletion reason is required (at least 5 characters)',
      });
    }

    const bal = await StudentFeeBalance.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!bal) return res.status(404).json({ message: 'Not found' });

    const before = snapshotBalance(bal);
    const studentId = bal.studentId;
    const sessionId = req.body.sessionId || bal.sessionId;

    await writeFeeAudit({
      tenantId: req.tenantId,
      sessionId,
      studentId,
      balanceId: bal._id,
      action: 'delete_balance',
      amount: Number(bal.due) || 0,
      beforeValue: before,
      afterValue: null,
      reason,
      changedBy: req.user?.userId || req.user?._id || null,
    });

    await bal.deleteOne();
    res.json({ ok: true, auditRecorded: true });
  } catch (e) {
    next(e);
  }
});

export default router;
