import crypto from 'crypto';
import mongoose from 'mongoose';
import { Router } from 'express';
import { IdCardTemplate } from '../models/IdCardTemplate.js';
import { StudentIdCard } from '../models/StudentIdCard.js';
import { IdCardPrintHistory } from '../models/IdCardPrintHistory.js';
import { Student } from '../models/Student.js';
import { withNotDeleted, NOT_DELETED } from '../utils/softDelete.js';

const router = Router();

const TEMPLATE_SEEDS = [
  {
    key: 'pvc-prestige',
    name: { ur: 'پریسٹیج PVC', en: 'Prestige PVC' },
    primaryColor: '#1a2b3c',
    accentColor: '#c9a227',
    secondaryColor: '#32a852',
    showQr: true,
    showBloodGroup: true,
    showAddress: true,
    defaultValidityMonths: 12,
  },
  {
    key: 'pvc-classic',
    name: { ur: 'کلاسیک سبز', en: 'Classic Green' },
    primaryColor: '#0f8f5f',
    accentColor: '#c9a227',
    secondaryColor: '#0b6e49',
    showQr: true,
    showBloodGroup: true,
    showAddress: true,
    defaultValidityMonths: 12,
  },
];

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function ensureTemplates(tenantId) {
  for (const seed of TEMPLATE_SEEDS) {
    await IdCardTemplate.findOneAndUpdate(
      { tenantId, key: seed.key },
      { $setOnInsert: { tenantId, ...seed, isActive: true } },
      { upsert: true, new: true }
    );
  }
  return IdCardTemplate.find({ tenantId, isActive: true }).sort({ key: 1 }).lean();
}

function buildStudentFilter(req) {
  const { q, sessionId, darjahId, subjectId, gender, gradeId } = req.query;
  const filter = withNotDeleted({ tenantId: req.tenantId });
  if (sessionId && mongoose.isValidObjectId(sessionId)) filter.sessionId = sessionId;
  if (darjahId && mongoose.isValidObjectId(darjahId)) filter.darjahId = darjahId;
  if (subjectId && mongoose.isValidObjectId(subjectId)) filter.subjectId = subjectId;
  if (gradeId && mongoose.isValidObjectId(gradeId)) filter.gradeId = gradeId;
  if (gender === 'male' || gender === 'female') filter.gender = gender;
  const qTrim = q != null ? String(q).trim() : '';
  if (qTrim) {
    const safe = escapeRegex(qTrim);
    const rx = new RegExp(safe, 'i');
    filter.$or = [
      { studentId: rx },
      { rollNumber: rx },
      { phone: rx },
      { 'name.ur': rx },
      { 'name.en': rx },
      { 'fatherName.ur': rx },
      { 'fatherName.en': rx },
    ];
  }
  return filter;
}

const studentPopulate = [
  { path: 'sessionId', select: 'title startDate endDate isActive' },
  { path: 'darjahId', select: 'name code' },
  { path: 'subjectId', select: 'name systemType' },
  { path: 'gradeId', select: 'name section' },
  { path: 'currentGradeId', select: 'name section' },
];

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function nextCardNumber(tenantId) {
  const count = await StudentIdCard.countDocuments({ tenantId });
  const n = String(count + 1).padStart(5, '0');
  return `IDC-${n}`;
}

router.get('/templates', async (req, res, next) => {
  try {
    const templates = await ensureTemplates(req.tenantId);
    res.json(templates);
  } catch (e) {
    next(e);
  }
});

router.get('/cards', async (req, res, next) => {
  try {
    await ensureTemplates(req.tenantId);
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));
    const studentFilter = buildStudentFilter(req);
    const status = req.query.status;

    const students = await Student.find(studentFilter).select('_id').lean();
    const studentIds = students.map((s) => s._id);

    const cardFilter = { tenantId: req.tenantId, studentId: { $in: studentIds } };
    if (status === 'active' || status === 'inactive' || status === 'revoked') {
      cardFilter.status = status;
    }
    if (req.query.sessionId && mongoose.isValidObjectId(req.query.sessionId)) {
      cardFilter.sessionId = req.query.sessionId;
    }

    // Hub lists students (with optional card join), not only existing cards
    const total = await Student.countDocuments(studentFilter);
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    const safePage = Math.min(page, totalPages);
    const items = await Student.find(studentFilter)
      .populate(studentPopulate)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean();

    const ids = items.map((s) => s._id);
    const sessionFilter = req.query.sessionId && mongoose.isValidObjectId(req.query.sessionId)
      ? { sessionId: req.query.sessionId }
      : {};
    const cards = await StudentIdCard.find({
      tenantId: req.tenantId,
      studentId: { $in: ids },
      ...sessionFilter,
    }).lean();
    const byStudent = new Map(cards.map((c) => [String(c.studentId), c]));

    res.json({
      items: items.map((s) => ({
        student: s,
        card: byStudent.get(String(s._id)) || null,
      })),
      pagination: { page: safePage, limit, total, totalPages },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/cards/generate', async (req, res, next) => {
  try {
    await ensureTemplates(req.tenantId);
    const {
      studentIds,
      sessionId,
      templateKey = 'pvc-prestige',
      bloodGroup,
      issueDate,
      expiryDate,
      validityMonths,
      filter,
    } = req.body || {};

    let ids = Array.isArray(studentIds)
      ? studentIds.filter((id) => mongoose.isValidObjectId(id))
      : [];

    if (!ids.length && filter && typeof filter === 'object') {
      const fakeReq = { tenantId: req.tenantId, query: filter };
      const sf = buildStudentFilter(fakeReq);
      const found = await Student.find(sf).select('_id').lean();
      ids = found.map((s) => s._id);
    }

    if (!ids.length) {
      return res.status(400).json({ message: 'No students selected for card generation' });
    }
    if (ids.length > 500) {
      return res.status(400).json({ message: 'Generate at most 500 cards at once' });
    }

    const tplKey = templateKey === 'pvc-classic' ? 'pvc-classic' : 'pvc-prestige';
    const templates = await ensureTemplates(req.tenantId);
    const tpl = templates.find((t) => t.key === tplKey) || templates[0];
    const months = Number(validityMonths) || tpl?.defaultValidityMonths || 12;

    const issue = issueDate ? new Date(issueDate) : new Date();
    const expiry = expiryDate ? new Date(expiryDate) : addMonths(issue, months);
    const session =
      sessionId && mongoose.isValidObjectId(sessionId) ? sessionId : null;

    const students = await Student.find({
      tenantId: req.tenantId,
      _id: { $in: ids },
      ...NOT_DELETED,
    })
      .select('_id sessionId')
      .lean();

    const created = [];
    for (const st of students) {
      const sid = st._id;
      const sess = session || st.sessionId || null;
      let card = await StudentIdCard.findOne({
        tenantId: req.tenantId,
        studentId: sid,
        sessionId: sess,
      });
      if (!card) {
        let cardNumber = await nextCardNumber(req.tenantId);
        // rare collision retry
        for (let i = 0; i < 3; i++) {
          const exists = await StudentIdCard.findOne({ tenantId: req.tenantId, cardNumber }).lean();
          if (!exists) break;
          cardNumber = await nextCardNumber(req.tenantId);
        }
        card = await StudentIdCard.create({
          tenantId: req.tenantId,
          studentId: sid,
          sessionId: sess,
          templateKey: tplKey,
          cardNumber,
          issueDate: issue,
          expiryDate: expiry,
          bloodGroup: bloodGroup != null ? String(bloodGroup) : '',
          qrToken: makeToken(),
          status: 'active',
        });
      } else {
        if (bloodGroup != null) card.bloodGroup = String(bloodGroup);
        if (issueDate) card.issueDate = issue;
        if (expiryDate || validityMonths) card.expiryDate = expiry;
        card.templateKey = tplKey;
        if (!card.qrToken) card.qrToken = makeToken();
        card.status = 'active';
        await card.save();
      }
      created.push(card.toObject ? card.toObject() : card);
    }

    res.json({ ok: true, count: created.length, cards: created });
  } catch (e) {
    next(e);
  }
});

router.get('/cards/print-payload', async (req, res, next) => {
  try {
    const idsRaw = req.query.ids ? String(req.query.ids).split(',') : [];
    let ids = idsRaw.filter((id) => mongoose.isValidObjectId(id.trim())).map((id) => id.trim());

    if (!ids.length) {
      const sf = buildStudentFilter(req);
      const found = await Student.find(sf).select('_id').sort({ createdAt: -1 }).limit(500).lean();
      ids = found.map((s) => String(s._id));
    }

    if (ids.length > 500) ids = ids.slice(0, 500);

    const students = await Student.find({
      tenantId: req.tenantId,
      _id: { $in: ids },
      ...NOT_DELETED,
    })
      .populate(studentPopulate)
      .lean();

    const sessionFilter =
      req.query.sessionId && mongoose.isValidObjectId(req.query.sessionId)
        ? { sessionId: req.query.sessionId }
        : {};

    const cards = await StudentIdCard.find({
      tenantId: req.tenantId,
      studentId: { $in: ids },
      ...sessionFilter,
    }).lean();
    const byStudent = new Map(cards.map((c) => [String(c.studentId), c]));

    // Preserve request order
    const order = new Map(ids.map((id, i) => [String(id), i]));
    students.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));

    res.json({
      items: students.map((s) => ({
        student: s,
        card: byStudent.get(String(s._id)) || null,
      })),
      truncated: idsRaw.length > 500,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/print-history', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const filter = { tenantId: req.tenantId };
    const total = await IdCardPrintHistory.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    const safePage = Math.min(page, totalPages);
    const items = await IdCardPrintHistory.find(filter)
      .populate('printedBy', 'username name')
      .sort({ printedAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean();
    res.json({ items, pagination: { page: safePage, limit, total, totalPages } });
  } catch (e) {
    next(e);
  }
});

router.post('/print-history', async (req, res, next) => {
  try {
    const {
      templateKey = 'pvc-prestige',
      copies = 1,
      printType = 'selected',
      studentIds = [],
      settings = {},
    } = req.body || {};

    const ids = (Array.isArray(studentIds) ? studentIds : []).filter((id) =>
      mongoose.isValidObjectId(id)
    );

    const doc = await IdCardPrintHistory.create({
      tenantId: req.tenantId,
      printedBy: req.user?.userId || null,
      printedAt: new Date(),
      templateKey,
      copies: Math.max(1, Number(copies) || 1),
      printType: ['single', 'selected', 'class', 'session', 'bulk'].includes(printType)
        ? printType
        : 'selected',
      studentIds: ids,
      settings,
    });

    if (ids.length) {
      await StudentIdCard.updateMany(
        { tenantId: req.tenantId, studentId: { $in: ids } },
        { $set: { printedAt: new Date(), printedBy: req.user?.userId || null } }
      );
    }

    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

export default router;
