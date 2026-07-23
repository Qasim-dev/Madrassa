import mongoose from 'mongoose';
import { ExamContainer } from '../models/ExamContainer.js';
import { ExamClassPipeline } from '../models/ExamClassPipeline.js';
import { ExamSubjectMapping } from '../models/ExamSubjectMapping.js';
import { ExamStudentSnapshot } from '../models/ExamStudentSnapshot.js';
import { ExamSchedule } from '../models/ExamSchedule.js';
import { ExamAttendance } from '../models/ExamAttendance.js';
import { ExamMarks } from '../models/ExamMarks.js';
import { ExamResult } from '../models/ExamResult.js';
import { ExamAuditLog } from '../models/ExamAuditLog.js';
import { Student } from '../models/Student.js';
import { Darjah } from '../models/Darjah.js';
import { Subject } from '../models/Subject.js';
import { computeDivision } from '../constants/examEnums.js';

/** Reject queries missing mandatory session/exam scope */
export function assertSessionScope(sessionId, examId) {
  if (!sessionId) {
    const err = new Error('sessionId is required for all exam operations');
    err.status = 400;
    throw err;
  }
  if (examId && !mongoose.isValidObjectId(examId)) {
    const err = new Error('Invalid examId');
    err.status = 400;
    throw err;
  }
}

export async function loadExamContainer(tenantId, examId, sessionId) {
  assertSessionScope(sessionId, examId);
  const exam = await ExamContainer.findOne({ _id: examId, tenantId, sessionId });
  if (!exam) {
    const err = new Error('Exam not found in this session');
    err.status = 404;
    throw err;
  }
  return exam;
}

/** Block structural edits (classes, subjects, snapshot) when exam is locked or past marks entry */
export function assertExamStructureEditable(exam) {
  if (exam.isLocked || ['published', 'closed'].includes(exam.status)) {
    const err = new Error('Exam is locked. Use unlock to modify classes and configuration.');
    err.status = 403;
    err.code = 'EXAM_LOCKED';
    throw err;
  }
  if (['marks_entry', 'processing'].includes(exam.status)) {
    const err = new Error('Marks entry has started — exam structure cannot be changed.');
    err.status = 403;
    err.code = 'MARKS_STARTED';
    throw err;
  }
}

/** Admin unlock — restores exam to editable state after mistaken publication */
export async function unlockExamContainer({ tenantId, sessionId, examId, reason, userId }) {
  if (!reason?.trim()) {
    const err = new Error('Reason is mandatory to unlock an exam');
    err.status = 400;
    throw err;
  }

  const exam = await ExamContainer.findOne({ _id: examId, tenantId, sessionId });
  if (!exam) {
    const err = new Error('Exam not found');
    err.status = 404;
    throw err;
  }

  const hasMarks = await ExamMarks.exists({ tenantId, sessionId, examId });
  const hasSnapshot = await ExamStudentSnapshot.exists({ tenantId, sessionId, examId });

  let newStatus = 'configured';
  if (hasMarks) newStatus = 'marks_entry';
  else if (hasSnapshot) newStatus = 'active';

  const before = { isLocked: exam.isLocked, status: exam.status };
  exam.isLocked = false;
  exam.status = newStatus;
  exam.publishedAt = null;
  exam.publishedBy = null;
  await exam.save();

  await ExamResult.updateMany(
    { tenantId, sessionId, examId },
    { $set: { isPublished: false, isLocked: false, publicationLevel: '', publishedAt: null } }
  );
  await ExamMarks.updateMany(
    { tenantId, sessionId, examId, status: 'locked' },
    { $set: { status: 'submitted' } }
  );

  await writeAuditLog({
    tenantId,
    sessionId,
    examId,
    entityType: 'ExamContainer',
    entityId: examId,
    action: 'unlock_container',
    beforeValue: before,
    afterValue: { isLocked: false, status: newStatus },
    reason,
    changedBy: userId,
  });

  return { ok: true, status: newStatus };
}

export async function writeAuditLog({
  tenantId,
  sessionId,
  examId,
  entityType,
  entityId,
  action,
  beforeValue,
  afterValue,
  reason,
  changedBy,
}) {
  await ExamAuditLog.create({
    tenantId,
    sessionId,
    examId,
    entityType,
    entityId,
    action,
    beforeValue,
    afterValue,
    reason: reason || '',
    changedBy,
    changedAt: new Date(),
  });
}

const MIN_EXAM_DELETE_REASON_LEN = 10;

/**
 * Permanently delete an exam and all related operational data.
 * Requires a meaningful reason (audit trail). Audit logs for the exam are kept.
 */
export async function deleteExamCascade({ tenantId, sessionId, examId, reason, userId }) {
  const trimmed = String(reason || '').trim();
  if (trimmed.length < MIN_EXAM_DELETE_REASON_LEN) {
    const err = new Error(
      `A valid deletion reason is required (at least ${MIN_EXAM_DELETE_REASON_LEN} characters)`
    );
    err.status = 400;
    throw err;
  }

  const exam = await loadExamContainer(tenantId, examId, sessionId);
  const filter = { tenantId, sessionId, examId };

  const [
    pipelines,
    mappings,
    snapshots,
    schedules,
    attendance,
    marks,
    results,
  ] = await Promise.all([
    ExamClassPipeline.countDocuments(filter),
    ExamSubjectMapping.countDocuments(filter),
    ExamStudentSnapshot.countDocuments(filter),
    ExamSchedule.countDocuments(filter),
    ExamAttendance.countDocuments(filter),
    ExamMarks.countDocuments(filter),
    ExamResult.countDocuments(filter),
  ]);

  const snapshot = {
    name: exam.name,
    examType: exam.examType,
    status: exam.status,
    isLocked: exam.isLocked,
    startDate: exam.startDate,
    endDate: exam.endDate,
    resultPublicationDate: exam.resultPublicationDate,
    relatedCounts: {
      pipelines,
      mappings,
      snapshots,
      schedules,
      attendance,
      marks,
      results,
    },
  };

  await writeAuditLog({
    tenantId,
    sessionId,
    examId,
    entityType: 'ExamContainer',
    entityId: exam._id,
    action: 'exam_deleted',
    beforeValue: snapshot,
    afterValue: null,
    reason: trimmed,
    changedBy: userId,
  });

  await Promise.all([
    ExamClassPipeline.deleteMany(filter),
    ExamSubjectMapping.deleteMany(filter),
    ExamStudentSnapshot.deleteMany(filter),
    ExamSchedule.deleteMany(filter),
    ExamAttendance.deleteMany(filter),
    ExamMarks.deleteMany(filter),
    ExamResult.deleteMany(filter),
  ]);

  await ExamContainer.deleteOne({ _id: examId, tenantId, sessionId });

  return {
    ok: true,
    auditRecorded: true,
    deleted: snapshot.relatedCounts,
  };
}

/** STEP 4 — Generate immutable student roster snapshot */
export async function generateStudentSnapshot({ tenantId, sessionId, examId, darjahId }) {
  const pipeline = await ExamClassPipeline.findOne({ tenantId, sessionId, examId, darjahId });
  if (!pipeline) {
    const err = new Error('Class pipeline not found');
    err.status = 404;
    throw err;
  }

  const mappings = await ExamSubjectMapping.find({ tenantId, sessionId, examId, darjahId });
  if (mappings.length === 0) {
    const err = new Error('Configure subject mappings before generating snapshot');
    err.status = 400;
    throw err;
  }

  const darjah = await Darjah.findOne({ _id: darjahId, tenantId, sessionId });
  if (!darjah) {
    const err = new Error('Darjah not found');
    err.status = 404;
    throw err;
  }

  const students = await Student.find({ tenantId, sessionId, darjahId, exitDate: null });
  const sectionIds = [...new Set(students.map((s) => String(s.subjectId || '')).filter(Boolean))];
  const sections = sectionIds.length
    ? await Subject.find({ _id: { $in: sectionIds }, tenantId })
    : [];
  const sectionMap = Object.fromEntries(sections.map((s) => [String(s._id), s]));

  const ops = students.map((st) => ({
    updateOne: {
      filter: { tenantId, sessionId, examId, darjahId, studentId: st._id },
      update: {
        $set: {
          sectionId: st.subjectId || null,
          studentName: st.name,
          fatherName: st.fatherName || {},
          rollNumber: st.rollNumber || '',
          admissionNumber: st.studentId || '',
          photoUrl: st.photoUrl || '',
          darjahName: darjah.name,
          sectionName: st.subjectId ? sectionMap[String(st.subjectId)]?.name || {} : {},
          snapshotAt: new Date(),
        },
        $setOnInsert: { tenantId, sessionId, examId, darjahId, studentId: st._id },
      },
      upsert: true,
    },
  }));

  if (ops.length) await ExamStudentSnapshot.bulkWrite(ops);

  pipeline.status = 'snapshot_taken';
  pipeline.snapshotGeneratedAt = new Date();
  await pipeline.save();

  return ExamStudentSnapshot.find({ tenantId, sessionId, examId, darjahId })
    .sort({ rollNumber: 1 })
    .populate('studentId', 'name studentId rollNumber photoUrl');
}

/** STEP 5 — Validate schedule conflicts */
export async function validateScheduleConflicts({
  tenantId,
  sessionId,
  examId,
  entries,
  excludeId = null,
}) {
  const conflicts = [];
  const existing = await ExamSchedule.find({
    tenantId,
    sessionId,
    examId,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).populate('subjectMappingId');

  for (const entry of entries) {
    const date = new Date(entry.examDate);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const sameDay = existing.filter((e) => {
      const d = new Date(e.examDate);
      return d >= dayStart && d <= dayEnd;
    });

    for (const other of sameDay) {
      if (String(other._id) === String(excludeId)) continue;

      const overlap = timesOverlap(entry.startTime, entry.endTime, other.startTime, other.endTime);
      if (!overlap) continue;

      if (entry.supervisorId && String(other.supervisorId) === String(entry.supervisorId)) {
        conflicts.push({
          type: 'teacher_conflict',
          message: 'Teacher has overlapping exam duty',
          entry,
          conflictWith: other._id,
        });
      }
      if (entry.room && other.room && entry.room === other.room) {
        conflicts.push({
          type: 'room_conflict',
          message: 'Room has overlapping exam',
          entry,
          conflictWith: other._id,
        });
      }
      if (
        String(other.darjahId) === String(entry.darjahId) &&
        String(other.sectionId || '') === String(entry.sectionId || '') &&
        overlap
      ) {
        conflicts.push({
          type: 'section_overlap',
          message: 'Section has overlapping paper',
          entry,
          conflictWith: other._id,
        });
      }
    }
  }
  return conflicts;
}

function timesOverlap(s1, e1, s2, e2) {
  if (!s1 || !e1 || !s2 || !e2) return true;
  return s1 < e2 && s2 < e1;
}

/** STEP 7 — Save marks with validations */
export async function saveMarks({
  tenantId,
  sessionId,
  examId,
  darjahId,
  subjectMappingId,
  entries,
  submit = false,
  userId,
}) {
  const mapping = await ExamSubjectMapping.findOne({
    tenantId,
    sessionId,
    examId,
    darjahId,
    _id: subjectMappingId,
  });
  if (!mapping) {
    const err = new Error('Subject mapping not found');
    err.status = 404;
    throw err;
  }
  if (mapping.isLocked && submit) {
    const hasUnlocked = await ExamMarks.exists({
      tenantId,
      sessionId,
      examId,
      subjectMappingId,
      isUnlocked: true,
    });
    if (!hasUnlocked) {
      const err = new Error('Subject is locked. Unlock for re-evaluation first.');
      err.status = 403;
      throw err;
    }
  }

  if (!mapping.marksEntryStartedAt) {
    mapping.marksEntryStartedAt = new Date();
    await mapping.save();
    await ExamClassPipeline.updateOne(
      { tenantId, sessionId, examId, darjahId, marksEntryStartedAt: null },
      { $set: { marksEntryStartedAt: new Date(), status: 'active' } }
    );
    await ExamContainer.updateOne(
      { _id: examId, tenantId, status: { $in: ['draft', 'configured', 'active'] } },
      { $set: { status: 'marks_entry' } }
    );
  }

  if (submit) {
    mapping.isLocked = true;
    await mapping.save();
  }

  const snapshotIds = entries.map((e) => e.studentSnapshotId);
  const attendance = await ExamAttendance.find({
    tenantId,
    sessionId,
    examId,
    darjahId,
    studentSnapshotId: { $in: snapshotIds },
  });
  const absentSet = new Set(
    attendance.filter((a) => a.status === 'absent').map((a) => String(a.studentSnapshotId))
  );

  const results = [];
  for (const entry of entries) {
    if (absentSet.has(String(entry.studentSnapshotId)) && entry.originalMarks != null) {
      const err = new Error('Cannot assign marks to absent students');
      err.status = 400;
      throw err;
    }
    if (entry.originalMarks != null && entry.originalMarks < 0) {
      const err = new Error('Marks cannot be negative');
      err.status = 400;
      throw err;
    }
    if (entry.originalMarks != null && entry.originalMarks > mapping.maxMarks) {
      const err = new Error(`Marks cannot exceed maximum (${mapping.maxMarks})`);
      err.status = 400;
      throw err;
    }

    const grace = Number(entry.graceMarks) || 0;
    const original = entry.originalMarks != null ? Number(entry.originalMarks) : null;
    const finalMarks = original != null ? Math.min(original + grace, mapping.maxMarks) : null;

    const existing = await ExamMarks.findOne({
      tenantId,
      sessionId,
      examId,
      subjectMappingId,
      studentSnapshotId: entry.studentSnapshotId,
    });

    if (existing?.status === 'locked' && !existing.isUnlocked) {
      continue;
    }

    const before = existing ? { originalMarks: existing.originalMarks, graceMarks: existing.graceMarks } : null;

    const doc = await ExamMarks.findOneAndUpdate(
      {
        tenantId,
        sessionId,
        examId,
        subjectMappingId,
        studentSnapshotId: entry.studentSnapshotId,
      },
      {
        $set: {
          darjahId,
          originalMarks: original,
          graceMarks: grace,
          finalMarks,
          status: submit ? 'submitted' : 'draft',
          submittedAt: submit ? new Date() : null,
          enteredBy: userId,
          remarks: entry.remarks || '',
          isUnlocked: false,
        },
      },
      { upsert: true, new: true }
    );

    if (before && (before.originalMarks !== original || before.graceMarks !== grace)) {
      await writeAuditLog({
        tenantId,
        sessionId,
        examId,
        entityType: 'ExamMarks',
        entityId: doc._id,
        action: 'marks_changed',
        beforeValue: before,
        afterValue: { originalMarks: original, graceMarks: grace, finalMarks },
        reason: entry.reason || '',
        changedBy: userId,
      });
    }
    results.push(doc);
  }

  let reprocessed = false;
  if (submit) {
    const reprocess = await reprocessResultsIfNeeded({ tenantId, sessionId, examId, darjahId });
    reprocessed = reprocess.reprocessed;
  }

  return { marks: results, reprocessed };
}

/** Recompute class results when marks change after results were already processed */
export async function reprocessResultsIfNeeded({ tenantId, sessionId, examId, darjahId }) {
  const hadResults = await ExamResult.exists({ tenantId, sessionId, examId, darjahId });
  if (!hadResults) return { reprocessed: false };
  try {
    await processResults({ tenantId, sessionId, examId, darjahId });
    return { reprocessed: true };
  } catch {
    return { reprocessed: false };
  }
}

/** STEP 8 — Process results for a class */
export async function processResults({ tenantId, sessionId, examId, darjahId }) {
  const snapshots = await ExamStudentSnapshot.find({ tenantId, sessionId, examId, darjahId });
  const mappings = await ExamSubjectMapping.find({ tenantId, sessionId, examId, darjahId }).populate(
    'subjectId',
    'name'
  );
  const allMarks = await ExamMarks.find({ tenantId, sessionId, examId, darjahId });
  const attendance = await ExamAttendance.find({ tenantId, sessionId, examId, darjahId });

  if (!snapshots.length) {
    const err = new Error('Generate student snapshot before processing results');
    err.status = 400;
    throw err;
  }
  if (!mappings.length) {
    const err = new Error('Configure subject mappings before processing results');
    err.status = 400;
    throw err;
  }

  const absentSet = new Set(
    attendance.filter((a) => ['absent', 'leave', 'medical_leave'].includes(a.status))
      .map((a) => String(a.studentSnapshotId))
  );

  for (const mapping of mappings) {
    const submitted = allMarks.filter(
      (m) => String(m.subjectMappingId) === String(mapping._id) && m.status === 'submitted'
    );
    const expected = snapshots.filter((s) => !absentSet.has(String(s._id)));
    if (submitted.length < expected.length) {
      const name = mapping.subjectId?.name;
      const subjectLabel =
        typeof name === 'string' ? name : name?.en || name?.ur || 'Subject';
      const err = new Error(
        `All marks must be submitted before processing. ${subjectLabel} has ${submitted.length}/${expected.length} submitted.`
      );
      err.status = 400;
      throw err;
    }
  }

  const marksByStudent = {};
  for (const m of allMarks) {
    const key = String(m.studentSnapshotId);
    if (!marksByStudent[key]) marksByStudent[key] = {};
    marksByStudent[key][String(m.subjectMappingId)] = m;
  }

  const results = [];
  for (const snap of snapshots) {
    const isAbsent = absentSet.has(String(snap._id));
    const subjectTotals = [];
    let aggregateTotal = 0;
    let maxAggregate = 0;
    let graceApplied = 0;
    let allPassed = !isAbsent;

    for (const mapping of mappings) {
      const mark = marksByStudent[String(snap._id)]?.[String(mapping._id)];
      const max = mapping.maxMarks;
      let obtained = null;

      if (!isAbsent && mark?.finalMarks != null) {
        obtained = mark.finalMarks;
      } else if (!isAbsent) {
        obtained = 0;
      }

      const isPassed = isAbsent ? false : obtained != null && obtained >= mapping.passingMarks;

      if (!isPassed && !isAbsent) allPassed = false;
      graceApplied += mark?.graceMarks || 0;

      subjectTotals.push({
        subjectMappingId: mapping._id,
        subjectId: mapping.subjectId,
        bookId: mapping.bookId,
        maxMarks: max,
        obtainedMarks: obtained ?? 0,
        isPassed,
      });
      aggregateTotal += obtained != null && !isAbsent ? obtained : 0;
      maxAggregate += isAbsent ? 0 : max;
    }

    const weightedObtained = subjectTotals.reduce((sum, st, i) => {
      const w = (mappings[i]?.weightage ?? 100) / 100;
      return sum + (st.obtainedMarks ?? 0) * w;
    }, 0);
    const weightedMax = mappings.reduce((sum, m) => {
      if (isAbsent) return sum;
      return sum + m.maxMarks * ((m.weightage ?? 100) / 100);
    }, 0);

    const percentage = weightedMax > 0 ? Math.round((weightedObtained / weightedMax) * 10000) / 100 : 0;
    const passingPct = mappings.length
      ? mappings.reduce((s, m) => s + (m.passingMarks / m.maxMarks) * 100, 0) / mappings.length
      : 50;
    const division = isAbsent ? 'absent' : computeDivision(percentage, passingPct);
    const gpa = weightedMax > 0 ? Math.round((percentage / 25) * 100) / 100 : null;

    const doc = await ExamResult.findOneAndUpdate(
      { tenantId, sessionId, examId, studentSnapshotId: snap._id },
      {
        $set: {
          darjahId,
          sectionId: snap.sectionId,
          subjectTotals,
          aggregateTotal: Math.round(aggregateTotal * 100) / 100,
          maxAggregate: Math.round(maxAggregate * 100) / 100,
          percentage: isAbsent ? 0 : percentage,
          gpa: isAbsent ? null : gpa,
          division,
          isPassed: !isAbsent && allPassed && division !== 'fail',
          graceMarksApplied: graceApplied,
        },
      },
      { upsert: true, new: true }
    );
    results.push(doc);
  }

  await computeRankings({ tenantId, sessionId, examId, darjahId });

  await ExamClassPipeline.updateOne(
    { tenantId, sessionId, examId, darjahId },
    { $set: { status: 'locked' } }
  );

  await ExamContainer.updateOne(
    { _id: examId, tenantId },
    { $set: { status: 'processing' } }
  );

  return results;
}

/** STEP 9 — Ranking engine */
export async function computeRankings({ tenantId, sessionId, examId, darjahId }) {
  const allResults = await ExamResult.find({ tenantId, sessionId, examId, darjahId }).sort({
    percentage: -1,
    aggregateTotal: -1,
  });

  let classRank = 0;
  let prevPct = null;
  for (const r of allResults) {
    if (r.percentage !== prevPct) {
      classRank += 1;
      prevPct = r.percentage;
    }
    r.classRank = classRank;
    await r.save();
  }

  const sectionGroups = {};
  for (const r of allResults) {
    const key = String(r.sectionId || '__none__');
    if (!sectionGroups[key]) sectionGroups[key] = [];
    sectionGroups[key].push(r);
  }

  for (const group of Object.values(sectionGroups)) {
    group.sort((a, b) => b.percentage - a.percentage || b.aggregateTotal - a.aggregateTotal);
    let sectionRank = 0;
    let prev = null;
    for (const r of group) {
      if (r.percentage !== prev) {
        sectionRank += 1;
        prev = r.percentage;
      }
      r.sectionRank = sectionRank;
      await r.save();
    }
  }

  return allResults;
}

/** STEP 10 — Publish results */
export async function publishResults({
  tenantId,
  sessionId,
  examId,
  level,
  targetId,
  userId,
}) {
  const validLevels = ['student', 'section', 'class', 'exam'];
  if (!validLevels.includes(level)) {
    const err = new Error(`Invalid publication level: ${level}`);
    err.status = 400;
    throw err;
  }
  if (level === 'student' && !targetId) {
    const err = new Error('studentSnapshotId (targetId) required for student-level publish');
    err.status = 400;
    throw err;
  }
  if (level === 'section' && !targetId) {
    const err = new Error('sectionId (targetId) required for section-level publish');
    err.status = 400;
    throw err;
  }
  if (level === 'class' && !targetId) {
    const err = new Error('darjahId (targetId) required for class-level publish');
    err.status = 400;
    throw err;
  }

  const baseFilter = { tenantId, sessionId, examId };
  if (level === 'student') baseFilter.studentSnapshotId = targetId;
  else if (level === 'section') baseFilter.sectionId = targetId;
  else if (level === 'class') baseFilter.darjahId = targetId;

  const totalCount = await ExamResult.countDocuments(baseFilter);
  if (totalCount === 0) {
    const err = new Error('No processed results found. Process results for the selected class first.');
    err.status = 400;
    throw err;
  }

  const publishFilter = { ...baseFilter, isPublished: false };
  const matchCount = await ExamResult.countDocuments(publishFilter);

  /** Promote exam container to published when every result row is published. */
  async function syncExamPublishedIfComplete(now) {
    const examTotal = await ExamResult.countDocuments({ tenantId, sessionId, examId });
    if (examTotal === 0) return false;
    const examUnpublished = await ExamResult.countDocuments({
      tenantId,
      sessionId,
      examId,
      isPublished: false,
    });
    if (examUnpublished > 0) return false;

    await ExamMarks.updateMany({ tenantId, sessionId, examId }, { $set: { status: 'locked' } });
    await ExamContainer.updateOne(
      { _id: examId, tenantId },
      { $set: { status: 'published', publishedAt: now, publishedBy: userId, isLocked: true } }
    );
    return true;
  }

  const now = new Date();

  // Idempotent heal: all scoped rows already published — still sync exam status if complete
  if (matchCount === 0) {
    const healed = await syncExamPublishedIfComplete(now);
    if (healed || level !== 'exam') {
      await writeAuditLog({
        tenantId,
        sessionId,
        examId,
        entityType: 'ExamResult',
        entityId: targetId || examId,
        action: 'publish',
        beforeValue: null,
        afterValue: { level, targetId, alreadyPublished: true, examSynced: healed },
        reason: healed
          ? `Results already published; exam status synced to published (${level})`
          : `All matching results already published (${level})`,
        changedBy: userId,
      });
      return { ok: true, level, publishedAt: now, alreadyPublished: true, examSynced: healed };
    }
    const err = new Error('All matching results are already published.');
    err.status = 400;
    throw err;
  }

  if (level === 'exam') {
    const pipelines = await ExamClassPipeline.find({ tenantId, sessionId, examId });
    const allProcessed = pipelines.every((p) => p.status === 'locked');
    if (pipelines.length && !allProcessed) {
      const err = new Error('All classes must have results processed before full exam publish');
      err.status = 400;
      throw err;
    }
  }

  await ExamResult.updateMany(publishFilter, {
    $set: {
      isPublished: true,
      publishedAt: now,
      publicationLevel: level,
      isLocked: true,
    },
  });

  if (level === 'exam') {
    await ExamMarks.updateMany({ tenantId, sessionId, examId }, { $set: { status: 'locked' } });
    await ExamContainer.updateOne(
      { _id: examId, tenantId },
      { $set: { status: 'published', publishedAt: now, publishedBy: userId, isLocked: true } }
    );
  } else {
    // Class / section / student publish — promote exam when nothing left unpublished
    await syncExamPublishedIfComplete(now);
  }

  await writeAuditLog({
    tenantId,
    sessionId,
    examId,
    entityType: 'ExamResult',
    entityId: targetId || examId,
    action: 'publish',
    beforeValue: null,
    afterValue: { level, targetId },
    reason: `Published at ${level} level`,
    changedBy: userId,
  });

  return { ok: true, level, publishedAt: now };
}

/**
 * If an exam is stuck on `processing` but every result row is already published,
 * promote the container to `published` (heals list badge after class-level publish).
 */
export async function healExamPublishedStatus({ tenantId, sessionId, examId, userId = null }) {
  const exam = await ExamContainer.findOne({ _id: examId, tenantId }).lean();
  if (!exam || exam.status === 'published' || exam.status === 'closed') return false;

  const filter = { tenantId, examId };
  if (sessionId) filter.sessionId = sessionId;

  const total = await ExamResult.countDocuments(filter);
  if (total === 0) return false;
  const unpublished = await ExamResult.countDocuments({ ...filter, isPublished: false });
  if (unpublished > 0) return false;

  const now = new Date();
  await ExamMarks.updateMany(filter, { $set: { status: 'locked' } });
  await ExamContainer.updateOne(
    { _id: examId, tenantId },
    {
      $set: {
        status: 'published',
        publishedAt: exam.publishedAt || now,
        ...(userId ? { publishedBy: userId } : {}),
        isLocked: true,
      },
    }
  );
  return true;
}

/** Re-evaluation unlock */
export async function unlockForReEvaluation({
  tenantId,
  sessionId,
  examId,
  scope,
  targetId,
  reason,
  userId,
}) {
  if (!reason?.trim()) {
    const err = new Error('Reason is mandatory for re-evaluation');
    err.status = 400;
    throw err;
  }

  if (scope === 'subject') {
    const mapping = await ExamSubjectMapping.findOne({ _id: targetId, tenantId, sessionId, examId });
    if (!mapping) {
      const err = new Error('Subject mapping not found');
      err.status = 404;
      throw err;
    }
    await ExamSubjectMapping.updateOne(
      { _id: targetId, tenantId, sessionId, examId },
      { $set: { isLocked: false } }
    );
    await ExamMarks.updateMany(
      { tenantId, sessionId, examId, subjectMappingId: targetId },
      { $set: { isUnlocked: true, unlockReason: reason, status: 'draft' } }
    );
    const darjahId = mapping.darjahId;
    await ExamResult.updateMany(
      { tenantId, sessionId, examId, darjahId },
      { $set: { isPublished: false, isLocked: false, publishedAt: null, publicationLevel: '' } }
    );
    await ExamClassPipeline.updateOne(
      { tenantId, sessionId, examId, darjahId },
      { $set: { status: 'active' } }
    );
  } else if (scope === 'student') {
    await ExamMarks.updateMany(
      { tenantId, sessionId, examId, studentSnapshotId: targetId },
      { $set: { isUnlocked: true, unlockReason: reason, status: 'draft' } }
    );
    const result = await ExamResult.findOne({ tenantId, sessionId, examId, studentSnapshotId: targetId });
    if (result) {
      await ExamResult.updateOne(
        { tenantId, sessionId, examId, studentSnapshotId: targetId },
        { $set: { isLocked: false, isPublished: false, publishedAt: null, publicationLevel: '' } }
      );
      await ExamClassPipeline.updateOne(
        { tenantId, sessionId, examId, darjahId: result.darjahId },
        { $set: { status: 'active' } }
      );
    }
  }

  await writeAuditLog({
    tenantId,
    sessionId,
    examId,
    entityType: scope,
    entityId: targetId,
    action: 'unlock_reevaluation',
    beforeValue: { locked: true },
    afterValue: { unlocked: true },
    reason,
    changedBy: userId,
  });

  return { ok: true };
}

/** Analytics aggregation */
export async function getExamAnalytics({ tenantId, sessionId, examId, darjahId }) {
  const match = { tenantId, sessionId, examId };
  if (darjahId) match.darjahId = darjahId;

  const results = await ExamResult.find(match);
  const mappings = await ExamSubjectMapping.find({ tenantId, sessionId, examId, ...(darjahId ? { darjahId } : {}) });

  const classPerformance = {};
  const subjectPerformance = {};
  let totalPct = 0;
  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    const key = String(r.darjahId);
    if (!classPerformance[key]) classPerformance[key] = { total: 0, count: 0, pass: 0, fail: 0 };
    classPerformance[key].total += r.percentage;
    classPerformance[key].count += 1;
    if (r.isPassed) {
      classPerformance[key].pass += 1;
      passCount += 1;
    } else {
      classPerformance[key].fail += 1;
      failCount += 1;
    }
    totalPct += r.percentage;

    for (const st of r.subjectTotals) {
      const sk = String(st.subjectId);
      if (!subjectPerformance[sk]) {
        subjectPerformance[sk] = { total: 0, count: 0, pass: 0, fail: 0, maxMarks: st.maxMarks };
      }
      subjectPerformance[sk].total += st.obtainedMarks;
      subjectPerformance[sk].count += 1;
      if (st.isPassed) subjectPerformance[sk].pass += 1;
      else subjectPerformance[sk].fail += 1;
    }
  }

  const avgPercentage = results.length ? Math.round((totalPct / results.length) * 100) / 100 : 0;
  const passRate = results.length ? Math.round((passCount / results.length) * 10000) / 100 : 0;

  const weakSubjects = Object.entries(subjectPerformance)
    .map(([subjectId, data]) => ({
      subjectId,
      passRate: data.count ? Math.round((data.pass / data.count) * 10000) / 100 : 0,
      avgMarks: data.count ? Math.round((data.total / data.count) * 100) / 100 : 0,
    }))
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, 5);

  return {
    summary: {
      totalStudents: results.length,
      avgPercentage,
      passRate,
      passCount,
      failCount,
    },
    classPerformance: Object.entries(classPerformance).map(([darjahIdKey, data]) => ({
      darjahId: darjahIdKey,
      avgPercentage: data.count ? Math.round((data.total / data.count) * 100) / 100 : 0,
      passRate: data.count ? Math.round((data.pass / data.count) * 10000) / 100 : 0,
      studentCount: data.count,
    })),
    subjectPerformance: Object.entries(subjectPerformance).map(([subjectId, data]) => ({
      subjectId,
      avgMarks: data.count ? Math.round((data.total / data.count) * 100) / 100 : 0,
      passRate: data.count ? Math.round((data.pass / data.count) * 10000) / 100 : 0,
      totalStudents: data.count,
    })),
    weakSubjects,
    mappingsCount: mappings.length,
  };
}

/** Session-wide exam dashboard KPIs */
export async function getExamDashboardStats({ tenantId, sessionId }) {
  const exams = await ExamContainer.find({ tenantId, sessionId }).lean();
  const examIds = exams.map((e) => e._id);

  const activeExams = exams.filter((e) =>
    ['configured', 'active', 'marks_entry', 'processing'].includes(e.status)
  ).length;
  const publishedExams = exams.filter((e) => e.status === 'published').length;

  const [pendingMarks, totalMarks, results] = await Promise.all([
    ExamMarks.countDocuments({
      tenantId,
      sessionId,
      ...(examIds.length ? { examId: { $in: examIds } } : {}),
      status: 'draft',
    }),
    ExamMarks.countDocuments({
      tenantId,
      sessionId,
      ...(examIds.length ? { examId: { $in: examIds } } : {}),
    }),
    ExamResult.find({
      tenantId,
      sessionId,
      ...(examIds.length ? { examId: { $in: examIds } } : {}),
    }).lean(),
  ]);

  const passCount = results.filter((r) => r.isPassed).length;
  const passRate = results.length
    ? Math.round((passCount / results.length) * 10000) / 100
    : 0;

  return {
    totalExams: exams.length,
    activeExams,
    publishedExams,
    pendingMarks,
    totalMarks,
    totalResults: results.length,
    passRate,
    passCount,
    failCount: results.length - passCount,
  };
}

/** Bulk import marks from parsed Excel rows (rollNumber + marks columns) */
export async function importMarksFromRows({
  tenantId,
  sessionId,
  examId,
  darjahId,
  subjectMappingId,
  rows,
  submit = false,
  userId,
}) {
  const snapshots = await ExamStudentSnapshot.find({ tenantId, sessionId, examId, darjahId });
  const byRoll = Object.fromEntries(
    snapshots.filter((s) => s.rollNumber).map((s) => [String(s.rollNumber).trim(), s._id])
  );
  const byAdm = Object.fromEntries(
    snapshots.filter((s) => s.admissionNumber).map((s) => [String(s.admissionNumber).trim(), s._id])
  );

  const entries = [];
  const errors = [];

  for (const row of rows) {
    const key = String(
      row.rollNumber ?? row.roll_no ?? row.roll ?? row.admissionNumber ?? row.admission_no ?? ''
    ).trim();
    if (!key) continue;

    const rawMarks = row.marks ?? row.originalMarks ?? row.original_marks ?? row.score;
    const snapId = byRoll[key] || byAdm[key];
    if (!snapId) {
      errors.push({ key, error: 'Student not found in exam snapshot' });
      continue;
    }
    if (rawMarks === '' || rawMarks == null) {
      entries.push({ studentSnapshotId: snapId, originalMarks: null });
    } else {
      const num = Number(rawMarks);
      if (Number.isNaN(num)) {
        errors.push({ key, error: 'Invalid marks value' });
        continue;
      }
      entries.push({ studentSnapshotId: snapId, originalMarks: num });
    }
  }

  if (!entries.length) {
    const err = new Error('No valid rows to import');
    err.status = 400;
    throw err;
  }

  const saved = await saveMarks({
    tenantId,
    sessionId,
    examId,
    darjahId,
    subjectMappingId,
    entries,
    submit,
    userId,
  });

  return {
    imported: saved.marks.length,
    failed: errors.length,
    errors,
    reprocessed: saved.reprocessed,
  };
}

/** Assign or auto-generate roll numbers on exam snapshot roster */
export async function assignRollNumbers({
  tenantId,
  sessionId,
  examId,
  darjahId,
  sectionId,
  entries,
  autoAssign,
}) {
  const baseFilter = { tenantId, sessionId, examId, darjahId };
  if (sectionId) baseFilter.sectionId = sectionId;

  if (autoAssign) {
    const snapshots = await ExamStudentSnapshot.find(baseFilter)
      .populate('sectionId', 'name')
      .lean();

    const start = Number(autoAssign.startFrom) || 1;
    const pad = Number(autoAssign.padWidth) || 0;
    const groupBySection = autoAssign.groupBySection !== false;

    snapshots.sort((a, b) => {
      if (groupBySection) {
        const sa = locSortKey(a.sectionName);
        const sb = locSortKey(b.sectionName);
        if (sa !== sb) return sa.localeCompare(sb);
      }
      const na = locSortKey(a.studentName);
      const nb = locSortKey(b.studentName);
      if (na !== nb) return na.localeCompare(nb);
      return String(a.admissionNumber || '').localeCompare(String(b.admissionNumber || ''));
    });

    let n = start;
    const ops = snapshots.map((s) => {
      const roll = pad > 0 ? String(n++).padStart(pad, '0') : String(n++);
      return {
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { rollNumber: roll } },
        },
      };
    });
    if (ops.length) await ExamStudentSnapshot.bulkWrite(ops);
    return ExamStudentSnapshot.find(baseFilter).sort({ rollNumber: 1 });
  }

  if (!Array.isArray(entries) || !entries.length) {
    const err = new Error('entries array or autoAssign required');
    err.status = 400;
    throw err;
  }

  const rollSet = new Set();
  for (const e of entries) {
    const roll = String(e.rollNumber ?? '').trim();
    if (!roll) continue;
    if (rollSet.has(roll)) {
      const err = new Error(`Duplicate roll number: ${roll}`);
      err.status = 400;
      throw err;
    }
    rollSet.add(roll);
  }

  for (const e of entries) {
    await ExamStudentSnapshot.updateOne(
      { _id: e.studentSnapshotId, ...baseFilter },
      { $set: { rollNumber: String(e.rollNumber ?? '').trim() } }
    );
  }

  return ExamStudentSnapshot.find(baseFilter).sort({ rollNumber: 1 });
}

function locSortKey(obj) {
  if (!obj) return '';
  return String(obj.en || obj.ur || '').trim().toLowerCase();
}

/** Build result matrix payload: students × subjects grid */
export async function getResultMatrix({ tenantId, sessionId, examId, darjahId, sectionId }) {
  const filter = { tenantId, sessionId, examId, darjahId };
  if (sectionId) filter.sectionId = sectionId;

  const [results, mappings] = await Promise.all([
    ExamResult.find(filter)
      .populate({
        path: 'studentSnapshotId',
        populate: { path: 'studentId', select: 'fatherName photoUrl' },
      })
      .sort({ classRank: 1 }),
    ExamSubjectMapping.find({ tenantId, sessionId, examId, darjahId })
      .populate('subjectId', 'name')
      .populate('bookId', 'title')
      .sort({ createdAt: 1 }),
  ]);

  const rows = results.map((r) => {
    const subjectMap = Object.fromEntries(
      (r.subjectTotals || []).map((st) => [String(st.subjectMappingId), st])
    );
    const subjects = mappings.map((m) => {
      const st = subjectMap[String(m._id)];
      return {
        subjectMappingId: m._id,
        subjectName: m.subjectId?.name,
        obtained: st?.obtainedMarks ?? null,
        maxMarks: st?.maxMarks ?? m.maxMarks,
        isPassed: st?.isPassed ?? false,
      };
    });
    const rawObtained = subjects.reduce((s, x) => s + (x.obtained ?? 0), 0);
    const rawMax = subjects.reduce((s, x) => s + (x.maxMarks ?? 0), 0);
    const snap = r.studentSnapshotId;
    const fatherFromStudent = snap?.studentId?.fatherName;
    return {
      resultId: r._id,
      studentSnapshotId: snap?._id || r.studentSnapshotId,
      rollNumber: snap?.rollNumber || '',
      admissionNumber: snap?.admissionNumber || '',
      photoUrl: snap?.photoUrl || snap?.studentId?.photoUrl || '',
      studentName: snap?.studentName || {},
      fatherName: snap?.fatherName?.ur || snap?.fatherName?.en
        ? snap.fatherName
        : fatherFromStudent || {},
      darjahName: snap?.darjahName || {},
      sectionName: snap?.sectionName || {},
      aggregateTotal: rawObtained,
      maxAggregate: rawMax,
      percentage: r.percentage,
      division: r.division,
      sectionRank: r.sectionRank,
      classRank: r.classRank,
      isPassed: r.isPassed,
      isPublished: r.isPublished,
      subjects,
    };
  });

  return { columns: mappings, rows };
}

/** Export result matrix as CSV string */
export async function exportResultsCsv({ tenantId, sessionId, examId, darjahId, sectionId }) {
  const { columns, rows } = await getResultMatrix({ tenantId, sessionId, examId, darjahId, sectionId });
  const headers = [
    'rollNumber',
    'studentName',
    ...columns.map((c) => c.subjectId?.name?.en || c.subjectId?.name?.ur || 'subject'),
    'aggregate',
    'percentage',
    'division',
    'sectionRank',
    'classRank',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    const name = (r.studentName?.en || r.studentName?.ur || '').replace(/,/g, ' ');
    const cells = [
      r.rollNumber,
      `"${name}"`,
      ...r.subjects.map((s) => (s.obtained != null ? `${s.obtained}/${s.maxMarks}` : '')),
      `${r.aggregateTotal}/${r.maxAggregate}`,
      r.percentage,
      r.division,
      r.sectionRank ?? '',
      r.classRank ?? '',
    ];
    lines.push(cells.join(','));
  }
  return lines.join('\n');
}
