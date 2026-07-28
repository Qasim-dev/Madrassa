import { Router } from 'express';
import mongoose from 'mongoose';
import { Student } from '../models/Student.js';
import { SubjectBook } from '../models/SubjectBook.js';
import { uploadPhoto } from '../config/upload.js';
import { nextRollNumberForGrade } from '../utils/assignRollNumber.js';
import { allocateNextStudentId, previewNextStudentId } from '../utils/studentId.js';
import multer from 'multer';
import { readWorkbook, sheetToRowsByHeader } from '../utils/excelImport.js';
import {
  studentFieldsFromRow,
  resolveSessionId,
  resolveDarjahId,
  resolveSubjectId,
  resolveGradeId,
} from '../utils/excelImportResolve.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { sanitizeUpdateBody } from '../utils/sanitizeUpdateBody.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();
const uploadExcel = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function normalizeIdFields(obj, fields) {
  for (const f of fields) {
    if (!(f in obj)) continue;
    if (obj[f] === '') obj[f] = null;
  }
}

/** Assign every active SubjectBook for the student's subject + darjah. */
async function assignAllBooksForClass(tenantId, body) {
  const subjectId = body.subjectId;
  const darjahId = body.darjahId;
  if (
    !subjectId ||
    !darjahId ||
    !mongoose.isValidObjectId(String(subjectId)) ||
    !mongoose.isValidObjectId(String(darjahId))
  ) {
    body.bookIds = [];
    body.bookId = null;
    return;
  }
  const ids = await SubjectBook.find({
    tenantId,
    subjectId,
    darjahId,
    isActive: { $ne: false },
  })
    .select('_id')
    .lean();
  body.bookIds = ids.map((d) => String(d._id));
  body.bookId = body.bookIds[0] || null;
}

router.get('/next-student-id', async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const studentId = await previewNextStudentId({ tenantId: req.tenantId, sessionId });
    res.json({ studentId });
  } catch (e) {
    next(e);
  }
});

router.post('/import', uploadExcel.single('file'), async (req, res, next) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ message: 'No file uploaded' });

    const wb = readWorkbook(req.file.buffer);
    const { rows } = sheetToRowsByHeader(wb, 'Students');
    if (!rows.length) {
      return res.status(400).json({ message: 'No rows found in sheet: Students' });
    }

    const results = [];
    let created = 0;
    let failed = 0;

    for (const row of rows) {
      const errors = [];
      const f = studentFieldsFromRow(row);
      const body = {
        studentId: f.studentId,
        name: f.name,
        fatherName: f.fatherName,
        gender: f.gender,
        idCard: f.idCard,
        phone: f.phone,
        country: f.country,
        state: f.state,
        cityLoc: f.cityLoc,
        districtCurrent: f.districtCurrent,
        districtPermanent: f.districtPermanent,
        addressCurrent: f.addressCurrent,
        addressPermanent: f.addressPermanent,
        exitReason: f.exitReason,
        classTypeLabel: f.classTypeLabel,
        photoUrl: f.photoUrl,
        dateOfBirth: f.dateOfBirth,
        enrollmentDate: f.enrollmentDate,
        exitDate: f.exitDate,
        teacherId: f.teacherId || null,
      };

      if (!body.name?.ur?.trim() && !body.name?.en?.trim()) {
        errors.push('name.ur or name.en is required');
      }

      const sessionId = await resolveSessionId(req.tenantId, f.sessionRaw);
      if (f.sessionRaw && !sessionId) {
        errors.push(`session not found: "${f.sessionRaw}" (use session title e.g. 2026-2027)`);
      }
      body.sessionId = sessionId;

      if (!body.studentId && !body.sessionId) {
        errors.push('session is required when studentId is empty (auto-id needs session)');
      }

      const darjahId = await resolveDarjahId(req.tenantId, sessionId, f.darjahRaw);
      if (f.darjahRaw && !darjahId) {
        errors.push(`darjah/class not found: "${f.darjahRaw}"`);
      }
      body.darjahId = darjahId;

      const subjectId = await resolveSubjectId(req.tenantId, sessionId, f.subjectRaw);
      if (f.subjectRaw && !subjectId) {
        errors.push(`subject not found: "${f.subjectRaw}"`);
      }
      body.subjectId = subjectId;

      const gradeId = await resolveGradeId(req.tenantId, sessionId, f.gradeRaw);
      if (f.gradeRaw && !gradeId) {
        errors.push(`grade not found: "${f.gradeRaw}"`);
      }
      body.gradeId = gradeId;
      body.currentGradeId = gradeId;

      const previousGradeId = await resolveGradeId(req.tenantId, sessionId, f.previousGradeRaw);
      body.previousGradeId = previousGradeId;

      normalizeIdFields(body, [
        'sessionId',
        'gradeId',
        'currentGradeId',
        'previousGradeId',
        'darjahId',
        'subjectId',
        'teacherId',
      ]);
      await assignAllBooksForClass(req.tenantId, body);

      body.city = f.city || body.cityLoc?.en || body.cityLoc?.ur || '';

      if (errors.length) {
        failed += 1;
        results.push({ row: row.__rowNum, ok: false, errors });
        continue;
      }

      try {
        const payload = { ...body, tenantId: req.tenantId };
        delete payload.rollNumber;
        if (!payload.studentId || !String(payload.studentId).trim()) {
          payload.studentId = await allocateNextStudentId({ tenantId: req.tenantId, sessionId: payload.sessionId });
        }
        if (payload.currentGradeId) {
          payload.rollNumber = await nextRollNumberForGrade(req.tenantId, payload.currentGradeId);
        } else {
          payload.rollNumber = '';
        }
        const doc = await Student.create(payload);
        created += 1;
        results.push({ row: row.__rowNum, ok: true, id: doc._id, studentId: doc.studentId });
      } catch (e) {
        failed += 1;
        results.push({ row: row.__rowNum, ok: false, errors: [e?.message || 'Import failed'] });
      }
    }

    res.json({ ok: true, created, failed, total: created + failed, results });
  } catch (e) {
    next(e);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { q, gradeId, sessionId, darjahId, subjectId, bookId } = req.query;
    const filter = { tenantId: req.tenantId };
    if (gradeId) filter.gradeId = gradeId;
    if (darjahId && mongoose.isValidObjectId(darjahId)) filter.darjahId = darjahId;
    if (subjectId && mongoose.isValidObjectId(subjectId)) filter.subjectId = subjectId;
    if (bookId && mongoose.isValidObjectId(bookId)) {
      filter.$or = [{ bookId }, { bookIds: bookId }];
    }
    if (sessionId && mongoose.isValidObjectId(sessionId)) filter.sessionId = sessionId;
    const qTrim = q != null ? String(q).trim() : '';
    if (qTrim) {
      const trimmed = qTrim;
      const safe = escapeRegex(trimmed);
      const rx = new RegExp(safe, 'i');
      const or = [
        { studentId: rx },
        { rollNumber: rx },
        { idCard: rx },
        { phone: rx },
        { city: rx },
        { 'name.ur': rx },
        { 'name.en': rx },
        { 'fatherName.ur': rx },
        { 'fatherName.en': rx },
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
      // CNIC typed without dashes: match spaced stored values (e.g. 35205… matches 35205-6789012-3)
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length >= 5) {
        const looseId = new RegExp(digits.split('').join('\\D*'), 'i');
        or.push({ idCard: looseId });
      }
      filter.$or = or;
    }
    const gradePop = { path: 'responsibleTeacherId' };
    const query = Student.find(filter)
      .populate('sessionId')
      .populate('darjahId')
      .populate('subjectId')
      .populate('bookId')
      .populate('bookIds')
      .populate('teacherId')
      .populate({ path: 'gradeId', populate: gradePop })
      .populate({ path: 'currentGradeId', populate: gradePop })
      .populate({ path: 'previousGradeId', populate: gradePop })
      .sort({ createdAt: -1 });

    // Optional pagination — omit page/limit to keep full-array responses for picklists
    const wantsPage = req.query.page != null && String(req.query.page).trim() !== '';
    if (wantsPage) {
      const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 10));
      const total = await Student.countDocuments(filter);
      const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
      const safePage = Math.min(page, totalPages);
      const items = await query
        .skip((safePage - 1) * limit)
        .limit(limit)
        .lean();
      return res.json({
        items,
        pagination: { page: safePage, limit, total, totalPages },
      });
    }

    const list = await query.lean();
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const gradePop = { path: 'responsibleTeacherId' };
    const doc = await Student.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('sessionId')
      .populate('darjahId')
      .populate('subjectId')
      .populate('bookId')
      .populate('bookIds')
      .populate('teacherId')
      .populate({ path: 'gradeId', populate: gradePop })
      .populate({ path: 'currentGradeId', populate: gradePop })
      .populate({ path: 'previousGradeId', populate: gradePop });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = { ...req.body, tenantId: req.tenantId };
    delete body.rollNumber;
    delete body.photoUrl;
    normalizeIdFields(body, [
      'sessionId',
      'gradeId',
      'currentGradeId',
      'previousGradeId',
      'darjahId',
      'subjectId',
      'teacherId',
    ]);
    await assignAllBooksForClass(req.tenantId, body);
    if (!body.studentId || !String(body.studentId).trim()) {
      body.studentId = await allocateNextStudentId({ tenantId: req.tenantId, sessionId: body.sessionId });
    }
    if (body.currentGradeId) {
      body.rollNumber = await nextRollNumberForGrade(req.tenantId, body.currentGradeId);
    } else {
      body.rollNumber = '';
    }
    const doc = await Student.create(body);
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await Student.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const body = sanitizeUpdateBody(req.body, ['rollNumber', 'photoUrl']);
    normalizeIdFields(body, [
      'sessionId',
      'gradeId',
      'currentGradeId',
      'previousGradeId',
      'darjahId',
      'subjectId',
      'teacherId',
    ]);
    const classBooks = {
      subjectId: body.subjectId !== undefined ? body.subjectId : existing.subjectId,
      darjahId: body.darjahId !== undefined ? body.darjahId : existing.darjahId,
    };
    await assignAllBooksForClass(req.tenantId, classBooks);
    body.bookIds = classBooks.bookIds;
    body.bookId = classBooks.bookId;

    const mergedGradeId =
      body.currentGradeId !== undefined ? body.currentGradeId : existing.currentGradeId;
    const oldGid = existing.currentGradeId ? String(existing.currentGradeId) : '';
    const newGid = mergedGradeId ? String(mergedGradeId) : '';

    let rollNumber = existing.rollNumber || '';
    if (!newGid) {
      rollNumber = '';
    } else if (newGid !== oldGid || !rollNumber) {
      rollNumber = await nextRollNumberForGrade(req.tenantId, mergedGradeId);
    }
    body.rollNumber = rollNumber;

    const doc = await Student.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: body },
      { new: true, runValidators: true }
    );
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requirePermission('students:delete'), async (req, res, next) => {
  try {
    const doc = await Student.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/photo', uploadPhoto.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const photoUrl = `/uploads/${req.file.filename}`;
    const doc = await Student.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: { photoUrl } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ photoUrl, student: doc });
  } catch (e) {
    next(e);
  }
});

export default router;
