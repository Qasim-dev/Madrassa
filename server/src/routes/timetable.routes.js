import { Router } from 'express';
import { TimeSlot } from '../models/TimeSlot.js';
import { TimetableEntry } from '../models/TimetableEntry.js';

const router = Router();

router.get('/slots', async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });
    const list = await TimeSlot.find({ tenantId: req.tenantId, sessionId }).sort({ sortOrder: 1, startTime: 1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/slots', async (req, res, next) => {
  try {
    const doc = await TimeSlot.create({ ...req.body, tenantId: req.tenantId });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/slots/:id', async (req, res, next) => {
  try {
    const doc = await TimeSlot.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/slots/:id', async (req, res, next) => {
  try {
    const doc = await TimeSlot.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    await TimetableEntry.deleteMany({ tenantId: req.tenantId, slotId: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/entries', async (req, res, next) => {
  try {
    const { sessionId, darjahId } = req.query;
    if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });
    const filter = { tenantId: req.tenantId, sessionId };
    if (darjahId) filter.darjahId = darjahId;
    const list = await TimetableEntry.find(filter)
      .populate('sessionId')
      .populate('darjahId')
      .populate('slotId')
      .populate('teacherId')
      .populate('subjectId')
      .populate('bookId')
      .sort({ day: 1, createdAt: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

async function assertNoTeacherConflict({ tenantId, sessionId, teacherId, day, slotId, ignoreId }) {
  const q = { tenantId, sessionId, teacherId, day, slotId };
  if (ignoreId) q._id = { $ne: ignoreId };
  const existing = await TimetableEntry.findOne(q);
  if (existing) {
    const err = new Error('Teacher conflict: already assigned at this time');
    err.statusCode = 409;
    throw err;
  }
}

async function assertNoDarjahConflict({ tenantId, sessionId, darjahId, day, slotId, ignoreId }) {
  const q = { tenantId, sessionId, darjahId, day, slotId };
  if (ignoreId) q._id = { $ne: ignoreId };
  const existing = await TimetableEntry.findOne(q);
  if (existing) {
    const err = new Error('Class conflict: this Darjah already has a lesson in this period');
    err.statusCode = 409;
    throw err;
  }
}

router.post('/entries', async (req, res, next) => {
  try {
    const body = { ...req.body, tenantId: req.tenantId };
    await assertNoTeacherConflict({
      tenantId: req.tenantId,
      sessionId: body.sessionId,
      teacherId: body.teacherId,
      day: body.day,
      slotId: body.slotId,
    });
    await assertNoDarjahConflict({
      tenantId: req.tenantId,
      sessionId: body.sessionId,
      darjahId: body.darjahId,
      day: body.day,
      slotId: body.slotId,
    });
    const doc = await TimetableEntry.create(body);
    const populated = await TimetableEntry.findOne({ _id: doc._id, tenantId: req.tenantId })
      .populate('sessionId')
      .populate('darjahId')
      .populate('slotId')
      .populate('teacherId')
      .populate('subjectId')
      .populate('bookId');
    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
});

router.put('/entries/:id', async (req, res, next) => {
  try {
    const existing = await TimetableEntry.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const merged = {
      sessionId: req.body.sessionId !== undefined ? req.body.sessionId : existing.sessionId,
      darjahId: req.body.darjahId !== undefined ? req.body.darjahId : existing.darjahId,
      teacherId: req.body.teacherId !== undefined ? req.body.teacherId : existing.teacherId,
      day: req.body.day !== undefined ? req.body.day : existing.day,
      slotId: req.body.slotId !== undefined ? req.body.slotId : existing.slotId,
    };
    await assertNoTeacherConflict({
      tenantId: req.tenantId,
      sessionId: merged.sessionId,
      teacherId: merged.teacherId,
      day: merged.day,
      slotId: merged.slotId,
      ignoreId: existing._id,
    });
    await assertNoDarjahConflict({
      tenantId: req.tenantId,
      sessionId: merged.sessionId,
      darjahId: merged.darjahId,
      day: merged.day,
      slotId: merged.slotId,
      ignoreId: existing._id,
    });

    const doc = await TimetableEntry.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('sessionId')
      .populate('darjahId')
      .populate('slotId')
      .populate('teacherId')
      .populate('subjectId')
      .populate('bookId');
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/entries/:id', async (req, res, next) => {
  try {
    const doc = await TimetableEntry.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;

