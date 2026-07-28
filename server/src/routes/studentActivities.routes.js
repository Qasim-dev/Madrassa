import mongoose from 'mongoose';
import { Router } from 'express';
import { StudentActivityCategory } from '../models/StudentActivityCategory.js';
import { StudentDailyActivity, StudentDailyRemark } from '../models/StudentDailyActivity.js';
import { Student } from '../models/Student.js';
import {
  ensureDefaultActivityCategories,
  normalizeActivityValue,
} from '../services/studentActivitySeed.service.js';
import { withNotDeleted, NOT_DELETED } from '../utils/softDelete.js';

const router = Router();

function dateKey(d) {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return String(d);
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toISOString().slice(0, 10);
}

function parseDate(d) {
  const key = dateKey(d);
  if (!key) return null;
  return new Date(`${key}T12:00:00.000Z`);
}

/** GET /categories — list (+ seed defaults if empty) */
router.get('/categories', async (req, res, next) => {
  try {
    const { activeOnly } = req.query;
    let items = await ensureDefaultActivityCategories(req.tenantId, req.user?._id);
    if (activeOnly === '1' || activeOnly === 'true') {
      items = items.filter((c) => c.isActive);
    }
    res.json(items);
  } catch (e) {
    next(e);
  }
});

/** POST /categories */
router.post('/categories', async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = body.name || {};
    if (!name.ur && !name.en) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    const maxOrder = await StudentActivityCategory.findOne({ tenantId: req.tenantId })
      .sort({ displayOrder: -1 })
      .select('displayOrder')
      .lean();
    const doc = await StudentActivityCategory.create({
      tenantId: req.tenantId,
      sessionId: body.sessionId || null,
      key: body.key ? String(body.key).trim().toLowerCase() : '',
      name: { ur: name.ur || '', en: name.en || '' },
      description: body.description || { ur: '', en: '' },
      icon: body.icon || 'star',
      color: body.color || '#0f8f5f',
      displayOrder: body.displayOrder ?? (maxOrder?.displayOrder || 0) + 10,
      defaultScore: body.defaultScore ?? null,
      maxScore: body.maxScore ?? 5,
      minScore: body.minScore ?? 0,
      ratingType: body.ratingType || 'stars',
      gradeOptions: body.gradeOptions,
      isRequired: Boolean(body.isRequired),
      isActive: body.isActive !== false,
      createdBy: req.user?._id || null,
    });
    res.status(201).json(doc);
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: 'Category key already exists' });
    next(e);
  }
});

/** PATCH /categories/:id */
router.patch('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    const body = req.body || {};
    const cat = await StudentActivityCategory.findOne({ _id: id, tenantId: req.tenantId });
    if (!cat) return res.status(404).json({ message: 'Category not found' });

    const fields = [
      'icon',
      'color',
      'displayOrder',
      'defaultScore',
      'maxScore',
      'minScore',
      'ratingType',
      'isRequired',
      'isActive',
      'gradeOptions',
      'sessionId',
    ];
    for (const f of fields) {
      if (body[f] !== undefined) cat[f] = body[f];
    }
    if (body.name) {
      cat.name = {
        ur: body.name.ur != null ? body.name.ur : cat.name?.ur || '',
        en: body.name.en != null ? body.name.en : cat.name?.en || '',
      };
    }
    if (body.description) {
      cat.description = {
        ur: body.description.ur != null ? body.description.ur : cat.description?.ur || '',
        en: body.description.en != null ? body.description.en : cat.description?.en || '',
      };
    }
    if (body.key !== undefined) cat.key = String(body.key || '').trim().toLowerCase();
    await cat.save();
    res.json(cat);
  } catch (e) {
    next(e);
  }
});

/** POST /categories/reorder — body: { orderedIds: [] } */
router.post('/categories/reorder', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
    const ops = ids
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id, i) => ({
        updateOne: {
          filter: { _id: id, tenantId: req.tenantId },
          update: { $set: { displayOrder: (i + 1) * 10 } },
        },
      }));
    if (ops.length) await StudentActivityCategory.bulkWrite(ops);
    const items = await StudentActivityCategory.find({ tenantId: req.tenantId })
      .sort({ displayOrder: 1 })
      .lean();
    res.json(items);
  } catch (e) {
    next(e);
  }
});

/** DELETE /categories/:id — soft archive (deactivate) by default; ?hard=1 hard delete if unused */
router.delete('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    const cat = await StudentActivityCategory.findOne({ _id: id, tenantId: req.tenantId });
    if (!cat) return res.status(404).json({ message: 'Category not found' });

    if (req.query.hard === '1') {
      const used = await StudentDailyActivity.countDocuments({
        tenantId: req.tenantId,
        categoryId: id,
      });
      if (used > 0) {
        return res.status(400).json({ message: 'Category has records — deactivate instead' });
      }
      await cat.deleteOne();
      return res.json({ ok: true, deleted: true });
    }
    cat.isActive = false;
    await cat.save();
    res.json(cat);
  } catch (e) {
    next(e);
  }
});

/** GET /daily — sheet for date + darjah (+ optional subject) */
router.get('/daily', async (req, res, next) => {
  try {
    const key = dateKey(req.query.date);
    if (!key) return res.status(400).json({ message: 'date is required (YYYY-MM-DD)' });
    const darjahId = req.query.darjahId;
    const subjectId = req.query.subjectId;
    const sessionId = req.query.sessionId;

    const studentFilter = withNotDeleted({ tenantId: req.tenantId });
    if (darjahId && mongoose.isValidObjectId(darjahId)) studentFilter.darjahId = darjahId;
    if (subjectId && mongoose.isValidObjectId(subjectId)) studentFilter.subjectId = subjectId;
    if (sessionId && mongoose.isValidObjectId(sessionId)) studentFilter.sessionId = sessionId;

    const students = await Student.find(studentFilter)
      .select('studentId name rollNumber photoUrl darjahId subjectId sessionId')
      .populate('darjahId', 'name code')
      .populate('subjectId', 'name')
      .sort({ rollNumber: 1, studentId: 1 })
      .lean();

    const categories = await ensureDefaultActivityCategories(req.tenantId, req.user?._id);
    const activeCategories = categories.filter((c) => c.isActive);

    const studentIds = students.map((s) => s._id);
    const activities = studentIds.length
      ? await StudentDailyActivity.find({
          tenantId: req.tenantId,
          activityDateKey: key,
          studentId: { $in: studentIds },
        }).lean()
      : [];
    const remarks = studentIds.length
      ? await StudentDailyRemark.find({
          tenantId: req.tenantId,
          activityDateKey: key,
          studentId: { $in: studentIds },
        }).lean()
      : [];

    const byStudent = new Map();
    for (const a of activities) {
      const sid = String(a.studentId);
      if (!byStudent.has(sid)) byStudent.set(sid, {});
      byStudent.get(sid)[String(a.categoryId)] = {
        _id: a._id,
        value: a.value,
        score: a.score,
        grade: a.grade,
        remarks: a.remarks,
        status: a.status,
      };
    }
    const remarkByStudent = new Map(remarks.map((r) => [String(r.studentId), r]));

    res.json({
      date: key,
      categories: activeCategories,
      students: students.map((s) => ({
        student: s,
        cells: byStudent.get(String(s._id)) || {},
        remarks: remarkByStudent.get(String(s._id))?.remarks || '',
        remarkTone: remarkByStudent.get(String(s._id))?.tone || 'neutral',
      })),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /daily/bulk
 * body: {
 *   date, sessionId, darjahId, subjectId,
 *   entries: [{ studentId, categoryId, value, remarks? }],
 *   studentRemarks: [{ studentId, remarks, tone? }]
 * }
 */
router.post('/daily/bulk', async (req, res, next) => {
  try {
    const body = req.body || {};
    const key = dateKey(body.date);
    const activityDate = parseDate(body.date);
    if (!key || !activityDate) return res.status(400).json({ message: 'date is required' });

    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (entries.length > 20000) {
      return res.status(400).json({ message: 'Too many entries (max 20000)' });
    }

    const catIds = [...new Set(entries.map((e) => String(e.categoryId)).filter(Boolean))];
    const categories = await StudentActivityCategory.find({
      tenantId: req.tenantId,
      _id: { $in: catIds.filter((id) => mongoose.isValidObjectId(id)) },
    }).lean();
    const catMap = new Map(categories.map((c) => [String(c._id), c]));

    const sessionId =
      body.sessionId && mongoose.isValidObjectId(body.sessionId) ? body.sessionId : null;
    const darjahId =
      body.darjahId && mongoose.isValidObjectId(body.darjahId) ? body.darjahId : null;
    const subjectId =
      body.subjectId && mongoose.isValidObjectId(body.subjectId) ? body.subjectId : null;
    const userId = req.user?._id || null;

    const ops = [];
    for (const e of entries) {
      if (!mongoose.isValidObjectId(e.studentId) || !mongoose.isValidObjectId(e.categoryId)) continue;
      const cat = catMap.get(String(e.categoryId));
      if (!cat) continue;
      const norm = normalizeActivityValue(cat, e.value);
      ops.push({
        updateOne: {
          filter: {
            tenantId: req.tenantId,
            activityDateKey: key,
            studentId: e.studentId,
            categoryId: e.categoryId,
          },
          update: {
            $set: {
              sessionId,
              darjahId,
              subjectId,
              activityDate,
              activityDateKey: key,
              value: norm.value,
              score: norm.score,
              grade: norm.grade,
              remarks: e.remarks != null ? String(e.remarks) : '',
              status: body.status === 'draft' ? 'draft' : 'submitted',
              updatedBy: userId,
              teacherId: body.teacherId || null,
            },
            $setOnInsert: {
              tenantId: req.tenantId,
              createdBy: userId,
            },
          },
          upsert: true,
        },
      });
    }
    if (ops.length) await StudentDailyActivity.bulkWrite(ops, { ordered: false });

    const remarkRows = Array.isArray(body.studentRemarks) ? body.studentRemarks : [];
    const remarkOps = [];
    for (const r of remarkRows) {
      if (!mongoose.isValidObjectId(r.studentId)) continue;
      remarkOps.push({
        updateOne: {
          filter: {
            tenantId: req.tenantId,
            activityDateKey: key,
            studentId: r.studentId,
          },
          update: {
            $set: {
              sessionId,
              darjahId,
              activityDate,
              activityDateKey: key,
              remarks: r.remarks != null ? String(r.remarks) : '',
              tone: r.tone || 'neutral',
              updatedBy: userId,
            },
            $setOnInsert: {
              tenantId: req.tenantId,
              createdBy: userId,
            },
          },
          upsert: true,
        },
      });
    }
    if (remarkOps.length) await StudentDailyRemark.bulkWrite(remarkOps, { ordered: false });

    res.json({ ok: true, saved: ops.length, remarksSaved: remarkOps.length });
  } catch (e) {
    next(e);
  }
});

/** GET /history?studentId&from&to */
router.get('/history', async (req, res, next) => {
  try {
    const studentId = req.query.studentId;
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'studentId is required' });
    }
    const from = dateKey(req.query.from) || '1970-01-01';
    const to = dateKey(req.query.to) || '2999-12-31';

    const student = await Student.findOne({ _id: studentId, tenantId: req.tenantId, ...NOT_DELETED })
      .select('studentId name rollNumber photoUrl darjahId subjectId sessionId phone')
      .populate('darjahId', 'name code')
      .populate('subjectId', 'name')
      .populate('sessionId', 'title')
      .lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const items = await StudentDailyActivity.find({
      tenantId: req.tenantId,
      studentId,
      activityDateKey: { $gte: from, $lte: to },
    })
      .populate('categoryId', 'name icon color ratingType maxScore gradeOptions')
      .sort({ activityDateKey: -1, createdAt: -1 })
      .limit(2000)
      .lean();

    const remarks = await StudentDailyRemark.find({
      tenantId: req.tenantId,
      studentId,
      activityDateKey: { $gte: from, $lte: to },
    })
      .sort({ activityDateKey: -1 })
      .lean();

    // Summary by category for detail header
    const byCategory = {};
    for (const item of items) {
      const cid = String(item.categoryId?._id || item.categoryId || '');
      if (!cid || item.score == null) continue;
      if (!byCategory[cid]) byCategory[cid] = { sum: 0, n: 0, category: item.categoryId };
      byCategory[cid].sum += Number(item.score);
      byCategory[cid].n += 1;
    }
    const categoryAverages = Object.values(byCategory).map((x) => ({
      category: x.category,
      avgScore: x.n ? x.sum / x.n : null,
      count: x.n,
    }));

    res.json({ student, items, remarks, categoryAverages, from, to });
  } catch (e) {
    next(e);
  }
});

/** GET /analytics/summary?from&to&darjahId&sessionId */
router.get('/analytics/summary', async (req, res, next) => {
  try {
    const from = dateKey(req.query.from);
    const to = dateKey(req.query.to);
    const match = { tenantId: new mongoose.Types.ObjectId(req.tenantId) };
    if (from && to) match.activityDateKey = { $gte: from, $lte: to };
    if (req.query.darjahId && mongoose.isValidObjectId(req.query.darjahId)) {
      match.darjahId = new mongoose.Types.ObjectId(req.query.darjahId);
    }
    if (req.query.sessionId && mongoose.isValidObjectId(req.query.sessionId)) {
      match.sessionId = new mongoose.Types.ObjectId(req.query.sessionId);
    }

    const byCategory = await StudentDailyActivity.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$categoryId',
          avgScore: { $avg: '$score' },
          count: { $sum: 1 },
          lowCount: {
            $sum: {
              $cond: [{ $and: [{ $ne: ['$score', null] }, { $lte: ['$score', 2] }] }, 1, 0],
            },
          },
        },
      },
      { $sort: { avgScore: -1 } },
    ]);

    const byStudent = await StudentDailyActivity.aggregate([
      { $match: { ...match, score: { $ne: null } } },
      {
        $group: {
          _id: '$studentId',
          avgScore: { $avg: '$score' },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgScore: -1 } },
      { $limit: 20 },
    ]);

    const lowStudents = await StudentDailyActivity.aggregate([
      { $match: { ...match, score: { $ne: null } } },
      {
        $group: {
          _id: '$studentId',
          avgScore: { $avg: '$score' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gte: 3 }, avgScore: { $lte: 2.5 } } },
      { $sort: { avgScore: 1 } },
      { $limit: 20 },
    ]);

    const studentIds = [
      ...byStudent.map((x) => x._id),
      ...lowStudents.map((x) => x._id),
    ];
    const students = await Student.find({ _id: { $in: studentIds } })
      .select('name studentId rollNumber')
      .lean();
    const sMap = new Map(students.map((s) => [String(s._id), s]));

    const catIds = byCategory.map((x) => x._id);
    const cats = await StudentActivityCategory.find({ _id: { $in: catIds } })
      .select('name icon color')
      .lean();
    const cMap = new Map(cats.map((c) => [String(c._id), c]));

    const hydrate = (rows) =>
      rows.map((r) => ({
        ...r,
        student: sMap.get(String(r._id)) || null,
        category: cMap.get(String(r._id)) || null,
      }));

    res.json({
      byCategory: byCategory.map((r) => ({
        categoryId: r._id,
        category: cMap.get(String(r._id)) || null,
        avgScore: r.avgScore,
        count: r.count,
        lowCount: r.lowCount,
      })),
      topStudents: hydrate(byStudent),
      lowStudents: hydrate(lowStudents),
      pendingHint: null,
    });
  } catch (e) {
    next(e);
  }
});

/** GET /copy-day?fromDate&toDate&darjahId — copy values from one day to another (template) */
router.post('/daily/copy', async (req, res, next) => {
  try {
    const fromKey = dateKey(req.body?.fromDate);
    const toKey = dateKey(req.body?.toDate);
    const toDate = parseDate(req.body?.toDate);
    if (!fromKey || !toKey || !toDate) {
      return res.status(400).json({ message: 'fromDate and toDate are required' });
    }
    const filter = {
      tenantId: req.tenantId,
      activityDateKey: fromKey,
    };
    if (req.body?.darjahId && mongoose.isValidObjectId(req.body.darjahId)) {
      filter.darjahId = req.body.darjahId;
    }
    const source = await StudentDailyActivity.find(filter).lean();
    if (!source.length) return res.json({ ok: true, copied: 0 });

    const userId = req.user?._id || null;
    const ops = source.map((a) => ({
      updateOne: {
        filter: {
          tenantId: req.tenantId,
          activityDateKey: toKey,
          studentId: a.studentId,
          categoryId: a.categoryId,
        },
        update: {
          $set: {
            sessionId: a.sessionId,
            darjahId: a.darjahId,
            subjectId: a.subjectId,
            activityDate: toDate,
            activityDateKey: toKey,
            value: a.value,
            score: a.score,
            grade: a.grade,
            remarks: a.remarks,
            status: 'submitted',
            updatedBy: userId,
          },
          $setOnInsert: {
            tenantId: req.tenantId,
            createdBy: userId,
          },
        },
        upsert: true,
      },
    }));
    await StudentDailyActivity.bulkWrite(ops, { ordered: false });
    res.json({ ok: true, copied: ops.length });
  } catch (e) {
    next(e);
  }
});

export default router;
