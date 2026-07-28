import { Router } from 'express';
import mongoose from 'mongoose';
import { requirePermission } from '../middleware/rbac.js';
import {
  listRecycleBin,
  getRecycleItem,
  restoreRecord,
  permanentDeleteRecord,
  bulkRestore,
  bulkPermanentDelete,
  validateRestore,
  validatePermanentDelete,
} from '../services/recycleBin.service.js';
import { RecycleBinItem } from '../models/RecycleBinItem.js';
import { Student } from '../models/Student.js';
import { Teacher } from '../models/Teacher.js';
import { FeeItem } from '../models/FeeItem.js';

const router = Router();

function userId(req) {
  return req.user?.userId || req.user?._id || null;
}

function recordNameFor(module, doc) {
  if (module === 'fee_item') return { ur: doc.title?.ur || '', en: doc.title?.en || '' };
  return { ur: doc.name?.ur || '', en: doc.name?.en || '' };
}

/** Backfill recycle-bin rows for legacy soft-deleted docs missing a registry entry. */
async function backfillLegacy(tenantId) {
  const pairs = [
    ['student', Student],
    ['teacher', Teacher],
    ['fee_item', FeeItem],
  ];
  for (const [module, Model] of pairs) {
    const deleted = await Model.find({
      tenantId,
      $or: [{ isDeleted: true }, { deletedAt: { $ne: null } }],
    }).limit(500);
    for (const doc of deleted) {
      const exists = await RecycleBinItem.findOne({
        tenantId,
        module,
        recordId: doc._id,
        status: 'deleted',
      }).lean();
      if (exists) continue;
      await RecycleBinItem.create({
        tenantId,
        module,
        recordId: doc._id,
        recordCollection: Model.collection.name,
        recordName: recordNameFor(module, doc),
        recordCode: module === 'student' ? doc.studentId || '' : doc.idCard || '',
        parentInfo: '',
        sessionId: doc.sessionId || null,
        deletedAt: doc.deletedAt || new Date(),
        deletedBy: doc.deletedBy || null,
        deleteReason: doc.deleteReason || '',
        status: 'deleted',
      });
    }
  }
}

router.get('/', requirePermission('recycle:read'), async (req, res, next) => {
  try {
    if (req.query.sync === '1') await backfillLegacy(req.tenantId);
    const data = await listRecycleBin(req.tenantId, req.query);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', requirePermission('recycle:read'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const data = await getRecycleItem(req.tenantId, req.params.id);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.get('/:id/validate-restore', requirePermission('recycle:restore'), async (req, res, next) => {
  try {
    const item = await RecycleBinItem.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
      status: 'deleted',
    }).lean();
    if (!item) return res.status(404).json({ message: 'Not found' });
    const result = await validateRestore(item.module, req.tenantId, item.recordId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/:id/validate-purge', requirePermission('recycle:purge'), async (req, res, next) => {
  try {
    const item = await RecycleBinItem.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
      status: 'deleted',
    }).lean();
    if (!item) return res.status(404).json({ message: 'Not found' });
    const result = await validatePermanentDelete(item.module, req.tenantId, item.recordId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/restore', requirePermission('recycle:restore'), async (req, res, next) => {
  try {
    const id = req.body?.id || req.body?.recycleItemId;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    const item = await restoreRecord({
      recycleItemId: id,
      tenantId: req.tenantId,
      userId: userId(req),
      req,
    });
    res.json({ ok: true, item });
  } catch (e) {
    next(e);
  }
});

router.post('/bulk-restore', requirePermission('recycle:restore'), async (req, res, next) => {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter((id) =>
      mongoose.isValidObjectId(id)
    );
    if (!ids.length) return res.status(400).json({ message: 'No ids provided' });
    const results = await bulkRestore({
      ids,
      tenantId: req.tenantId,
      userId: userId(req),
      req,
    });
    res.json({ ok: true, results });
  } catch (e) {
    next(e);
  }
});

router.post('/permanent/:id', requirePermission('recycle:purge'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const item = await permanentDeleteRecord({
      recycleItemId: req.params.id,
      tenantId: req.tenantId,
      userId: userId(req),
      req,
      confirmText: req.body?.confirmText,
      force: Boolean(req.body?.force),
    });
    res.json({ ok: true, item });
  } catch (e) {
    next(e);
  }
});

router.post('/bulk-permanent', requirePermission('recycle:purge'), async (req, res, next) => {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter((id) =>
      mongoose.isValidObjectId(id)
    );
    if (!ids.length) return res.status(400).json({ message: 'No ids provided' });
    const results = await bulkPermanentDelete({
      ids,
      tenantId: req.tenantId,
      userId: userId(req),
      req,
      confirmText: req.body?.confirmText,
    });
    res.json({ ok: true, results });
  } catch (e) {
    next(e);
  }
});

export default router;
