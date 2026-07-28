import { Router } from 'express';
import { Teacher } from '../models/Teacher.js';
import multer from 'multer';
import mongoose from 'mongoose';
import { readWorkbook, sheetToRowsByHeader } from '../utils/excelImport.js';
import {
  teacherFieldsFromRow,
  assignmentFieldsFromRow,
  resolveSessionId,
  resolveDarjahId,
  resolveSubjectId,
  resolveBookId,
} from '../utils/excelImportResolve.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { sanitizeUpdateBody } from '../utils/sanitizeUpdateBody.js';
import { requirePermission } from '../middleware/rbac.js';
import { withNotDeleted, NOT_DELETED } from '../utils/softDelete.js';
import { softDeleteRecord } from '../services/recycleBin.service.js';

const router = Router();
const uploadExcel = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', async (req, res, next) => {
  try {
    const sessionOid =
      req.query.sessionId && mongoose.isValidObjectId(String(req.query.sessionId))
        ? new mongoose.Types.ObjectId(String(req.query.sessionId))
        : null;

    const base = withNotDeleted({ tenantId: req.tenantId });
    if (sessionOid) {
      base.assignments = { $elemMatch: { sessionId: sessionOid } };
    }

    const qTrim = req.query.q != null ? String(req.query.q).trim() : '';
    let filter = base;
    if (qTrim) {
      const safe = escapeRegex(qTrim);
      const rx = new RegExp(safe, 'i');
      const or = [
        { idCard: rx },
        { phone: rx },
        { 'name.ur': rx },
        { 'name.en': rx },
        { 'parentage.ur': rx },
        { 'parentage.en': rx },
        { deeniTaleem: rx },
        { asriTaleem: rx },
        { extraSkills: rx },
        { 'country.ur': rx },
        { 'country.en': rx },
        { 'state.ur': rx },
        { 'state.en': rx },
        { 'cityLoc.ur': rx },
        { 'cityLoc.en': rx },
        { 'districtCurrent.ur': rx },
        { 'districtCurrent.en': rx },
        { 'districtPermanent.ur': rx },
        { 'districtPermanent.en': rx },
        { 'addressCurrent.ur': rx },
        { 'addressCurrent.en': rx },
        { 'addressPermanent.ur': rx },
        { 'addressPermanent.en': rx },
      ];
      const digits = qTrim.replace(/\D/g, '');
      if (digits.length >= 5) {
        or.push({ idCard: new RegExp(digits.split('').join('\\D*'), 'i') });
      }
      filter = { $and: [base, { $or: or }] };
    }

    const list = await Teacher.find(filter)
      .populate('assignments.sessionId')
      .populate('assignments.darjahId')
      .populate('assignments.subjectId')
      .populate('assignments.bookId')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/import', requirePermission('teachers:write'), uploadExcel.single('file'), async (req, res, next) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ message: 'No file uploaded' });

    const wb = readWorkbook(req.file.buffer);
    const { rows: teacherRows } = sheetToRowsByHeader(wb, 'Teachers');
    if (!teacherRows.length) {
      return res.status(400).json({ message: 'No rows found in sheet: Teachers' });
    }
    const { rows: assignmentRows } = sheetToRowsByHeader(wb, 'Assignments');

    const assignmentsByKey = new Map();
    for (const a of assignmentRows || []) {
      const fields = assignmentFieldsFromRow(a);
      const k = fields.teacherKey;
      if (!k) continue;
      const list = assignmentsByKey.get(k) || [];
      list.push(fields);
      assignmentsByKey.set(k, list);
    }

    const results = [];
    let created = 0;
    let failed = 0;

    for (const row of teacherRows) {
      const errors = [];
      const f = teacherFieldsFromRow(row);
      const teacherKey = f.teacherKey;
      const key = teacherKey || `__row_${row.__rowNum}`;

      const body = {
        name: f.name,
        parentage: f.parentage,
        idCard: f.idCard,
        phone: f.phone,
        maritalStatus: f.maritalStatus,
        dateOfBirth: f.dateOfBirth,
        country: f.country,
        state: f.state,
        cityLoc: f.cityLoc,
        districtCurrent: f.districtCurrent,
        districtPermanent: f.districtPermanent,
        addressCurrent: f.addressCurrent,
        addressPermanent: f.addressPermanent,
        deeniTaleem: f.deeniTaleem,
        asriTaleem: f.asriTaleem,
        extraSkills: f.extraSkills,
        jobStartDate: f.jobStartDate,
        jobEndDate: f.jobEndDate,
        status: f.status || 'active',
      };

      if (!body.name?.ur?.trim() && !body.name?.en?.trim()) {
        errors.push('name.ur or name.en is required');
      }

      const rawAssignments = assignmentsByKey.get(teacherKey) || [];
      const assignments = [];
      for (const a of rawAssignments) {
        const sessionId = await resolveSessionId(req.tenantId, a.sessionRaw);
        if (!a.sessionRaw) {
          errors.push(`assignment missing session (teacherKey=${teacherKey || key})`);
          continue;
        }
        if (!sessionId) {
          errors.push(`session not found: "${a.sessionRaw}" (teacherKey=${teacherKey || key})`);
          continue;
        }
        const darjahId = await resolveDarjahId(req.tenantId, sessionId, a.darjahRaw);
        if (a.darjahRaw && !darjahId) {
          errors.push(`darjah not found: "${a.darjahRaw}" (teacherKey=${teacherKey || key})`);
        }
        const subjectId = await resolveSubjectId(req.tenantId, sessionId, a.subjectRaw);
        if (a.subjectRaw && !subjectId) {
          errors.push(`subject not found: "${a.subjectRaw}" (teacherKey=${teacherKey || key})`);
        }
        const bookId = await resolveBookId(req.tenantId, a.bookRaw, { subjectId, darjahId });
        if (a.bookRaw && !bookId) {
          errors.push(`book not found: "${a.bookRaw}" (teacherKey=${teacherKey || key})`);
        }
        assignments.push({
          sessionId,
          darjahId: darjahId || null,
          subjectId: subjectId || null,
          bookId: bookId || null,
        });
      }
      body.assignments = assignments;

      if (errors.length) {
        failed += 1;
        results.push({ row: row.__rowNum, ok: false, errors, teacherKey: teacherKey || null });
        continue;
      }

      try {
        const doc = await Teacher.create({ ...body, tenantId: req.tenantId });
        created += 1;
        results.push({ row: row.__rowNum, ok: true, id: doc._id, teacherKey: teacherKey || null });
      } catch (e) {
        failed += 1;
        results.push({
          row: row.__rowNum,
          ok: false,
          errors: [e?.message || 'Import failed'],
          teacherKey: teacherKey || null,
        });
      }
    }

    res.json({ ok: true, created, failed, total: created + failed, results });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Teacher.findOne({ _id: req.params.id, tenantId: req.tenantId, ...NOT_DELETED })
      .populate('assignments.sessionId')
      .populate('assignments.darjahId')
      .populate('assignments.subjectId')
      .populate('assignments.bookId');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.post('/', requirePermission('teachers:write'), async (req, res, next) => {
  try {
    const doc = await Teacher.create({ ...req.body, tenantId: req.tenantId });
    const populated = await Teacher.findOne({ _id: doc._id, tenantId: req.tenantId })
      .populate('assignments.sessionId')
      .populate('assignments.darjahId')
      .populate('assignments.subjectId')
      .populate('assignments.bookId');
    res.status(201).json(populated || doc);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', requirePermission('teachers:write'), async (req, res, next) => {
  try {
    const doc = await Teacher.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: sanitizeUpdateBody(req.body) },
      { new: true, runValidators: true }
    )
      .populate('assignments.sessionId')
      .populate('assignments.darjahId')
      .populate('assignments.subjectId')
      .populate('assignments.bookId');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requirePermission('teachers:delete'), async (req, res, next) => {
  try {
    const reason = req.body?.reason || '';
    const { item } = await softDeleteRecord({
      module: 'teacher',
      recordId: req.params.id,
      tenantId: req.tenantId,
      userId: req.user?.userId || req.user?._id,
      reason,
      req,
    });
    res.json({ ok: true, softDeleted: true, recycleItemId: item._id });
  } catch (e) {
    next(e);
  }
});

export default router;
