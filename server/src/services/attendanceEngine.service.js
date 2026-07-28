import mongoose from 'mongoose';
import { AttendanceCategory } from '../models/AttendanceCategory.js';
import { AttendanceSlot } from '../models/AttendanceSlot.js';
import { AttendanceLog } from '../models/AttendanceLog.js';
import { StudentAttendance } from '../models/StudentAttendance.js';
import { TeacherAttendance } from '../models/TeacherAttendance.js';
import { Grade } from '../models/Grade.js';
import { Darjah } from '../models/Darjah.js';
import { Subject } from '../models/Subject.js';
import { SubjectBook } from '../models/SubjectBook.js';
import { TimetableEntry } from '../models/TimetableEntry.js';
import { TimeSlot } from '../models/TimeSlot.js';
import { Student } from '../models/Student.js';
import { Teacher } from '../models/Teacher.js';
import {
  dayBoundsFromAttendanceBody,
  dayBoundsFromDateInput,
  timetableDayFromDateInput,
} from '../utils/attendanceDate.js';
import { ensureAttendanceDefaults, getCategoryByCode } from './attendanceSeed.service.js';
import { NOT_DELETED } from '../utils/softDelete.js';

function oid(v) {
  if (!v || !mongoose.isValidObjectId(String(v))) return null;
  return new mongoose.Types.ObjectId(String(v));
}

function slotLabel(slot) {
  if (!slot?.label) return slot?.code || '';
  return slot.label.ur || slot.label.en || slot.code || '';
}

async function resolveSlot(tenantId, { categoryId, slotId, period, sessionId }) {
  const periodNorm = String(period ?? '');
  if (periodNorm === 'daily') return null;
  if (slotId) {
    const slot = await AttendanceSlot.findOne({ _id: slotId, tenantId }).lean();
    if (slot) return slot;
  }
  if (period) {
    const filter = { tenantId, categoryId };
    if (sessionId) filter.$or = [{ sessionId }, { sessionId: null }];
    const slots = await AttendanceSlot.find(filter).sort({ sortOrder: 1 }).lean();
    const byCode = slots.find((s) => s.code === String(period));
    if (byCode) return byCode;
    const idx = Number(period);
    if (!Number.isNaN(idx) && idx >= 1 && slots[idx - 1]) return slots[idx - 1];
    const byLabel = slots.find(
      (s) => s.label?.ur === period || s.label?.en === period || String(s.sortOrder) === String(period)
    );
    if (byLabel) return byLabel;
  }
  const first = await AttendanceSlot.findOne({ tenantId, categoryId }).sort({ sortOrder: 1 }).lean();
  return first;
}

function timeSlotDisplayLabel(slot, lng = 'ur') {
  if (!slot) return '';
  const lb = slot.label || '';
  const times = slot.startTime && slot.endTime ? `${slot.startTime}–${slot.endTime}` : '';
  if (lb && times) return `${lb} (${times})`;
  return lb || times || String(slot._id || '');
}

async function syncStudentLogs(sheet, category, slot, timeSlot) {
  const periodLabel = timeSlot
    ? timeSlotDisplayLabel(timeSlot)
    : slot
      ? slotLabel(slot)
      : sheet.period || '';

  const logs = (sheet.entries || []).map((e) => ({
    tenantId: sheet.tenantId,
    sessionId: sheet.sessionId || null,
    date: sheet.date,
    categoryId: category._id,
    categoryCode: category.code,
    slotId: slot?._id || null,
    slotLabel: periodLabel,
    subjectType: 'student',
    subjectId: e.studentId,
    gradeId: sheet.gradeId || null,
    darjahId: sheet.darjahId || null,
    courseSubjectId: sheet.courseSubjectId || null,
    bookId: sheet.bookId || null,
    timeSlotId: sheet.timeSlotId || null,
    status: e.status || 'present',
    remarks: e.remarks || '',
    sourceSheetId: sheet._id,
    sourceSheetType: 'student_sheet',
  }));

  await AttendanceLog.deleteMany({
    tenantId: sheet.tenantId,
    sourceSheetType: 'student_sheet',
    sourceSheetId: sheet._id,
  });

  if (logs.length) {
    await AttendanceLog.insertMany(logs, { ordered: false }).catch(() => {
      /* duplicate key on retry — ignore */
    });
  }
}

async function syncTeacherLog(mark, category, slot) {
  await AttendanceLog.deleteMany({
    tenantId: mark.tenantId,
    sourceSheetType: 'teacher_mark',
    sourceSheetId: mark._id,
  });

  await AttendanceLog.create({
    tenantId: mark.tenantId,
    sessionId: mark.sessionId || null,
    date: mark.date,
    categoryId: category._id,
    categoryCode: category.code,
    slotId: slot?._id || null,
    slotLabel: slot ? slotLabel(slot) : mark.period || 'daily',
    subjectType: 'teacher',
    subjectId: mark.teacherId,
    gradeId: mark.gradeId || null,
    status: mark.status || (mark.present ? 'present' : 'absent'),
    remarks: mark.remarks || '',
    sourceSheetId: mark._id,
    sourceSheetType: 'teacher_mark',
  });
}

function isDailySheetFields({ courseSubjectId, bookId }) {
  return !courseSubjectId && !bookId;
}

/** Students who already have a full-day (روزانہ) mark on this date. */
async function studentIdsWithDailyMark(tenantId, studentIds, bounds, sessionId) {
  const ids = (studentIds || []).map((id) => oid(id)).filter(Boolean);
  if (!ids.length) return new Set();

  const filter = {
    tenantId,
    subjectType: 'student',
    subjectId: { $in: ids },
    date: { $gte: bounds.start, $lte: bounds.end },
    $and: [
      { $or: [{ courseSubjectId: null }, { courseSubjectId: { $exists: false } }] },
      { $or: [{ bookId: null }, { bookId: { $exists: false } }] },
    ],
  };
  if (sessionId) filter.sessionId = sessionId;

  const logs = await AttendanceLog.find(filter).select('subjectId').lean();
  return new Set(logs.map((l) => String(l.subjectId)));
}

/**
 * When daily (پورا دن) is saved, remove any subject-wise marks/logs for those students
 * on the same day so only one full-day entry remains.
 */
async function clearSubjectMarksForStudents(tenantId, studentIds, bounds, sessionId) {
  const ids = (studentIds || []).map((id) => oid(id)).filter(Boolean);
  if (!ids.length) return;

  await AttendanceLog.deleteMany({
    tenantId,
    subjectType: 'student',
    subjectId: { $in: ids },
    date: { $gte: bounds.start, $lte: bounds.end },
    $or: [{ courseSubjectId: { $ne: null } }, { bookId: { $ne: null } }],
  });

  const sheetFilter = {
    tenantId,
    date: { $gte: bounds.start, $lte: bounds.end },
    $or: [{ courseSubjectId: { $ne: null } }, { bookId: { $ne: null } }],
  };
  if (sessionId) sheetFilter.sessionId = sessionId;

  const sheets = await StudentAttendance.find(sheetFilter);
  const idSet = new Set(ids.map(String));

  for (const sheet of sheets) {
    const before = sheet.entries?.length || 0;
    sheet.entries = (sheet.entries || []).filter(
      (e) => !idSet.has(String(e.studentId?._id || e.studentId))
    );
    if (sheet.entries.length === 0) {
      await AttendanceLog.deleteMany({
        tenantId,
        sourceSheetType: 'student_sheet',
        sourceSheetId: sheet._id,
      });
      await sheet.deleteOne();
    } else if (sheet.entries.length !== before) {
      await sheet.save();
      const category = await AttendanceCategory.findById(sheet.categoryId).lean();
      if (category) {
        const slot = sheet.slotId
          ? await AttendanceSlot.findById(sheet.slotId).lean()
          : null;
        const timeSlot = sheet.timeSlotId
          ? await TimeSlot.findById(sheet.timeSlotId).lean()
          : null;
        await syncStudentLogs(sheet, category, slot, timeSlot);
      }
    }
  }
}

export async function listCategories(tenantId) {
  return ensureAttendanceDefaults(tenantId);
}

export async function listTimetableSlotsForAttendance(
  tenantId,
  { sessionId, darjahId, courseSubjectId, bookId, date } = {}
) {
  if (!sessionId || !darjahId) return { day: null, slots: [] };

  const day = timetableDayFromDateInput(date);
  const filter = {
    tenantId,
    sessionId: oid(sessionId),
    darjahId: oid(darjahId),
  };
  if (day) filter.day = day;
  if (bookId) filter.bookId = oid(bookId);
  else if (courseSubjectId) filter.subjectId = oid(courseSubjectId);

  const entries = await TimetableEntry.find(filter)
    .populate('slotId')
    .populate('teacherId', 'name')
    .populate('subjectId', 'name')
    .populate('bookId', 'title')
    .lean();

  const bySlot = new Map();
  for (const e of entries) {
    const ts = e.slotId;
    if (!ts || ts.isBreak) continue;
    const sid = String(ts._id);
    if (bySlot.has(sid)) continue;
    bySlot.set(sid, {
      _id: ts._id,
      timeSlotId: ts._id,
      timetableEntryId: e._id,
      label: { ur: ts.label || '', en: ts.label || '' },
      startTime: ts.startTime,
      endTime: ts.endTime,
      sortOrder: ts.sortOrder ?? 0,
      day: e.day,
      teacherName: e.teacherId?.name || null,
      subjectId: e.subjectId?._id || e.subjectId || null,
      bookId: e.bookId?._id || e.bookId || null,
      isTimetable: true,
    });
  }

  const slots = [...bySlot.values()].sort((a, b) => {
    const o = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (o !== 0) return o;
    return String(a.startTime || '').localeCompare(String(b.startTime || ''));
  });

  return { day, slots };
}

export async function listSlots(tenantId, { categoryId, categoryCode, sessionId } = {}) {
  await ensureAttendanceDefaults(tenantId);
  const filter = { tenantId, isActive: true };
  if (categoryId) filter.categoryId = categoryId;
  if (categoryCode) {
    const cat = await getCategoryByCode(tenantId, categoryCode);
    if (!cat) return [];
    filter.categoryId = cat._id;
  }
  if (sessionId) {
    filter.$or = [{ sessionId: oid(sessionId) }, { sessionId: null }];
  }
  return AttendanceSlot.find(filter).sort({ sortOrder: 1 }).populate('categoryId').lean();
}

export async function listStudentSheets(
  tenantId,
  {
    date,
    gradeId,
    darjahId,
    courseSubjectId,
    bookId,
    categoryId,
    categoryCode,
    sessionId,
    slotId,
    timeSlotId,
    period,
  } = {}
) {
  const filter = { tenantId };
  if (date) {
    const bounds = dayBoundsFromDateInput(String(date));
    if (bounds) filter.date = { $gte: bounds.start, $lte: bounds.end };
  }
  if (gradeId) filter.gradeId = gradeId;
  if (darjahId) filter.darjahId = oid(darjahId);
  if (courseSubjectId === '' || courseSubjectId === 'null') {
    filter.$or = [{ courseSubjectId: null }, { courseSubjectId: { $exists: false } }];
  } else if (courseSubjectId) filter.courseSubjectId = oid(courseSubjectId);
  if (bookId === '' || bookId === 'null') {
    filter.$and = [...(filter.$and || []), { $or: [{ bookId: null }, { bookId: { $exists: false } }] }];
  } else if (bookId) filter.bookId = oid(bookId);
  if (sessionId) filter.sessionId = oid(sessionId);
  if (timeSlotId) filter.timeSlotId = oid(timeSlotId);
  else if (slotId) filter.slotId = oid(slotId);
  if (categoryId) filter.categoryId = categoryId;
  if (categoryCode) {
    const cat = await getCategoryByCode(tenantId, categoryCode);
    if (cat) filter.categoryId = cat._id;
  }
  if (period === 'daily') {
    filter.period = 'daily';
    filter.slotId = null;
    filter.timeSlotId = null;
  } else if (period !== undefined && period !== '' && !slotId) {
    filter.period = String(period);
  }

  return StudentAttendance.find(filter)
    .populate('gradeId')
    .populate('darjahId')
    .populate('courseSubjectId')
    .populate('bookId')
    .populate('timeSlotId')
    .populate('categoryId')
    .populate('slotId')
    .populate('entries.studentId')
    .sort({ date: -1 });
}

export async function saveStudentSheet(tenantId, body, markedBy = null) {
  const {
    date,
    gradeId,
    darjahId,
    courseSubjectId,
    bookId,
    period,
    entries,
    categoryCode = 'academic',
    categoryId: rawCategoryId,
    sessionId,
    slotId: rawSlotId,
    timeSlotId: rawTimeSlotId,
    source = 'manual',
  } = body;

  const category = rawCategoryId
    ? await AttendanceCategory.findOne({ _id: rawCategoryId, tenantId }).lean()
    : await getCategoryByCode(tenantId, categoryCode);
  if (!category) throw Object.assign(new Error('Attendance category not found'), { status: 400 });

  const classScoped = ['academic', 'hifz'].includes(category.code);
  if (classScoped && !gradeId && !darjahId) {
    throw Object.assign(new Error('Select darjah (درجہ) or class (کلاس)'), { status: 400 });
  }
  if (category.requiresGrade && !classScoped && !gradeId && !darjahId) {
    throw Object.assign(new Error('Class/grade is required for this category'), { status: 400 });
  }

  const bounds = dayBoundsFromAttendanceBody(date);
  const periodNorm = String(period ?? '');
  const resolvedTimeSlotId = oid(rawTimeSlotId);
  let timeSlot = null;
  if (resolvedTimeSlotId) {
    timeSlot = await TimeSlot.findOne({ _id: resolvedTimeSlotId, tenantId }).lean();
    if (!timeSlot) throw Object.assign(new Error('Timetable period not found'), { status: 400 });
  }

  const slot = resolvedTimeSlotId
    ? null
    : await resolveSlot(tenantId, {
        categoryId: category._id,
        slotId: rawSlotId,
        period: periodNorm,
        sessionId,
      });

  let resolvedSessionId = oid(sessionId);
  if (!resolvedSessionId && darjahId) {
    const darjah = await Darjah.findOne({ _id: darjahId, tenantId }).lean();
    resolvedSessionId = darjah?.sessionId || null;
  }
  if (!resolvedSessionId && gradeId) {
    const grade = await Grade.findOne({ _id: gradeId, tenantId }).lean();
    resolvedSessionId = grade?.sessionId || null;
  }

  const resolvedDarjahId = oid(darjahId);
  const resolvedCourseSubjectId = oid(courseSubjectId);
  const resolvedBookId = oid(bookId);

  const periodStored = timeSlot
    ? timeSlot.label || `${timeSlot.startTime}–${timeSlot.endTime}`
    : slot
      ? slot.code
      : periodNorm;

  const sameDay = {
    tenantId,
    date: { $gte: bounds.start, $lte: bounds.end },
    categoryId: category._id,
    gradeId: gradeId || null,
    darjahId: resolvedDarjahId,
    courseSubjectId: resolvedCourseSubjectId,
    bookId: resolvedBookId,
    ...(resolvedTimeSlotId
      ? { timeSlotId: resolvedTimeSlotId, slotId: null }
      : slot?._id
        ? { slotId: slot._id, timeSlotId: null }
        : { period: periodNorm, slotId: null, timeSlotId: null }),
  };

  const isDaily = isDailySheetFields({
    courseSubjectId: resolvedCourseSubjectId,
    bookId: resolvedBookId,
  });

  let normalizedEntries = (entries || []).map((e) => ({
    studentId: e.studentId,
    status: category.statusOptions?.includes(e.status) ? e.status : e.status || 'present',
    remarks: e.remarks || '',
    markedAt: new Date(),
  }));

  // Subject-wise: skip students who already have full-day (روزانہ) attendance
  if (!isDaily && normalizedEntries.length) {
    const dailySet = await studentIdsWithDailyMark(
      tenantId,
      normalizedEntries.map((e) => e.studentId),
      bounds,
      resolvedSessionId
    );
    if (dailySet.size) {
      normalizedEntries = normalizedEntries.filter((e) => !dailySet.has(String(e.studentId)));
    }
  }

  const matches = await StudentAttendance.find(sameDay).sort({ updatedAt: -1 });
  let sheet;
  if (matches.length > 0) {
    sheet = matches[0];
    if (matches.length > 1) {
      await StudentAttendance.deleteMany({ _id: { $in: matches.slice(1).map((m) => m._id) } });
    }
    sheet.date = bounds.start;
    sheet.sessionId = resolvedSessionId;
    sheet.categoryId = category._id;
    sheet.slotId = resolvedTimeSlotId ? null : slot?._id || null;
    sheet.timeSlotId = resolvedTimeSlotId;
    sheet.period = periodStored;
    sheet.darjahId = resolvedDarjahId;
    sheet.courseSubjectId = resolvedCourseSubjectId;
    sheet.bookId = resolvedBookId;
    sheet.entries = normalizedEntries;
    sheet.markedBy = markedBy;
    sheet.source = source;
    await sheet.save();
  } else {
    sheet = await StudentAttendance.create({
      tenantId,
      sessionId: resolvedSessionId,
      categoryId: category._id,
      date: bounds.start,
      gradeId: gradeId || null,
      darjahId: resolvedDarjahId,
      courseSubjectId: resolvedCourseSubjectId,
      bookId: resolvedBookId,
      slotId: resolvedTimeSlotId ? null : slot?._id || null,
      timeSlotId: resolvedTimeSlotId,
      period: periodStored,
      entries: normalizedEntries,
      markedBy,
      source,
    });
  }

  await syncStudentLogs(sheet, category, slot, timeSlot);

  // Daily (پورا دن): remove any subject-wise entries for these students on this day
  if (isDaily && normalizedEntries.length) {
    await clearSubjectMarksForStudents(
      tenantId,
      normalizedEntries.map((e) => e.studentId),
      bounds,
      resolvedSessionId
    );
  }

  return sheet.populate([
    'gradeId',
    'darjahId',
    'courseSubjectId',
    'bookId',
    'timeSlotId',
    'categoryId',
    'slotId',
    'entries.studentId',
  ]);
}

export async function listTeacherMarks(tenantId, { date, teacherId, gradeId, categoryId, categoryCode, sessionId, slotId, period } = {}) {
  const filter = { tenantId };
  if (date) {
    const bounds = dayBoundsFromDateInput(String(date));
    if (bounds) filter.date = { $gte: bounds.start, $lte: bounds.end };
  }
  if (teacherId) filter.teacherId = teacherId;
  if (gradeId) filter.gradeId = gradeId;
  if (sessionId) filter.sessionId = oid(sessionId);
  if (slotId) filter.slotId = oid(slotId);
  if (categoryId) filter.categoryId = categoryId;
  if (categoryCode) {
    const cat = await getCategoryByCode(tenantId, categoryCode);
    if (cat) filter.categoryId = cat._id;
  }
  if (period === 'daily') {
    filter.period = 'daily';
    filter.slotId = null;
  } else if (period !== undefined && period !== '' && !slotId) {
    filter.period = String(period);
  }

  return TeacherAttendance.find(filter)
    .populate('teacherId')
    .populate('gradeId')
    .populate('categoryId')
    .populate('slotId')
    .sort({ date: -1 });
}

export async function saveTeacherMark(tenantId, body, markedBy = null) {
  const {
    date,
    teacherId,
    gradeId,
    period,
    present,
    status: rawStatus,
    categoryCode = 'staff',
    categoryId: rawCategoryId,
    sessionId,
    slotId: rawSlotId,
    dutyType,
    remarks,
    source = 'manual',
  } = body;

  const category = rawCategoryId
    ? await AttendanceCategory.findOne({ _id: rawCategoryId, tenantId }).lean()
    : await getCategoryByCode(tenantId, categoryCode);
  if (!category) throw Object.assign(new Error('Attendance category not found'), { status: 400 });

  const bounds = dayBoundsFromAttendanceBody(date);
  const periodNorm = String(period ?? '');
  const slot = await resolveSlot(tenantId, {
    categoryId: category._id,
    slotId: rawSlotId,
    period: periodNorm,
    sessionId,
  });

  let status = rawStatus;
  if (!status) {
    const isPresent = present !== false && present !== 'false';
    status = isPresent ? 'present' : 'absent';
  }
  if (!category.statusOptions?.includes(status)) status = 'present';

  const sameDay = {
    tenantId,
    date: { $gte: bounds.start, $lte: bounds.end },
    categoryId: category._id,
    teacherId,
    gradeId: gradeId || null,
    ...(slot?._id ? { slotId: slot._id } : { period: periodNorm, slotId: null }),
  };

  const matches = await TeacherAttendance.find(sameDay).sort({ updatedAt: -1 });
  let mark;
  if (matches.length > 0) {
    mark = matches[0];
    if (matches.length > 1) {
      await TeacherAttendance.deleteMany({ _id: { $in: matches.slice(1).map((m) => m._id) } });
    }
    mark.date = bounds.start;
    mark.sessionId = oid(sessionId);
    mark.categoryId = category._id;
    mark.slotId = slot?._id || null;
    mark.period = slot ? slot.code : periodNorm;
    mark.status = status;
    mark.present = status === 'present' || status === 'late';
    mark.dutyType = dutyType || '';
    mark.remarks = remarks || '';
    mark.markedBy = markedBy;
    mark.source = source;
    await mark.save();
  } else {
    mark = await TeacherAttendance.create({
      tenantId,
      sessionId: oid(sessionId),
      categoryId: category._id,
      date: bounds.start,
      teacherId,
      gradeId: gradeId || null,
      slotId: slot?._id || null,
      period: slot ? slot.code : periodNorm,
      status,
      present: status === 'present' || status === 'late',
      dutyType: dutyType || '',
      remarks: remarks || '',
      markedBy,
      source,
    });
  }

  await syncTeacherLog(mark, category, slot);
  return mark.populate(['teacherId', 'gradeId', 'categoryId', 'slotId']);
}

/** Roster + dropdown context: شعبہ → درجات → کتب */
export async function getAttendanceContext(tenantId, { sessionId, darjahId, courseSubjectId } = {}) {
  const subFilter = { tenantId, isActive: { $ne: false } };
  if (sessionId) subFilter.sessionId = oid(sessionId);
  const subjects = await Subject.find(subFilter).sort({ 'name.ur': 1, createdAt: 1 }).lean();

  const darajatFilter = { tenantId, isActive: { $ne: false } };
  if (sessionId) darajatFilter.sessionId = oid(sessionId);

  let darajat = await Darjah.find(darajatFilter)
    .populate('subjectIds', 'name systemType sessionId')
    .sort({ code: 1, createdAt: 1 })
    .lean();

  if (courseSubjectId) {
    const sid = String(courseSubjectId);
    darajat = darajat.filter((d) =>
      (d.subjectIds || []).some((s) => String(s._id || s) === sid)
    );
  }

  let books = [];
  let selectedDarjah = null;

  if (darjahId && courseSubjectId) {
    selectedDarjah =
      darajat.find((d) => String(d._id) === String(darjahId)) ||
      (await Darjah.findOne({ _id: darjahId, tenantId }).populate('subjectIds', 'name systemType').lean());
    if (selectedDarjah) {
      books = await SubjectBook.find({
        tenantId,
        darjahId: selectedDarjah._id,
        subjectId: oid(courseSubjectId),
        isActive: { $ne: false },
      })
        .populate('subjectId', 'name')
        .sort({ 'title.ur': 1 })
        .lean();
    }
  }

  return { subjects, darajat, books, selectedDarjah };
}

/** Students for attendance — filter by darjah, subject, book assignment, or legacy grade. */
export async function getStudentRoster(
  tenantId,
  { gradeId, darjahId, courseSubjectId, bookId, sessionId, categoryCode } = {}
) {
  const category = await getCategoryByCode(tenantId, categoryCode || 'academic');
  const filter = { tenantId, ...NOT_DELETED };

  if (sessionId) filter.sessionId = oid(sessionId);

  if (darjahId) {
    filter.darjahId = oid(darjahId);
  } else if (gradeId) {
    filter.gradeId = gradeId;
  } else if (category?.requiresGrade && !['salah', 'hostel'].includes(category.code)) {
    return [];
  }

  if (bookId) {
    const bid = oid(bookId);
    filter.$or = [{ bookId: bid }, { bookIds: bid }];
  } else if (courseSubjectId) {
    filter.subjectId = oid(courseSubjectId);
  }

  return Student.find(filter)
    .populate('darjahId', 'name code')
    .populate('subjectId', 'name')
    .populate('bookId', 'title')
    .populate('bookIds', 'title subjectId')
    .populate('gradeId', 'name code')
    .sort({ rollNumber: 1, studentId: 1 })
    .lean();
}

/** All teachers for staff category roster. */
export async function getTeacherRoster(tenantId) {
  return Teacher.find({ tenantId }).sort({ createdAt: 1 }).lean();
}

export async function aggregateStudentReport(tenantId, studentId, { from, to, sessionId, categories } = {}) {
  const filter = {
    tenantId,
    subjectType: 'student',
    subjectId: oid(studentId),
  };
  if (sessionId) filter.sessionId = oid(sessionId);
  if (from || to) {
    filter.date = {};
    if (from) {
      const b = dayBoundsFromDateInput(String(from));
      if (b) filter.date.$gte = b.start;
    }
    if (to) {
      const b = dayBoundsFromDateInput(String(to));
      if (b) filter.date.$lte = b.end;
    }
  }
  if (categories?.length) filter.categoryCode = { $in: categories };

  const rows = await AttendanceLog.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$categoryCode',
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        sick: { $sum: { $cond: [{ $eq: ['$status', 'sick'] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        other: {
          $sum: {
            $cond: [
              { $in: ['$status', ['present', 'absent', 'sick', 'late']] },
              0,
              1,
            ],
          },
        },
        total: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((r) => ({
    categoryCode: r._id,
    present: r.present,
    absent: r.absent,
    sick: r.sick,
    late: r.late,
    other: r.other,
    total: r.total,
    presentRate: r.total ? Math.round((r.present / r.total) * 1000) / 10 : 0,
  }));
}

export async function aggregateTeacherForSalary(tenantId, teacherId, { from, to, sessionId } = {}) {
  const staffCat = await getCategoryByCode(tenantId, 'staff');
  const filter = {
    tenantId,
    subjectType: 'teacher',
    subjectId: oid(teacherId),
    categoryCode: 'staff',
  };
  if (sessionId) filter.sessionId = oid(sessionId);
  if (from || to) {
    filter.date = {};
    if (from) {
      const b = dayBoundsFromDateInput(String(from));
      if (b) filter.date.$gte = b.start;
    }
    if (to) {
      const b = dayBoundsFromDateInput(String(to));
      if (b) filter.date.$lte = b.end;
    }
  }

  const rows = await AttendanceLog.find(filter).sort({ date: 1 }).lean();
  const summary = {
    categoryCode: 'staff',
    categoryId: staffCat?._id,
    totalSlots: rows.length,
    present: rows.filter((r) => r.status === 'present').length,
    absent: rows.filter((r) => r.status === 'absent').length,
    late: rows.filter((r) => r.status === 'late').length,
    halfDay: rows.filter((r) => r.status === 'half_day').length,
    leave: rows.filter((r) => r.status === 'leave').length,
    excused: rows.filter((r) => r.status === 'excused').length,
    breakdown: rows.map((r) => ({
      date: r.date,
      slotId: r.slotId,
      slotLabel: r.slotLabel,
      status: r.status,
      gradeId: r.gradeId,
    })),
  };
  return summary;
}

/** Row-level attendance for one student (daily + per-subject) in a date range. */
export async function listStudentMonthlyRecords(tenantId, studentId, { from, to, sessionId } = {}) {
  const sid = oid(studentId);
  if (!sid) return { rows: [], summary: { present: 0, absent: 0, sick: 0, late: 0, total: 0 } };

  const filter = {
    tenantId,
    subjectType: 'student',
    subjectId: sid,
  };
  if (sessionId) filter.sessionId = oid(sessionId);
  if (from || to) {
    filter.date = {};
    if (from) {
      const b = dayBoundsFromDateInput(String(from));
      if (b) filter.date.$gte = b.start;
    }
    if (to) {
      const b = dayBoundsFromDateInput(String(to));
      if (b) filter.date.$lte = b.end;
    }
  }

  const logs = await AttendanceLog.find(filter)
    .populate('courseSubjectId', 'name')
    .populate('bookId', 'title')
    .sort({ date: -1 })
    .lean();

  const rows = logs.map((r) => ({
    _id: r._id,
    date: r.date,
    status: r.status,
    courseSubjectId: r.courseSubjectId?._id || null,
    subjectName: r.courseSubjectId?.name || null,
    bookId: r.bookId?._id || null,
    bookName: r.bookId?.title || null,
    isDaily: !r.courseSubjectId && !r.bookId,
    remarks: r.remarks || '',
  }));

  // Prefer full-day row when both daily and subject exist on the same calendar day
  const dailyDays = new Set(
    rows
      .filter((r) => r.isDaily && r.date)
      .map((r) => new Date(r.date).toISOString().slice(0, 10))
  );
  const filteredRows = rows.filter((r) => {
    if (r.isDaily) return true;
    if (!r.date) return true;
    const day = new Date(r.date).toISOString().slice(0, 10);
    return !dailyDays.has(day);
  });

  const summary = {
    present: filteredRows.filter((r) => r.status === 'present').length,
    absent: filteredRows.filter((r) => r.status === 'absent').length,
    sick: filteredRows.filter((r) => r.status === 'sick').length,
    late: filteredRows.filter((r) => r.status === 'late').length,
    total: filteredRows.length,
  };

  return { rows: filteredRows, summary };
}

/** All student marks for a darjah on one day (daily + subject-wise). */
export async function getDarjahDaySummary(tenantId, { darjahId, date, sessionId } = {}) {
  const dj = oid(darjahId);
  if (!dj) return [];

  const bounds = dayBoundsFromDateInput(String(date || ''));
  if (!bounds) return [];

  const filter = {
    tenantId,
    darjahId: dj,
    subjectType: 'student',
    date: { $gte: bounds.start, $lte: bounds.end },
  };
  if (sessionId) filter.sessionId = oid(sessionId);

  const logs = await AttendanceLog.find(filter)
    .populate('courseSubjectId', 'name')
    .populate('bookId', 'title')
    .sort({ date: -1 })
    .lean();

  const studentIds = [...new Set(logs.map((l) => String(l.subjectId)).filter(Boolean))];
  const studentRows = studentIds.length
    ? await Student.find({ tenantId, _id: { $in: studentIds } })
        .select('name rollNumber')
        .lean()
    : [];
  const studentById = Object.fromEntries(studentRows.map((s) => [String(s._id), s]));

  const rows = logs.map((r) => {
    const stu = studentById[String(r.subjectId)];
    return {
      _id: r._id,
      studentId: r.subjectId,
      studentName: stu?.name || null,
      rollNumber: stu?.rollNumber || '',
      courseSubjectId: r.courseSubjectId?._id || null,
      subjectName: r.courseSubjectId?.name || null,
      bookId: r.bookId?._id || null,
      bookName: r.bookId?.title || null,
      isDaily: !r.courseSubjectId && !r.bookId,
      status: r.status,
      date: r.date,
    };
  });

  // Full-day mark wins: hide subject rows for students who have روزانہ (پورا دن)
  const dailyStudents = new Set(rows.filter((r) => r.isDaily).map((r) => String(r.studentId)));
  return rows.filter((r) => r.isDaily || !dailyStudents.has(String(r.studentId)));
}

/** Teacher audit rows for one day (same pattern as student day summary). */
export async function getTeacherDaySummary(tenantId, { date, sessionId } = {}) {
  const bounds = dayBoundsFromDateInput(String(date || ''));
  if (!bounds) return [];

  const filter = {
    tenantId,
    subjectType: 'teacher',
    date: { $gte: bounds.start, $lte: bounds.end },
  };
  if (sessionId) filter.sessionId = oid(sessionId);

  const logs = await AttendanceLog.find(filter).sort({ date: -1, createdAt: -1 }).lean();

  const teacherIds = [...new Set(logs.map((l) => String(l.subjectId)).filter(Boolean))];
  const teacherRows = teacherIds.length
    ? await Teacher.find({ tenantId, _id: { $in: teacherIds } })
        .select('name')
        .lean()
    : [];
  const teacherById = Object.fromEntries(teacherRows.map((t) => [String(t._id), t]));

  return logs.map((r) => {
    const te = teacherById[String(r.subjectId)];
    return {
      _id: r._id,
      teacherId: r.subjectId,
      teacherName: te?.name || null,
      status: r.status,
      date: r.date,
      isDaily: true,
      remarks: r.remarks || '',
    };
  });
}

/** Row-level attendance for one teacher (audit trail, same as student monthly). */
export async function listTeacherMonthlyRecords(tenantId, teacherId, { from, to, sessionId } = {}) {
  const tid = oid(teacherId);
  if (!tid) return { rows: [], summary: { present: 0, absent: 0, sick: 0, late: 0, total: 0 } };

  const filter = {
    tenantId,
    subjectType: 'teacher',
    subjectId: tid,
  };
  if (sessionId) filter.sessionId = oid(sessionId);
  if (from || to) {
    filter.date = {};
    if (from) {
      const b = dayBoundsFromDateInput(String(from));
      if (b) filter.date.$gte = b.start;
    }
    if (to) {
      const b = dayBoundsFromDateInput(String(to));
      if (b) filter.date.$lte = b.end;
    }
  }

  const logs = await AttendanceLog.find(filter).sort({ date: -1 }).lean();

  const rows = logs.map((r) => ({
    _id: r._id,
    date: r.date,
    status: r.status,
    isDaily: true,
    remarks: r.remarks || '',
  }));

  const summary = {
    present: rows.filter((r) => r.status === 'present').length,
    absent: rows.filter((r) => r.status === 'absent').length,
    sick: rows.filter((r) => r.status === 'sick').length,
    late: rows.filter((r) => r.status === 'late').length,
    total: rows.length,
  };

  return { rows, summary };
}
