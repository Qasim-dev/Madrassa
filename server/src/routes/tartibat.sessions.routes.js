import { Router } from 'express';
import { Session } from '../models/Session.js';
import { Darjah } from '../models/Darjah.js';
import { Subject } from '../models/Subject.js';
import { Grade } from '../models/Grade.js';
import { Student } from '../models/Student.js';
import { StudentAttendance } from '../models/StudentAttendance.js';
import { TeacherAttendance } from '../models/TeacherAttendance.js';
import { AttendanceLog } from '../models/AttendanceLog.js';
import { TimetableEntry } from '../models/TimetableEntry.js';
import { TimeSlot } from '../models/TimeSlot.js';
import { FeeItem } from '../models/FeeItem.js';
import { ExamContainer } from '../models/ExamContainer.js';
import { ExamClassPipeline } from '../models/ExamClassPipeline.js';
import { ExamSchedule } from '../models/ExamSchedule.js';
import { requirePermission } from '../middleware/rbac.js';
import { ExamSubjectMapping } from '../models/ExamSubjectMapping.js';
import { ExamMarks } from '../models/ExamMarks.js';
import { ExamResult } from '../models/ExamResult.js';
import { ExamAttendance } from '../models/ExamAttendance.js';
import { ExamAuditLog } from '../models/ExamAuditLog.js';
import { ExamStudentSnapshot } from '../models/ExamStudentSnapshot.js';

const router = Router();

/** Only one session may be active per tenant at a time. */
async function deactivateOtherSessions(tenantId, keepId) {
  await Session.updateMany(
    { tenantId, _id: { $ne: keepId }, isActive: true },
    { $set: { isActive: false } }
  );
}

router.get('/', async (req, res, next) => {
  try {
    const list = await Session.find({ tenantId: req.tenantId }).sort({ isActive: -1, createdAt: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /:id/summary
 * Returns counts of all data linked to this session.
 * Used by the frontend to warn the user before deletion.
 */
router.get('/:id/summary', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tenantId } = req;
    const q = { sessionId: id, tenantId };

    const [
      students,
      darajat,
      subjects,
      grades,
      studentAttendance,
      teacherAttendance,
      exams,
      timetableEntries,
      feeItems,
    ] = await Promise.all([
      Student.countDocuments(q),
      Darjah.countDocuments(q),
      Subject.countDocuments(q),
      Grade.countDocuments(q),
      StudentAttendance.countDocuments(q),
      TeacherAttendance.countDocuments(q),
      ExamContainer.countDocuments(q),
      TimetableEntry.countDocuments(q),
      FeeItem.countDocuments(q),
    ]);

    const hasData =
      students + darajat + subjects + grades + studentAttendance +
      teacherAttendance + exams + timetableEntries + feeItems > 0;

    res.json({
      hasData,
      counts: { students, darajat, subjects, grades, studentAttendance, teacherAttendance, exams, timetableEntries, feeItems },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/', requirePermission('tartibat:write'), async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) {
      return res.status(400).json({
        message: 'Session title is required.',
        fields: { title: 'Session title is required.' },
      });
    }
    if (!req.body.startDate) {
      return res.status(400).json({
        message: 'Start date is required.',
        fields: { startDate: 'Start date is required.' },
      });
    }
    if (!req.body.endDate) {
      return res.status(400).json({
        message: 'End date is required.',
        fields: { endDate: 'End date is required.' },
      });
    }
    const start = new Date(req.body.startDate);
    const end = new Date(req.body.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return res.status(400).json({
        message: 'End date must be on or after the start date.',
        fields: { endDate: 'End date must be on or after the start date.' },
      });
    }

    const existingCount = await Session.countDocuments({ tenantId: req.tenantId });
    let isActive = !!req.body.isActive;
    if (existingCount === 0) isActive = true;

    const payload = {
      title,
      startDate: start,
      endDate: end,
      isActive,
      tenantId: req.tenantId,
    };
    const doc = await Session.create(payload);
    if (doc.isActive) await deactivateOtherSessions(req.tenantId, doc._id);
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', requirePermission('tartibat:write'), async (req, res, next) => {
  try {
    const existing = await Session.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const nextStart =
      req.body.startDate !== undefined
        ? req.body.startDate
          ? new Date(req.body.startDate)
          : null
        : existing.startDate;
    const nextEnd =
      req.body.endDate !== undefined
        ? req.body.endDate
          ? new Date(req.body.endDate)
          : null
        : existing.endDate;

    if (!nextStart) {
      return res.status(400).json({
        message: 'Start date is required.',
        fields: { startDate: 'Start date is required.' },
      });
    }
    if (!nextEnd) {
      return res.status(400).json({
        message: 'End date is required.',
        fields: { endDate: 'End date is required.' },
      });
    }
    if (nextEnd < nextStart) {
      return res.status(400).json({
        message: 'End date must be on or after the start date.',
        fields: { endDate: 'End date must be on or after the start date.' },
      });
    }

    let nextActive = req.body.isActive !== undefined ? !!req.body.isActive : !!existing.isActive;
    if (!nextActive) {
      const otherActive = await Session.countDocuments({
        tenantId: req.tenantId,
        isActive: true,
        _id: { $ne: existing._id },
      });
      if (otherActive === 0) {
        return res.status(400).json({
          message: 'At least one session must remain active.',
          fields: { isActive: 'At least one session must remain active.' },
        });
      }
    }

    const doc = await Session.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      {
        $set: {
          ...(req.body.title !== undefined ? { title: String(req.body.title || '').trim() } : {}),
          startDate: nextStart,
          endDate: nextEnd,
          isActive: nextActive,
        },
      },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.isActive) await deactivateOtherSessions(req.tenantId, doc._id);
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /:id
 * Cascade-deletes the session and ALL linked data across the system.
 */
router.delete('/:id', requirePermission('tartibat:delete'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tenantId } = req;

    const doc = await Session.findOne({ _id: id, tenantId });
    if (!doc) return res.status(404).json({ message: 'Not found' });

    const q = { sessionId: id, tenantId };

    // All models index sessionId directly — delete in parallel groups, deepest first
    await Promise.all([
      // Exam leaf records
      ExamMarks.deleteMany(q),
      ExamResult.deleteMany(q),
      ExamAttendance.deleteMany(q),
      ExamAuditLog.deleteMany(q),
      ExamStudentSnapshot.deleteMany(q),
      ExamClassPipeline.deleteMany(q),
      ExamSchedule.deleteMany(q),
      ExamSubjectMapping.deleteMany(q),
      ExamContainer.deleteMany(q),
      // Attendance
      StudentAttendance.deleteMany(q),
      TeacherAttendance.deleteMany(q),
      AttendanceLog.deleteMany(q),
      // Timetable
      TimetableEntry.deleteMany(q),
      TimeSlot.deleteMany(q),
      // Fees
      FeeItem.deleteMany(q),
      // Students
      Student.deleteMany(q),
      // Academic structure
      Subject.deleteMany(q),
      Darjah.deleteMany(q),
      Grade.deleteMany(q),
    ]);

    // Finally delete the session itself
    const wasActive = !!doc.isActive;
    await Session.deleteOne({ _id: id, tenantId });

    if (wasActive) {
      const next = await Session.findOne({ tenantId }).sort({ createdAt: -1 });
      if (next) {
        next.isActive = true;
        await next.save();
        await deactivateOtherSessions(tenantId, next._id);
      }
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
