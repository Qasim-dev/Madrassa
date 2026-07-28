import mongoose from 'mongoose';
import { Student } from '../models/Student.js';
import { Teacher } from '../models/Teacher.js';
import { FeeItem } from '../models/FeeItem.js';
import { Session } from '../models/Session.js';
import { Darjah } from '../models/Darjah.js';
import { Subject } from '../models/Subject.js';
import { Tenant } from '../models/Tenant.js';
import { StudentFeeBalance } from '../models/StudentFeeBalance.js';
import { AttendanceLog } from '../models/AttendanceLog.js';
import { ExamStudentSnapshot } from '../models/ExamStudentSnapshot.js';
import { StudentIdCard } from '../models/StudentIdCard.js';
import { LibraryTransaction } from '../models/LibraryTransaction.js';
import { RecycleBinItem } from '../models/RecycleBinItem.js';
import { RecycleAuditLog } from '../models/RecycleAuditLog.js';
import { softDeleteSet, restoreSet } from '../utils/softDelete.js';

const MODULE_MAP = {
  student: {
    model: Student,
    collection: 'students',
    label: { ur: 'طالب علم', en: 'Student' },
  },
  teacher: {
    model: Teacher,
    collection: 'teachers',
    label: { ur: 'استاد', en: 'Teacher' },
  },
  fee_item: {
    model: FeeItem,
    collection: 'feeitems',
    label: { ur: 'فیس آئٹم', en: 'Fee item' },
  },
};

function clientMeta(req) {
  return {
    ip: String(req?.ip || req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim(),
    userAgent: String(req?.headers?.['user-agent'] || '').slice(0, 400),
  };
}

function locName(name) {
  if (!name || typeof name !== 'object') return { ur: '', en: String(name || '') };
  return { ur: name.ur || '', en: name.en || '' };
}

function displayName(name) {
  const n = locName(name);
  return n.ur || n.en || '—';
}

async function writeAudit(tenantId, payload) {
  await RecycleAuditLog.create({ tenantId, ...payload });
}

export async function softDeleteRecord({
  module,
  recordId,
  tenantId,
  userId,
  reason = '',
  req,
}) {
  const cfg = MODULE_MAP[module];
  if (!cfg) {
    const err = new Error(`Unsupported recycle module: ${module}`);
    err.status = 400;
    throw err;
  }
  if (!mongoose.isValidObjectId(recordId)) {
    const err = new Error('Invalid record id');
    err.status = 400;
    throw err;
  }

  const fresh = await cfg.model.findOne({ _id: recordId, tenantId });
  if (!fresh) {
    const err = new Error('Record not found');
    err.status = 404;
    throw err;
  }
  if (fresh.isDeleted || fresh.deletedAt) {
    const err = new Error('Record is already deleted');
    err.status = 409;
    throw err;
  }

  const set = softDeleteSet(userId, reason);
  Object.assign(fresh, set);
  await fresh.save();

  const summary = await summarizeRecord(module, fresh);
  const item = await RecycleBinItem.create({
    tenantId,
    module,
    recordId: fresh._id,
    recordCollection: cfg.collection,
    recordName: summary.recordName,
    recordCode: summary.recordCode,
    parentInfo: summary.parentInfo,
    sessionId: summary.sessionId,
    deletedAt: set.deletedAt,
    deletedBy: userId || null,
    deleteReason: set.deleteReason,
    status: 'deleted',
    meta: summary.meta || {},
  });

  const meta = clientMeta(req);
  await writeAudit(tenantId, {
    action: 'deleted',
    module,
    recordId: fresh._id,
    recycleItemId: item._id,
    recordName: displayName(summary.recordName),
    reason: set.deleteReason,
    userId: userId || null,
    ...meta,
  });

  return { item, record: fresh };
}

async function summarizeRecord(module, doc) {
  if (module === 'student') {
    const [darjah, subject, session] = await Promise.all([
      doc.darjahId ? Darjah.findById(doc.darjahId).select('name code').lean() : null,
      doc.subjectId ? Subject.findById(doc.subjectId).select('name').lean() : null,
      doc.sessionId ? Session.findById(doc.sessionId).select('title').lean() : null,
    ]);
    const parts = [];
    if (darjah) parts.push(displayName(darjah.name) || darjah.code);
    if (subject) parts.push(displayName(subject.name));
    if (session) parts.push(session.title);
    return {
      recordName: locName(doc.name),
      recordCode: doc.studentId || '',
      parentInfo: parts.join(' · '),
      sessionId: doc.sessionId || null,
      meta: {
        darjahId: doc.darjahId || null,
        subjectId: doc.subjectId || null,
        teacherId: doc.teacherId || null,
      },
    };
  }
  if (module === 'teacher') {
    return {
      recordName: locName(doc.name),
      recordCode: doc.idCard || doc.phone || '',
      parentInfo: doc.status || '',
      sessionId: doc.assignments?.[0]?.sessionId || null,
      meta: {},
    };
  }
  if (module === 'fee_item') {
    const darjah = doc.darjahId
      ? await Darjah.findById(doc.darjahId).select('name code').lean()
      : null;
    return {
      recordName: locName(doc.title),
      recordCode: `${doc.tab || ''}:${doc.amount ?? ''}`,
      parentInfo: darjah ? displayName(darjah.name) || darjah.code : '',
      sessionId: doc.sessionId || null,
      meta: { darjahId: doc.darjahId || null, tab: doc.tab },
    };
  }
  return { recordName: { ur: '', en: '' }, recordCode: '', parentInfo: '', sessionId: null, meta: {} };
}

export async function listRecycleBin(tenantId, query = {}) {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10) || 20));
  const filter = { tenantId, status: 'deleted' };

  if (query.module && MODULE_MAP[query.module]) filter.module = query.module;
  if (query.deletedBy && mongoose.isValidObjectId(query.deletedBy)) {
    filter.deletedBy = query.deletedBy;
  }
  if (query.sessionId && mongoose.isValidObjectId(query.sessionId)) {
    filter.sessionId = query.sessionId;
  }
  if (query.from || query.to) {
    filter.deletedAt = {};
    if (query.from) filter.deletedAt.$gte = new Date(query.from);
    if (query.to) {
      const end = new Date(query.to);
      end.setHours(23, 59, 59, 999);
      filter.deletedAt.$lte = end;
    }
  }
  const q = query.q != null ? String(query.q).trim() : '';
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { 'recordName.ur': rx },
      { 'recordName.en': rx },
      { recordCode: rx },
      { parentInfo: rx },
      { deleteReason: rx },
    ];
  }

  const sortField = ['deletedAt', 'recordCode', 'module'].includes(query.sort) ? query.sort : 'deletedAt';
  const sortDir = query.order === 'asc' ? 1 : -1;

  const total = await RecycleBinItem.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(page, totalPages);
  const items = await RecycleBinItem.find(filter)
    .populate('deletedBy', 'email username name role')
    .populate('sessionId', 'title')
    .sort({ [sortField]: sortDir })
    .skip((safePage - 1) * limit)
    .limit(limit)
    .lean();

  return {
    items,
    pagination: { page: safePage, limit, total, totalPages },
    modules: Object.keys(MODULE_MAP).map((key) => ({ key, ...MODULE_MAP[key].label })),
  };
}

export async function getRecycleItem(tenantId, id) {
  const item = await RecycleBinItem.findOne({ _id: id, tenantId })
    .populate('deletedBy', 'email username name role')
    .populate('restoredBy', 'email username name role')
    .populate('purgedBy', 'email username name role')
    .populate('sessionId', 'title')
    .lean();
  if (!item) {
    const err = new Error('Recycle bin item not found');
    err.status = 404;
    throw err;
  }
  const audits = await RecycleAuditLog.find({
    tenantId,
    $or: [{ recycleItemId: item._id }, { recordId: item.recordId, module: item.module }],
  })
    .populate('userId', 'email username name')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return { item, audits };
}

export async function validateRestore(module, tenantId, recordId) {
  const cfg = MODULE_MAP[module];
  const record = await cfg.model.findOne({ _id: recordId, tenantId });
  if (!record || (!record.isDeleted && !record.deletedAt)) {
    return { ok: false, errors: ['Record is not in deleted state'] };
  }

  const errors = [];
  const tenant = await Tenant.findById(tenantId).select('_id').lean();
  if (!tenant) errors.push('Tenant no longer exists');

  if (module === 'student') {
    if (record.sessionId) {
      const s = await Session.findOne({ _id: record.sessionId, tenantId }).lean();
      if (!s) errors.push('Session no longer exists');
    }
    if (record.darjahId) {
      const d = await Darjah.findOne({ _id: record.darjahId, tenantId }).lean();
      if (!d) errors.push("Student's class (darjah) no longer exists");
    }
    if (record.subjectId) {
      const sub = await Subject.findOne({ _id: record.subjectId, tenantId }).lean();
      if (!sub) errors.push('Section/subject no longer exists');
    }
    if (record.teacherId) {
      const t = await Teacher.findOne({
        _id: record.teacherId,
        tenantId,
        isDeleted: { $ne: true },
        deletedAt: null,
      }).lean();
      if (!t) errors.push('Assigned teacher no longer exists or is deleted');
    }
  }

  if (module === 'fee_item') {
    if (record.sessionId) {
      const s = await Session.findOne({ _id: record.sessionId, tenantId }).lean();
      if (!s) errors.push('Session no longer exists');
    }
    if (record.darjahId) {
      const d = await Darjah.findOne({ _id: record.darjahId, tenantId }).lean();
      if (!d) errors.push('Linked class (darjah) no longer exists');
    }
  }

  if (module === 'teacher') {
    for (const a of record.assignments || []) {
      if (a.sessionId) {
        const s = await Session.findOne({ _id: a.sessionId, tenantId }).lean();
        if (!s) {
          errors.push('An assignment session no longer exists');
          break;
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, record };
}

export async function restoreRecord({ recycleItemId, tenantId, userId, req }) {
  const item = await RecycleBinItem.findOne({ _id: recycleItemId, tenantId, status: 'deleted' });
  if (!item) {
    const err = new Error('Recycle bin item not found');
    err.status = 404;
    throw err;
  }

  const validation = await validateRestore(item.module, tenantId, item.recordId);
  if (!validation.ok) {
    await writeAudit(tenantId, {
      action: 'restore_blocked',
      module: item.module,
      recordId: item.recordId,
      recycleItemId: item._id,
      recordName: displayName(item.recordName),
      reason: validation.errors.join('; '),
      userId: userId || null,
      ...clientMeta(req),
      details: { errors: validation.errors },
    });
    const err = new Error(validation.errors.join('. '));
    err.status = 409;
    err.errors = validation.errors;
    throw err;
  }

  const cfg = MODULE_MAP[item.module];
  await cfg.model.updateOne({ _id: item.recordId, tenantId }, { $set: restoreSet() });

  item.status = 'restored';
  item.restoredAt = new Date();
  item.restoredBy = userId || null;
  await item.save();

  await writeAudit(tenantId, {
    action: 'restored',
    module: item.module,
    recordId: item.recordId,
    recycleItemId: item._id,
    recordName: displayName(item.recordName),
    userId: userId || null,
    ...clientMeta(req),
  });

  return item;
}

export async function validatePermanentDelete(module, tenantId, recordId) {
  const blockers = [];

  if (module === 'student') {
    const [fees, attendance, snaps, cards, issues] = await Promise.all([
      StudentFeeBalance.countDocuments({ tenantId, studentId: recordId }),
      AttendanceLog.countDocuments({ tenantId, subjectType: 'student', subjectId: recordId }),
      ExamStudentSnapshot.countDocuments({ tenantId, studentId: recordId }),
      StudentIdCard.countDocuments({ tenantId, studentId: recordId }),
      LibraryTransaction.countDocuments({
        tenantId,
        borrowerType: 'student',
        studentId: recordId,
      }),
    ]);
    if (fees) blockers.push({ type: 'fees', count: fees, message: `${fees} fee balance row(s)` });
    if (attendance) blockers.push({ type: 'attendance', count: attendance, message: `${attendance} attendance log(s)` });
    if (snaps) blockers.push({ type: 'exam_snapshots', count: snaps, message: `${snaps} exam snapshot(s)` });
    if (cards) blockers.push({ type: 'id_cards', count: cards, message: `${cards} ID card(s)` });
    if (issues) blockers.push({ type: 'library', count: issues, message: `${issues} library issue(s)` });
  }

  if (module === 'teacher') {
    const attendance = await AttendanceLog.countDocuments({
      tenantId,
      subjectType: 'teacher',
      subjectId: recordId,
    });
    if (attendance) blockers.push({ type: 'attendance', count: attendance, message: `${attendance} attendance log(s)` });
    const linkedStudents = await Student.countDocuments({
      tenantId,
      teacherId: recordId,
      isDeleted: { $ne: true },
      deletedAt: null,
    });
    if (linkedStudents) {
      blockers.push({
        type: 'students',
        count: linkedStudents,
        message: `${linkedStudents} active student(s) still assigned`,
      });
    }
  }

  if (module === 'fee_item') {
    // Fee balances reference applied amounts historically via fee item id if stored — skip if schema lacks it
  }

  return { ok: blockers.length === 0, blockers };
}

export async function permanentDeleteRecord({
  recycleItemId,
  tenantId,
  userId,
  req,
  confirmText,
  force = false,
}) {
  if (String(confirmText || '').trim() !== 'DELETE') {
    const err = new Error('Type DELETE to confirm permanent deletion');
    err.status = 400;
    throw err;
  }

  const item = await RecycleBinItem.findOne({ _id: recycleItemId, tenantId, status: 'deleted' });
  if (!item) {
    const err = new Error('Recycle bin item not found');
    err.status = 404;
    throw err;
  }

  const validation = await validatePermanentDelete(item.module, tenantId, item.recordId);
  if (!validation.ok && !force) {
    await writeAudit(tenantId, {
      action: 'purge_blocked',
      module: item.module,
      recordId: item.recordId,
      recycleItemId: item._id,
      recordName: displayName(item.recordName),
      reason: validation.blockers.map((b) => b.message).join('; '),
      userId: userId || null,
      ...clientMeta(req),
      details: { blockers: validation.blockers },
    });
    const err = new Error(
      `Cannot permanently delete: ${validation.blockers.map((b) => b.message).join(', ')}`
    );
    err.status = 409;
    err.blockers = validation.blockers;
    throw err;
  }

  const cfg = MODULE_MAP[item.module];
  await cfg.model.deleteOne({ _id: item.recordId, tenantId });

  item.status = 'purged';
  item.purgedAt = new Date();
  item.purgedBy = userId || null;
  await item.save();

  await writeAudit(tenantId, {
    action: 'permanently_deleted',
    module: item.module,
    recordId: item.recordId,
    recycleItemId: item._id,
    recordName: displayName(item.recordName),
    userId: userId || null,
    ...clientMeta(req),
    details: force ? { forced: true, blockers: validation.blockers } : {},
  });

  return item;
}

export async function bulkRestore({ ids, tenantId, userId, req }) {
  const results = [];
  for (const id of ids) {
    try {
      const item = await restoreRecord({ recycleItemId: id, tenantId, userId, req });
      results.push({ id, ok: true, item });
    } catch (e) {
      results.push({ id, ok: false, message: e.message, errors: e.errors });
    }
  }
  return results;
}

export async function bulkPermanentDelete({ ids, tenantId, userId, req, confirmText }) {
  if (String(confirmText || '').trim() !== 'DELETE') {
    const err = new Error('Type DELETE to confirm permanent deletion');
    err.status = 400;
    throw err;
  }
  const results = [];
  for (const id of ids) {
    try {
      const item = await permanentDeleteRecord({
        recycleItemId: id,
        tenantId,
        userId,
        req,
        confirmText: 'DELETE',
      });
      results.push({ id, ok: true, item });
    } catch (e) {
      results.push({ id, ok: false, message: e.message, blockers: e.blockers });
    }
  }
  return results;
}

export { MODULE_MAP };
