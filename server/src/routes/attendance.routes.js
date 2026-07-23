import { Router } from 'express';
import * as engine from '../services/attendanceEngine.service.js';
import { AttendanceCategory } from '../models/AttendanceCategory.js';
import { AttendanceSlot } from '../models/AttendanceSlot.js';

const router = Router();

function handleEngineError(e, res, next) {
  if (e.status) return res.status(e.status).json({ message: e.message });
  return next(e);
}

/** ── Categories & slots (unified engine config) ── */

router.get('/categories', async (req, res, next) => {
  try {
    const list = await engine.listCategories(req.tenantId);
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    const code = String(req.body.code || '').trim().toLowerCase();
    if (!code) return res.status(400).json({ message: 'code is required' });
    const existing = await AttendanceCategory.findOne({ tenantId: req.tenantId, code });
    if (existing) return res.status(409).json({ message: 'Category already exists' });
    const doc = await AttendanceCategory.create({
      tenantId: req.tenantId,
      code,
      name: req.body.name || { ur: code, en: code },
      subjectType: req.body.subjectType || 'student',
      slotMode: req.body.slotMode || 'fixed_slots',
      statusOptions: req.body.statusOptions || ['present', 'absent'],
      requiresGrade: !!req.body.requiresGrade,
      requiresSlot: req.body.requiresSlot !== false,
      affectsSalary: !!req.body.affectsSalary,
      sortOrder: Number(req.body.sortOrder) || 99,
      isActive: true,
    });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.get('/slots', async (req, res, next) => {
  try {
    const list = await engine.listSlots(req.tenantId, {
      categoryId: req.query.categoryId,
      categoryCode: req.query.categoryCode,
      sessionId: req.query.sessionId,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/slots', async (req, res, next) => {
  try {
    const { categoryId, code, label, sortOrder, startTime, endTime, sessionId } = req.body;
    if (!categoryId || !code) return res.status(400).json({ message: 'categoryId and code required' });
    const doc = await AttendanceSlot.create({
      tenantId: req.tenantId,
      categoryId,
      code: String(code).trim(),
      label: label || { ur: code, en: code },
      sortOrder: Number(sortOrder) || 0,
      startTime: startTime || '',
      endTime: endTime || '',
      sessionId: sessionId || null,
      isActive: true,
    });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.get('/timetable-slots', async (req, res, next) => {
  try {
    const result = await engine.listTimetableSlotsForAttendance(req.tenantId, {
      sessionId: req.query.sessionId,
      darjahId: req.query.darjahId,
      courseSubjectId: req.query.courseSubjectId,
      bookId: req.query.bookId,
      date: req.query.date,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/context', async (req, res, next) => {
  try {
    const ctx = await engine.getAttendanceContext(req.tenantId, {
      sessionId: req.query.sessionId,
      darjahId: req.query.darjahId,
      courseSubjectId: req.query.courseSubjectId,
    });
    res.json(ctx);
  } catch (e) {
    next(e);
  }
});

router.get('/roster', async (req, res, next) => {
  try {
    const { categoryCode, gradeId, darjahId, courseSubjectId, bookId, sessionId } = req.query;
    const cat = String(categoryCode || 'academic').toLowerCase();
    if (cat === 'staff') {
      const list = await engine.getTeacherRoster(req.tenantId);
      return res.json(list);
    }
    const list = await engine.getStudentRoster(req.tenantId, {
      gradeId,
      darjahId,
      courseSubjectId,
      bookId,
      sessionId,
      categoryCode: cat,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

/** ── Student sheets (legacy paths delegate to engine) ── */

router.get('/students', async (req, res, next) => {
  try {
    const list = await engine.listStudentSheets(req.tenantId, {
      date: req.query.date,
      gradeId: req.query.gradeId,
      darjahId: req.query.darjahId,
      courseSubjectId: req.query.courseSubjectId,
      bookId: req.query.bookId,
      categoryId: req.query.categoryId,
      categoryCode: req.query.categoryCode,
      sessionId: req.query.sessionId,
      slotId: req.query.slotId,
      timeSlotId: req.query.timeSlotId,
      period: req.query.period,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/students', async (req, res, next) => {
  try {
    const sheet = await engine.saveStudentSheet(req.tenantId, req.body, req.user?.userId);
    res.json(sheet);
  } catch (e) {
    handleEngineError(e, res, next);
  }
});

/** ── Teacher marks (legacy paths delegate to engine) ── */

router.get('/teachers', async (req, res, next) => {
  try {
    const list = await engine.listTeacherMarks(req.tenantId, {
      date: req.query.date,
      teacherId: req.query.teacherId,
      gradeId: req.query.gradeId,
      categoryId: req.query.categoryId,
      categoryCode: req.query.categoryCode,
      sessionId: req.query.sessionId,
      slotId: req.query.slotId,
      period: req.query.period,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/teachers', async (req, res, next) => {
  try {
    const mark = await engine.saveTeacherMark(req.tenantId, req.body, req.user?.userId);
    res.status(201).json(mark);
  } catch (e) {
    handleEngineError(e, res, next);
  }
});

/** ── Reporting ── */

router.get('/reports/student/:studentId', async (req, res, next) => {
  try {
    const categories = req.query.categories
      ? String(req.query.categories).split(',').map((s) => s.trim())
      : undefined;
    const report = await engine.aggregateStudentReport(req.tenantId, req.params.studentId, {
      from: req.query.from,
      to: req.query.to,
      sessionId: req.query.sessionId,
      categories,
    });
    res.json(report);
  } catch (e) {
    next(e);
  }
});

router.get('/reports/student/:studentId/records', async (req, res, next) => {
  try {
    const result = await engine.listStudentMonthlyRecords(req.tenantId, req.params.studentId, {
      from: req.query.from,
      to: req.query.to,
      sessionId: req.query.sessionId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/day-summary', async (req, res, next) => {
  try {
    const list = await engine.getDarjahDaySummary(req.tenantId, {
      darjahId: req.query.darjahId,
      date: req.query.date,
      sessionId: req.query.sessionId,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/teacher-day-summary', async (req, res, next) => {
  try {
    const list = await engine.getTeacherDaySummary(req.tenantId, {
      date: req.query.date,
      sessionId: req.query.sessionId,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/reports/teacher/:teacherId/summary', async (req, res, next) => {
  try {
    const summary = await engine.aggregateTeacherForSalary(req.tenantId, req.params.teacherId, {
      from: req.query.from,
      to: req.query.to,
      sessionId: req.query.sessionId,
    });
    res.json(summary);
  } catch (e) {
    next(e);
  }
});

router.get('/reports/teacher/:teacherId/records', async (req, res, next) => {
  try {
    const result = await engine.listTeacherMonthlyRecords(req.tenantId, req.params.teacherId, {
      from: req.query.from,
      to: req.query.to,
      sessionId: req.query.sessionId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
