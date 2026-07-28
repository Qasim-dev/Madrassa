import { Router } from 'express';
import { SubjectBook } from '../models/SubjectBook.js';
import { Subject } from '../models/Subject.js';
import { Darjah } from '../models/Darjah.js';
import { sanitizeUpdateBody } from '../utils/sanitizeUpdateBody.js';

const router = Router();

function validateTotalPages(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) {
    const err = new Error('totalPages must be a positive number');
    err.status = 400;
    throw err;
  }
  return n;
}

async function assertBookRefs(tenantId, subjectId, darjahId) {
  const [subject, darjah] = await Promise.all([
    Subject.findOne({ _id: subjectId, tenantId }),
    Darjah.findOne({ _id: darjahId, tenantId }),
  ]);
  if (!subject || !darjah) {
    const err = new Error('Invalid Subajat or darjah');
    err.status = 400;
    throw err;
  }
  if (String(subject.sessionId) !== String(darjah.sessionId)) {
    const err = new Error('Subajat and darjah must belong to the same session');
    err.status = 400;
    throw err;
  }
  const sid = String(subject._id);
  const linked = (darjah.subjectIds || []).some((x) => String(x._id || x) === sid);
  if (!linked) {
    const err = new Error('Subajat must be linked to this darjah (درجات) first');
    err.status = 400;
    throw err;
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { subjectId, darjahId, sessionId } = req.query;
    const filter = { tenantId: req.tenantId };

    if (sessionId) {
      const subIds = await Subject.find({ tenantId: req.tenantId, sessionId }).distinct('_id');
      const djIds = await Darjah.find({ tenantId: req.tenantId, sessionId }).distinct('_id');
      const subSet = new Set(subIds.map((id) => String(id)));
      const djSet = new Set(djIds.map((id) => String(id)));
      if (subjectId && !subSet.has(String(subjectId))) {
        return res.json([]);
      }
      if (darjahId && !djSet.has(String(darjahId))) {
        return res.json([]);
      }
      if (subjectId) filter.subjectId = subjectId;
      else filter.subjectId = { $in: subIds };
      if (darjahId) filter.darjahId = darjahId;
      else filter.darjahId = { $in: djIds };
    } else {
      if (subjectId) filter.subjectId = subjectId;
      if (darjahId) filter.darjahId = darjahId;
    }

    const list = await SubjectBook.find(filter)
      .populate({ path: 'subjectId', populate: { path: 'sessionId', select: 'title' } })
      .populate({ path: 'darjahId', populate: { path: 'sessionId', select: 'title' } })
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await SubjectBook.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate({ path: 'subjectId', populate: { path: 'sessionId', select: 'title' } })
      .populate({ path: 'darjahId', populate: { path: 'sessionId', select: 'title' } });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { subjectId, darjahId } = req.body;
    if (!subjectId || !darjahId) {
      return res.status(400).json({ message: 'subjectId and darjahId are required' });
    }
    await assertBookRefs(req.tenantId, subjectId, darjahId);
    const totalPages = validateTotalPages(req.body.totalPages);
    const doc = await SubjectBook.create({
      ...req.body,
      ...(totalPages != null ? { totalPages } : {}),
      tenantId: req.tenantId,
    });
    const populated = await SubjectBook.findOne({ _id: doc._id, tenantId: req.tenantId })
      .populate({ path: 'subjectId', populate: { path: 'sessionId', select: 'title' } })
      .populate({ path: 'darjahId', populate: { path: 'sessionId', select: 'title' } });
    res.status(201).json(populated);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await SubjectBook.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const subjectId = req.body.subjectId ?? existing.subjectId;
    const darjahId = req.body.darjahId ?? existing.darjahId;
    await assertBookRefs(req.tenantId, subjectId, darjahId);
    const update = sanitizeUpdateBody(req.body);
    if (req.body.totalPages !== undefined) {
      update.totalPages = validateTotalPages(req.body.totalPages);
    }
    const doc = await SubjectBook.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate({ path: 'subjectId', populate: { path: 'sessionId', select: 'title' } })
      .populate({ path: 'darjahId', populate: { path: 'sessionId', select: 'title' } });
    res.json(doc);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await SubjectBook.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
