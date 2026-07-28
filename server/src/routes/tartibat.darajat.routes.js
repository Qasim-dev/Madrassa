import { Router } from 'express';
import { Darjah } from '../models/Darjah.js';
import { Subject } from '../models/Subject.js';
import { SubjectBook } from '../models/SubjectBook.js';
import { sanitizeUpdateBody } from '../utils/sanitizeUpdateBody.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

async function assertSubjectsMatchSession(tenantId, sessionId, subjectIds) {
  const ids = Array.isArray(subjectIds) ? subjectIds.filter(Boolean) : [];
  if (!ids.length || !sessionId) return;
  const subs = await Subject.find({ _id: { $in: ids }, tenantId });
  if (subs.length !== ids.length) {
    const err = new Error('Invalid Subajat reference');
    err.status = 400;
    throw err;
  }
  for (const s of subs) {
    if (String(s.sessionId) !== String(sessionId)) {
      const err = new Error('All Subajat must belong to the selected session');
      err.status = 400;
      throw err;
    }
  }
}

async function assertAssignmentsValid(tenantId, darjahId, subjectIds, assignments) {
  const rows = Array.isArray(assignments) ? assignments : [];
  if (!rows.length) return;

  const allowedSubjects = new Set((Array.isArray(subjectIds) ? subjectIds : []).map((x) => String(x)));

  // Validate subject ids belong to darjah
  for (const a of rows) {
    if (a?.subjectId && !allowedSubjects.has(String(a.subjectId))) {
      const err = new Error('Assignment subject must belong to the selected darjah');
      err.status = 400;
      throw err;
    }
  }

  // Validate book belongs to subject+darjah
  const bookIds = rows.map((a) => a?.bookId).filter(Boolean).map((x) => String(x));
  if (!bookIds.length) return;
  const books = await SubjectBook.find({ _id: { $in: bookIds }, tenantId }).select('_id subjectId darjahId').lean();
  if (books.length !== bookIds.length) {
    const err = new Error('Invalid book reference in assignments');
    err.status = 400;
    throw err;
  }
  const byId = new Map(books.map((b) => [String(b._id), b]));
  for (const a of rows) {
    if (!a?.bookId) continue;
    const b = byId.get(String(a.bookId));
    if (!b) continue;
    if (darjahId && String(b.darjahId) !== String(darjahId)) {
      const err = new Error('Book must belong to this darjah');
      err.status = 400;
      throw err;
    }
    if (a?.subjectId && String(b.subjectId) !== String(a.subjectId)) {
      const err = new Error('Book must match the selected subject');
      err.status = 400;
      throw err;
    }
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const filter = { tenantId: req.tenantId };
    if (sessionId) filter.sessionId = sessionId;
    const list = await Darjah.find(filter)
      .populate('sessionId')
      .populate('subjectIds')
      .populate('assignments.subjectId')
      .populate('assignments.teacherId')
      .populate('assignments.bookId')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/', requirePermission('tartibat:write'), async (req, res, next) => {
  try {
    await assertSubjectsMatchSession(req.tenantId, req.body.sessionId, req.body.subjectIds);
    await assertAssignmentsValid(req.tenantId, null, req.body.subjectIds, req.body.assignments);
    const doc = await Darjah.create({ ...req.body, tenantId: req.tenantId });
    const populated = await Darjah.findOne({ _id: doc._id, tenantId: req.tenantId })
      .populate('sessionId')
      .populate('subjectIds')
      .populate('assignments.subjectId')
      .populate('assignments.teacherId')
      .populate('assignments.bookId');
    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', requirePermission('tartibat:write'), async (req, res, next) => {
  try {
    const prev = await Darjah.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!prev) return res.status(404).json({ message: 'Not found' });
    const sessionId = req.body.sessionId ?? prev.sessionId;
    const subjectIds = req.body.subjectIds ?? prev.subjectIds;
    await assertSubjectsMatchSession(req.tenantId, sessionId, subjectIds);
    const mergedAssignments = req.body.assignments ?? prev.assignments;
    await assertAssignmentsValid(req.tenantId, req.params.id, subjectIds, mergedAssignments);
    const doc = await Darjah.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: sanitizeUpdateBody(req.body) },
      { new: true, runValidators: true }
    )
      .populate('sessionId')
      .populate('subjectIds')
      .populate('assignments.subjectId')
      .populate('assignments.teacherId')
      .populate('assignments.bookId');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    next(e);
  }
});

router.patch('/:id/subjects', requirePermission('tartibat:write'), async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.subjectIds) ? req.body.subjectIds : [];
    const unique = [...new Set(ids.map((x) => String(x)))].map((x) => x);
    const prev = await Darjah.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!prev) return res.status(404).json({ message: 'Not found' });
    await assertSubjectsMatchSession(req.tenantId, prev.sessionId, unique);
    const doc = await Darjah.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: { subjectIds: unique } },
      { new: true, runValidators: true }
    )
      .populate('sessionId')
      .populate('subjectIds');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    next(e);
  }
});

router.delete('/:id', requirePermission('tartibat:delete'), async (req, res, next) => {
  try {
    const doc = await Darjah.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;

