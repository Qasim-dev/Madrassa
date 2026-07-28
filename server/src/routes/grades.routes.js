import { Router } from 'express';
import mongoose from 'mongoose';
import { Grade } from '../models/Grade.js';
import { sanitizeUpdateBody } from '../utils/sanitizeUpdateBody.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const filter = { tenantId: req.tenantId };
    if (sessionId && mongoose.isValidObjectId(sessionId)) filter.sessionId = sessionId;
    const list = await Grade.find(filter)
      .populate('sessionId')
      .populate('responsibleTeacherId')
      .sort({ year: 1, code: 1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Grade.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('sessionId')
      .populate('responsibleTeacherId');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const doc = await Grade.create({ ...req.body, tenantId: req.tenantId });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const doc = await Grade.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: sanitizeUpdateBody(req.body) },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Grade.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
