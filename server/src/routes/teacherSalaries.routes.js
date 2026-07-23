import { Router } from 'express';
import mongoose from 'mongoose';
import { TeacherSalary } from '../models/TeacherSalary.js';
import { Teacher } from '../models/Teacher.js';
import { recordSalaryPayment } from '../services/financeFlows.js';

const router = Router();

async function assertTeacherInTenant(tenantId, teacherId) {
  const t = await Teacher.findOne({ _id: teacherId, tenantId });
  return !!t;
}

/** Salary slips for finance modal (pending / paid). */
router.get('/picklist', async (req, res, next) => {
  try {
    const { paymentStatus, sessionId } = req.query || {};
    const filter = { tenantId: req.tenantId };
    if (paymentStatus === 'pending' || paymentStatus === 'paid') {
      filter.paymentStatus = paymentStatus;
    }
    if (sessionId && mongoose.isValidObjectId(String(sessionId))) {
      const teacherIds = await Teacher.find({
        tenantId: req.tenantId,
        assignments: { $elemMatch: { sessionId } },
      }).distinct('_id');
      filter.teacherId = { $in: teacherIds };
    }
    const list = await TeacherSalary.find(filter)
      .populate({ path: 'teacherId', select: 'name parentage' })
      .sort({ createdAt: -1 })
      .limit(400)
      .lean();
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/overview', async (req, res, next) => {
  try {
    const list = await TeacherSalary.find({ tenantId: req.tenantId }).lean();
    let pendingCount = 0;
    let paidCount = 0;
    let totalNetPending = 0;
    let totalNetPaid = 0;
    list.forEach((s) => {
      const net = Number(s.netSalary) || 0;
      if (s.paymentStatus === 'paid') {
        paidCount += 1;
        totalNetPaid += net;
      } else {
        pendingCount += 1;
        totalNetPending += net;
      }
    });
    res.json({
      totalRecords: list.length,
      pendingCount,
      paidCount,
      totalNetPending,
      totalNetPaid,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { teacherId } = req.query;
    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      return res.status(400).json({ message: 'teacherId query is required' });
    }
    const ok = await assertTeacherInTenant(req.tenantId, teacherId);
    if (!ok) return res.status(404).json({ message: 'Teacher not found' });

    const list = await TeacherSalary.find({ tenantId: req.tenantId, teacherId })
      .sort({ fromDate: -1, createdAt: -1 })
      .lean();
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { teacherId, ...rest } = req.body || {};
    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      return res.status(400).json({ message: 'teacherId is required' });
    }
    const ok = await assertTeacherInTenant(req.tenantId, teacherId);
    if (!ok) return res.status(404).json({ message: 'Teacher not found' });

    const doc = await TeacherSalary.create({
      ...rest,
      teacherId,
      tenantId: req.tenantId,
    });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const doc = await TeacherSalary.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!doc) return res.status(404).json({ message: 'Not found' });

    const { teacherId, ...rest } = req.body || {};
    if (teacherId !== undefined) {
      if (!mongoose.isValidObjectId(teacherId)) {
        return res.status(400).json({ message: 'Invalid teacherId' });
      }
      const ok = await assertTeacherInTenant(req.tenantId, teacherId);
      if (!ok) return res.status(404).json({ message: 'Teacher not found' });
      doc.teacherId = teacherId;
    }
    Object.assign(doc, rest);
    await doc.save();
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

/** Pay slip: auto expense (خرچ) + mark paid — same as finance transaction with salary link */
router.post('/:id/pay', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const tx = await recordSalaryPayment({
      tenantId: req.tenantId,
      salaryId: req.params.id,
      sessionId: req.body.sessionId,
      accountId: req.body.accountId,
      paymentMethod: req.body.paymentMethod,
      referenceNo: req.body.referenceNo,
      date: req.body.date,
      notes: req.body.notes,
    });
    res.status(201).json(tx);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await TeacherSalary.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
