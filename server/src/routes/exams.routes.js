import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { ExamContainer } from '../models/ExamContainer.js';
import { ExamClassPipeline } from '../models/ExamClassPipeline.js';
import { ExamSubjectMapping } from '../models/ExamSubjectMapping.js';
import { ExamStudentSnapshot } from '../models/ExamStudentSnapshot.js';
import { ExamSchedule } from '../models/ExamSchedule.js';
import { ExamAttendance } from '../models/ExamAttendance.js';
import { ExamMarks } from '../models/ExamMarks.js';
import { ExamResult } from '../models/ExamResult.js';
import { ExamAuditLog } from '../models/ExamAuditLog.js';
import { Darjah } from '../models/Darjah.js';
import {
  requireExamSessionQuery,
  requireExamContext,
  buildExamFilter,
  parseObjectId,
} from '../middleware/examScope.js';
import {
  generateStudentSnapshot,
  validateScheduleConflicts,
  saveMarks,
  processResults,
  publishResults,
  unlockForReEvaluation,
  getExamAnalytics,
  writeAuditLog,
  assertExamStructureEditable,
  unlockExamContainer,
  deleteExamCascade,
  getExamDashboardStats,
  importMarksFromRows,
  getResultMatrix,
  exportResultsCsv,
  assignRollNumbers,
  reprocessResultsIfNeeded,
  healExamPublishedStatus,
} from '../services/examFlows.js';

const uploadExcel = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.use(requireExamSessionQuery);

// ─── SESSION DASHBOARD KPIs (must be before /:examId) ──────────────

router.get('/dashboard', async (req, res, next) => {
  try {
    const stats = await getExamDashboardStats({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
    });
    res.json(stats);
  } catch (e) {
    next(e);
  }
});

// ─── EXAM CONTAINERS ───────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const filter = buildExamFilter(req);
    let list = await ExamContainer.find(filter)
      .populate('sessionId', 'title startDate endDate isActive')
      .sort({ createdAt: -1 });

    // Heal exams stuck on processing after all result rows were already published
    const stuck = list.filter((e) => e.status === 'processing' || e.status === 'marks_entry');
    if (stuck.length) {
      let healedAny = false;
      for (const e of stuck) {
        const healed = await healExamPublishedStatus({
          tenantId: req.tenantId,
          sessionId: req.examScope.sessionId || e.sessionId,
          examId: e._id,
          userId: req.user?.userId || null,
        });
        if (healed) healedAny = true;
      }
      if (healedAny) {
        list = await ExamContainer.find(filter)
          .populate('sessionId', 'title startDate endDate isActive')
          .sort({ createdAt: -1 });
      }
    }

    const examIds = list.map((e) => e._id);
    const pipelines = examIds.length
      ? await ExamClassPipeline.find({ ...filter, examId: { $in: examIds } })
          .populate('darjahId', 'name code')
          .sort({ createdAt: 1 })
      : [];
    const pipesByExam = {};
    for (const p of pipelines) {
      const key = String(p.examId);
      if (!pipesByExam[key]) pipesByExam[key] = [];
      pipesByExam[key].push(p);
    }
    res.json(
      list.map((e) => ({
        ...e.toObject(),
        pipelines: pipesByExam[String(e._id)] || [],
      }))
    );
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { sessionId } = req.examScope;
    const { name, examType, examTypeIndex, startDate, endDate, resultPublicationDate, status } =
      req.body;
    const doc = await ExamContainer.create({
      tenantId: req.tenantId,
      sessionId,
      name,
      examType,
      examTypeIndex,
      startDate,
      endDate,
      resultPublicationDate,
      status: status || 'draft',
    });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.get('/:examId', requireExamContext, async (req, res, next) => {
  try {
    const exam = req.examScope.exam;
    const pipelines = await ExamClassPipeline.find(buildExamFilter(req))
      .populate('darjahId', 'name code')
      .sort({ createdAt: 1 });
    res.json({ ...exam.toObject(), pipelines });
  } catch (e) {
    next(e);
  }
});

router.put('/:examId', requireExamContext, async (req, res, next) => {
  try {
    const exam = req.examScope.exam;
    if (exam.isLocked) {
      const err = new Error('Exam is locked');
      err.status = 403;
      throw err;
    }
    const fields = ['name', 'examType', 'examTypeIndex', 'startDate', 'endDate', 'resultPublicationDate', 'status'];
    for (const f of fields) {
      if (req.body[f] !== undefined) exam[f] = req.body[f];
    }
    await exam.save();
    res.json(exam);
  } catch (e) {
    next(e);
  }
});

router.delete('/:examId', requireExamContext, async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || req.query?.reason || '').trim();
    const result = await deleteExamCascade({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      reason,
      userId: req.user?.userId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/** Prefer POST when clients cannot send a body with DELETE */
router.post('/:examId/delete', requireExamContext, async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || req.query?.reason || '').trim();
    const result = await deleteExamCascade({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      reason,
      userId: req.user?.userId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/:examId/unlock', requireExamContext, async (req, res, next) => {
  try {
    const result = await unlockExamContainer({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      reason: req.body.reason,
      userId: req.user?.userId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// ─── CLASS PIPELINES ───────────────────────────────────────────────

router.get('/:examId/classes', requireExamContext, async (req, res, next) => {
  try {
    const list = await ExamClassPipeline.find(buildExamFilter(req))
      .populate('darjahId', 'name code subjectIds')
      .sort({ createdAt: 1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/:examId/classes', requireExamContext, async (req, res, next) => {
  try {
    const { darjahIds } = req.body;
    if (!Array.isArray(darjahIds) || !darjahIds.length) {
      const err = new Error('darjahIds array required');
      err.status = 400;
      throw err;
    }
    const { sessionId, examId, exam } = req.examScope;
    assertExamStructureEditable(exam);

    const created = [];
    for (const darjahId of darjahIds) {
      parseObjectId(darjahId, 'darjahId');
      const exists = await Darjah.findOne({ _id: darjahId, tenantId: req.tenantId, sessionId });
      if (!exists) continue;
      const doc = await ExamClassPipeline.findOneAndUpdate(
        { tenantId: req.tenantId, sessionId, examId, darjahId },
        { $setOnInsert: { tenantId: req.tenantId, sessionId, examId, darjahId, status: 'pending' } },
        { upsert: true, new: true }
      );
      created.push(doc);
    }

    if (exam.status === 'draft') {
      exam.status = 'configured';
      await exam.save();
    }
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

router.delete('/:examId/classes/:darjahId', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId } = req.params;
    const filter = { ...buildExamFilter(req), darjahId };
    const pipeline = await ExamClassPipeline.findOne(filter);
    if (pipeline?.marksEntryStartedAt) {
      const err = new Error('Cannot remove class after marks entry started');
      err.status = 400;
      throw err;
    }
    await Promise.all([
      ExamClassPipeline.deleteOne(filter),
      ExamSubjectMapping.deleteMany(filter),
      ExamStudentSnapshot.deleteMany(filter),
      ExamSchedule.deleteMany(filter),
      ExamAttendance.deleteMany(filter),
      ExamMarks.deleteMany(filter),
      ExamResult.deleteMany(filter),
    ]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ─── SUBJECT MAPPINGS ────────────────────────────────────────────

router.get('/:examId/classes/:darjahId/subjects', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId } = req.params;
    const list = await ExamSubjectMapping.find({ ...buildExamFilter(req), darjahId })
      .populate('subjectId', 'name systemType')
      .populate('bookId', 'title')
      .populate('teacherId', 'name teacherId')
      .sort({ createdAt: 1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/:examId/classes/:darjahId/subjects', requireExamContext, async (req, res, next) => {
  try {
    assertExamStructureEditable(req.examScope.exam);
    const { darjahId } = req.params;
    const { mappings } = req.body;
    if (!Array.isArray(mappings)) {
      const err = new Error('mappings array required');
      err.status = 400;
      throw err;
    }
    const { sessionId, examId } = req.examScope;
    const results = [];

    for (const m of mappings) {
      const existing = m._id
        ? await ExamSubjectMapping.findOne({
            _id: m._id,
            tenantId: req.tenantId,
            sessionId,
            examId,
            darjahId,
          })
        : null;

      if (existing?.isLocked) {
        const err = new Error('Subject mapping is locked');
        err.status = 403;
        throw err;
      }

      const doc = await ExamSubjectMapping.findOneAndUpdate(
        existing
          ? { _id: existing._id }
          : {
              tenantId: req.tenantId,
              sessionId,
              examId,
              darjahId,
              subjectId: m.subjectId,
              bookId: m.bookId || null,
            },
        {
          $set: {
            teacherId: m.teacherId || null,
            maxMarks: m.maxMarks,
            passingMarks: m.passingMarks,
            weightage: m.weightage ?? 100,
            examType: m.examType || 'written',
          },
        },
        { upsert: !existing, new: true }
      );
      results.push(doc);
    }

    await ExamClassPipeline.updateOne(
      { tenantId: req.tenantId, sessionId, examId, darjahId },
      { $set: { status: 'configured' } }
    );

    res.json(results);
  } catch (e) {
    next(e);
  }
});

router.delete(
  '/:examId/classes/:darjahId/subjects/:mappingId',
  requireExamContext,
  async (req, res, next) => {
    try {
      const { darjahId, mappingId } = req.params;
      const mapping = await ExamSubjectMapping.findOne({
        ...buildExamFilter(req),
        darjahId,
        _id: mappingId,
      });
      if (!mapping) {
        const err = new Error('Mapping not found');
        err.status = 404;
        throw err;
      }
      if (mapping.isLocked) {
        const err = new Error('Locked mapping cannot be deleted');
        err.status = 403;
        throw err;
      }
      await mapping.deleteOne();
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

// ─── STUDENT SNAPSHOT ────────────────────────────────────────────

router.get('/:examId/classes/:darjahId/snapshot', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId } = req.params;
    const { sectionId } = req.query;
    const filter = { ...buildExamFilter(req), darjahId };
    if (sectionId) filter.sectionId = sectionId;
    const list = await ExamStudentSnapshot.find(filter)
      .populate('studentId', 'name studentId rollNumber photoUrl')
      .sort({ rollNumber: 1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/:examId/classes/:darjahId/snapshot', requireExamContext, async (req, res, next) => {
  try {
    assertExamStructureEditable(req.examScope.exam);
    const { darjahId } = req.params;
    const list = await generateStudentSnapshot({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      darjahId,
    });
    res.status(201).json(list);
  } catch (e) {
    next(e);
  }
});

router.patch('/:examId/classes/:darjahId/snapshot/rolls', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId } = req.params;
    const { sectionId, entries, autoAssign } = req.body;
    const list = await assignRollNumbers({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      darjahId,
      sectionId: sectionId || null,
      entries,
      autoAssign,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// ─── DATE SHEET ────────────────────────────────────────────────────

router.get('/:examId/schedule', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId, sectionId } = req.query;
    const filter = buildExamFilter(req);
    if (darjahId) filter.darjahId = darjahId;
    if (sectionId) filter.sectionId = sectionId;
    const list = await ExamSchedule.find(filter)
      .populate('darjahId', 'name code')
      .populate('sectionId', 'name')
      .populate({
        path: 'subjectMappingId',
        populate: [
          { path: 'subjectId', select: 'name systemType' },
          { path: 'bookId', select: 'title' },
        ],
      })
      .populate('supervisorId', 'name')
      .sort({ examDate: 1, startTime: 1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/:examId/schedule', requireExamContext, async (req, res, next) => {
  try {
    const { entries, skipValidation } = req.body;
    if (!Array.isArray(entries)) {
      const err = new Error('entries array required');
      err.status = 400;
      throw err;
    }
    const { sessionId, examId } = req.examScope;

    const mappingIds = entries.map((e) => String(e.subjectMappingId)).filter(Boolean);
    if (new Set(mappingIds).size !== mappingIds.length) {
      const err = new Error('Duplicate subject/kitab in the same request');
      err.status = 400;
      throw err;
    }
    const alreadyScheduled = await ExamSchedule.find({
      tenantId: req.tenantId,
      sessionId,
      examId,
      subjectMappingId: { $in: mappingIds },
    }).select('subjectMappingId');
    if (alreadyScheduled.length) {
      const err = new Error('One or more selected subjects are already on the date sheet');
      err.status = 400;
      throw err;
    }

    if (!skipValidation) {
      const conflicts = await validateScheduleConflicts({
        tenantId: req.tenantId,
        sessionId,
        examId,
        entries,
      });
      if (conflicts.length) {
        return res.status(409).json({ conflicts });
      }
    }

    const created = [];
    for (const e of entries) {
      const doc = await ExamSchedule.create({
        tenantId: req.tenantId,
        sessionId,
        examId,
        darjahId: e.darjahId,
        sectionId: e.sectionId || null,
        subjectMappingId: e.subjectMappingId,
        examDate: e.examDate,
        startTime: e.startTime || '',
        endTime: e.endTime || '',
        room: e.room || '',
        supervisorId: e.supervisorId || null,
      });
      created.push(doc);
    }
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

router.put('/:examId/schedule/:scheduleId', requireExamContext, async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    const doc = await ExamSchedule.findOne({ ...buildExamFilter(req), _id: scheduleId });
    if (!doc) {
      const err = new Error('Schedule entry not found');
      err.status = 404;
      throw err;
    }
    const updated = { ...doc.toObject(), ...req.body, _id: doc._id };
    const conflicts = await validateScheduleConflicts({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      entries: [updated],
      excludeId: scheduleId,
    });
    if (conflicts.length) return res.status(409).json({ conflicts });

    Object.assign(doc, req.body);
    await doc.save();
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/:examId/schedule/:scheduleId', requireExamContext, async (req, res, next) => {
  try {
    await ExamSchedule.deleteOne({ ...buildExamFilter(req), _id: req.params.scheduleId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ─── ATTENDANCE ────────────────────────────────────────────────────

router.get('/:examId/attendance', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId, sectionId } = req.query;
    if (!darjahId) {
      const err = new Error('darjahId required');
      err.status = 400;
      throw err;
    }
    const filter = { ...buildExamFilter(req), darjahId };
    if (sectionId) filter.sectionId = sectionId;

    const [attendance, snapshots] = await Promise.all([
      ExamAttendance.find(filter).populate('studentSnapshotId'),
      ExamStudentSnapshot.find(filter)
        .sort({ rollNumber: 1 })
        .populate('studentId', 'photoUrl'),
    ]);

    res.json({ attendance, snapshots });
  } catch (e) {
    next(e);
  }
});

router.post('/:examId/attendance', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId, sectionId, entries } = req.body;
    if (!darjahId || !Array.isArray(entries)) {
      const err = new Error('darjahId and entries required');
      err.status = 400;
      throw err;
    }
    const { sessionId, examId } = req.examScope;
    const results = [];

    for (const e of entries) {
      const setDoc = {
        status: e.status || 'present',
        remarks: e.remarks || '',
      };
      if (e.salahAttendance && typeof e.salahAttendance === 'object') {
        setDoc.salahAttendance = {
          fajr: e.salahAttendance.fajr || '',
          zuhr: e.salahAttendance.zuhr || '',
          asr: e.salahAttendance.asr || '',
          maghrib: e.salahAttendance.maghrib || '',
          isha: e.salahAttendance.isha || '',
        };
      }
      const doc = await ExamAttendance.findOneAndUpdate(
        {
          tenantId: req.tenantId,
          sessionId,
          examId,
          darjahId,
          sectionId: sectionId || null,
          studentSnapshotId: e.studentSnapshotId,
        },
        { $set: setDoc },
        { upsert: true, new: true }
      );
      results.push(doc);
    }
    res.json(results);
  } catch (e) {
    next(e);
  }
});

// ─── MARKS ENTRY ─────────────────────────────────────────────────

router.get('/:examId/marks', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId, subjectMappingId, teacherId } = req.query;
    const filter = buildExamFilter(req);
    if (darjahId) filter.darjahId = darjahId;
    if (subjectMappingId) filter.subjectMappingId = subjectMappingId;

    let mappingFilter = { ...buildExamFilter(req) };
    if (darjahId) mappingFilter.darjahId = darjahId;
    if (teacherId) mappingFilter.teacherId = teacherId;

    const [marks, mappings, snapshots] = await Promise.all([
      ExamMarks.find(filter).populate('studentSnapshotId'),
      ExamSubjectMapping.find(mappingFilter)
        .populate('subjectId', 'name')
        .populate('bookId', 'title')
        .populate('teacherId', 'name'),
      darjahId
        ? ExamStudentSnapshot.find({ ...buildExamFilter(req), darjahId }).sort({ rollNumber: 1 })
        : [],
    ]);

    res.json({ marks, mappings, snapshots });
  } catch (e) {
    next(e);
  }
});

router.post('/:examId/marks', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId, subjectMappingId, entries, submit } = req.body;
    const result = await saveMarks({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      darjahId,
      subjectMappingId,
      entries,
      submit: !!submit,
      userId: req.user?.userId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/:examId/marks/import',
  requireExamContext,
  uploadExcel.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file?.buffer) {
        const err = new Error('No file uploaded');
        err.status = 400;
        throw err;
      }
      const { darjahId, subjectMappingId, submit } = req.body;
      if (!darjahId || !subjectMappingId) {
        const err = new Error('darjahId and subjectMappingId required');
        err.status = 400;
        throw err;
      }

      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const result = await importMarksFromRows({
        tenantId: req.tenantId,
        sessionId: req.examScope.sessionId,
        examId: req.examScope.examId,
        darjahId,
        subjectMappingId,
        rows,
        submit: submit === 'true' || submit === true,
        userId: req.user?.userId,
      });
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.post('/:examId/marks/grace', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId, subjectMappingId, studentSnapshotId, graceMarks, reason } = req.body;
    const mapping = await ExamSubjectMapping.findOne({
      ...buildExamFilter(req),
      darjahId,
      _id: subjectMappingId,
    });
    if (!mapping) {
      const err = new Error('Mapping not found');
      err.status = 404;
      throw err;
    }

    const existing = await ExamMarks.findOne({
      ...buildExamFilter(req),
      subjectMappingId,
      studentSnapshotId,
    });

    const grace = Number(graceMarks) || 0;
    const original = existing?.originalMarks ?? 0;
    const finalMarks = Math.min(original + grace, mapping.maxMarks);

    const doc = await ExamMarks.findOneAndUpdate(
      {
        ...buildExamFilter(req),
        darjahId,
        subjectMappingId,
        studentSnapshotId,
      },
      {
        $set: {
          graceMarks: grace,
          finalMarks,
        },
      },
      { upsert: true, new: true }
    );

    await writeAuditLog({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      entityType: 'ExamMarks',
      entityId: doc._id,
      action: 'grace_marks',
      beforeValue: { graceMarks: existing?.graceMarks ?? 0 },
      afterValue: { graceMarks: grace, finalMarks },
      reason,
      changedBy: req.user?.userId,
    });

    const { reprocessed } = await reprocessResultsIfNeeded({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      darjahId,
    });

    res.json({ ...doc.toObject(), reprocessed });
  } catch (e) {
    next(e);
  }
});

router.post('/:examId/marks/unlock', requireExamContext, async (req, res, next) => {
  try {
    const result = await unlockForReEvaluation({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      scope: req.body.scope,
      targetId: req.body.targetId,
      reason: req.body.reason,
      userId: req.user?.userId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// ─── RESULTS ─────────────────────────────────────────────────────

router.post('/:examId/process-results', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId } = req.body;
    if (!darjahId) {
      const err = new Error('darjahId required');
      err.status = 400;
      throw err;
    }
    const results = await processResults({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      darjahId,
    });
    res.json(results);
  } catch (e) {
    next(e);
  }
});

router.get('/:examId/results', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId, sectionId, matrix } = req.query;
    if (matrix === '1' || matrix === 'true') {
      if (!darjahId) {
        const err = new Error('darjahId required for result matrix');
        err.status = 400;
        throw err;
      }
      const data = await getResultMatrix({
        tenantId: req.tenantId,
        sessionId: req.examScope.sessionId,
        examId: req.examScope.examId,
        darjahId,
        sectionId: sectionId || null,
      });
      return res.json(data);
    }

    const filter = buildExamFilter(req);
    if (darjahId) filter.darjahId = darjahId;
    if (sectionId) filter.sectionId = sectionId;

    const results = await ExamResult.find(filter)
      .populate('studentSnapshotId')
      .populate('darjahId', 'name code')
      .sort({ classRank: 1 });

    res.json(results);
  } catch (e) {
    next(e);
  }
});

router.post('/:examId/publish', requireExamContext, async (req, res, next) => {
  try {
    const { level, targetId } = req.body;
    const result = await publishResults({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      level,
      targetId,
      userId: req.user?.userId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/:examId/export', requireExamContext, async (req, res, next) => {
  try {
    const { darjahId, sectionId } = req.query;
    if (!darjahId) {
      const err = new Error('darjahId required for export');
      err.status = 400;
      throw err;
    }
    const csv = await exportResultsCsv({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      darjahId,
      sectionId: sectionId || null,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="exam-results-${darjahId}.csv"`);
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

// ─── ANALYTICS & AUDIT ───────────────────────────────────────────

router.get('/:examId/analytics', requireExamContext, async (req, res, next) => {
  try {
    const analytics = await getExamAnalytics({
      tenantId: req.tenantId,
      sessionId: req.examScope.sessionId,
      examId: req.examScope.examId,
      darjahId: req.query.darjahId,
    });
    res.json(analytics);
  } catch (e) {
    next(e);
  }
});

router.get('/:examId/audit-log', requireExamContext, async (req, res, next) => {
  try {
    const list = await ExamAuditLog.find(buildExamFilter(req))
      .populate('changedBy', 'username')
      .sort({ changedAt: -1 })
      .limit(200);
    res.json(list);
  } catch (e) {
    next(e);
  }
});

export default router;
