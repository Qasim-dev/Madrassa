import { Router } from 'express';
import mongoose from 'mongoose';
import { Student } from '../models/Student.js';
import { Teacher } from '../models/Teacher.js';
import { Grade } from '../models/Grade.js';
import { Darjah } from '../models/Darjah.js';
import { Session } from '../models/Session.js';
import { Subject } from '../models/Subject.js';
import { SubjectBook } from '../models/SubjectBook.js';
import { ExamContainer } from '../models/ExamContainer.js';
import { TimetableEntry } from '../models/TimetableEntry.js';
import { BookReadingRecord } from '../models/BookReadingRecord.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { LibraryBook } from '../models/LibraryBook.js';
import { FeeItem } from '../models/FeeItem.js';
import { StudentAttendance } from '../models/StudentAttendance.js';
import { TeacherAttendance } from '../models/TeacherAttendance.js';
import { Transaction } from '../models/Transaction.js';
import { todayLocalBounds } from '../utils/attendanceDate.js';

const router = Router();

function toObjectId(tenantId) {
  if (tenantId instanceof mongoose.Types.ObjectId) return tenantId;
  return new mongoose.Types.ObjectId(String(tenantId));
}

function parseSessionOid(raw) {
  if (!raw || !mongoose.isValidObjectId(String(raw))) return null;
  return new mongoose.Types.ObjectId(String(raw));
}

/** Match attendance rows for "today" — honours session via sessionId, darjah, or grade. */
async function buildAttendanceDayMatch(tenantId, start, end, sessionOid) {
  const tid = toObjectId(tenantId);
  const base = { tenantId: tid, date: { $gte: start, $lte: end } };
  if (!sessionOid) return base;

  const [darjahIds, gradeIds] = await Promise.all([
    Darjah.find({ tenantId: tid, sessionId: sessionOid }).distinct('_id'),
    Grade.find({ tenantId: tid, sessionId: sessionOid }).distinct('_id'),
  ]);

  const or = [{ sessionId: sessionOid }];
  if (darjahIds.length) or.push({ darjahId: { $in: darjahIds } });
  if (gradeIds.length) or.push({ gradeId: { $in: gradeIds } });
  return { ...base, $or: or };
}

const CLASS_ID_EXPR = { $ifNull: ['$darjahId', '$gradeId'] };

/** Per–class snapshot for the date range (darjah + grade units, optional session filter). */
async function attendanceSnapshotByGrade(tenantId, start, end, sessionOid) {
  const tid = toObjectId(tenantId);

  let units = [];
  if (sessionOid) {
    const [darjahs, grades] = await Promise.all([
      Darjah.find({ tenantId: tid, sessionId: sessionOid }).sort({ code: 1 }).lean(),
      Grade.find({ tenantId: tid, sessionId: sessionOid }).sort({ code: 1 }).lean(),
    ]);
    units = [
      ...darjahs.map((d) => ({
        unitId: d._id,
        code: d.code || '—',
        name: d.name,
        section: '',
        year: null,
      })),
      ...grades.map((g) => ({
        unitId: g._id,
        code: g.code,
        name: g.name,
        section: g.section,
        year: g.year,
      })),
    ];
  } else {
    const [darjahs, grades] = await Promise.all([
      Darjah.find({ tenantId: tid }).sort({ code: 1 }).lean(),
      Grade.find({ tenantId: tid }).sort({ code: 1 }).lean(),
    ]);
    units = [
      ...darjahs.map((d) => ({
        unitId: d._id,
        code: d.code || '—',
        name: d.name,
        section: '',
        year: null,
      })),
      ...grades.map((g) => ({
        unitId: g._id,
        code: g.code,
        name: g.name,
        section: g.section,
        year: g.year,
      })),
    ];
  }

  if (!units.length) return [];

  const matchBase = await buildAttendanceDayMatch(tenantId, start, end, sessionOid);

  const [saRows, saSessions, taRows] = await Promise.all([
    StudentAttendance.aggregate([
      { $match: matchBase },
      { $unwind: '$entries' },
      {
        $group: {
          _id: CLASS_ID_EXPR,
          present: { $sum: { $cond: [{ $eq: ['$entries.status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$entries.status', 'absent'] }, 1, 0] } },
          sick: { $sum: { $cond: [{ $eq: ['$entries.status', 'sick'] }, 1, 0] } },
        },
      },
    ]),
    StudentAttendance.aggregate([
      { $match: matchBase },
      { $group: { _id: CLASS_ID_EXPR, sheets: { $sum: 1 } } },
    ]),
    TeacherAttendance.aggregate([
      { $match: matchBase },
      {
        $group: {
          _id: CLASS_ID_EXPR,
          records: { $sum: 1 },
          present: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', 'present'] },
                    { $eq: ['$status', 'late'] },
                    { $and: [{ $eq: [{ $ifNull: ['$status', ''] }, ''] }, '$present'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          absent: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', 'absent'] },
                    { $and: [{ $eq: [{ $ifNull: ['$status', ''] }, ''] }, { $not: '$present' }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const bySa = Object.fromEntries(saRows.map((x) => [String(x._id), x]));
  const bySheets = Object.fromEntries(saSessions.map((x) => [String(x._id), x.sheets]));
  const byTa = Object.fromEntries(taRows.map((x) => [String(x._id), x]));

  return units.map((u) => {
    const id = String(u.unitId);
    const st = bySa[id] || { present: 0, absent: 0, sick: 0 };
    const ta = byTa[id] || { records: 0, present: 0, absent: 0 };
    return {
      gradeId: u.unitId,
      code: u.code,
      name: u.name,
      year: u.year,
      section: u.section,
      student: {
        sheets: bySheets[id] || 0,
        present: st.present,
        absent: st.absent,
        sick: st.sick,
      },
      teacher: {
        records: ta.records,
        present: ta.present,
        absent: ta.absent,
      },
    };
  });
}

/** Aggregated counts for the main madrassa dashboard (students, teachers, attendance, finance). */
router.get('/stats', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const sessionOid = parseSessionOid(req.query.sessionId);
    const { start, end } = todayLocalBounds();

    const studentFilter = sessionOid ? { tenantId, sessionId: sessionOid } : { tenantId };
    const teacherFilter = sessionOid
      ? { tenantId, assignments: { $elemMatch: { sessionId: sessionOid } } }
      : { tenantId };
    const gradeFilter = sessionOid ? { tenantId, sessionId: sessionOid } : { tenantId };
    const txFilter = sessionOid ? { tenantId, sessionId: sessionOid } : { tenantId };
    const sessionScoped = sessionOid ? { tenantId, sessionId: sessionOid } : { tenantId };

    const attendanceDocMatch = await buildAttendanceDayMatch(tenantId, start, end, sessionOid);

    const darjahIdsForSession = sessionOid
      ? await Darjah.find({ tenantId, sessionId: sessionOid }).distinct('_id')
      : null;
    const subjectBookFilter =
      darjahIdsForSession && darjahIdsForSession.length
        ? { tenantId, darjahId: { $in: darjahIdsForSession } }
        : sessionOid
          ? { tenantId, darjahId: { $in: [] } }
          : { tenantId };

    const [
      totalStudents,
      totalTeachers,
      totalGrades,
      totalDarjahs,
      totalSessions,
      totalSubjects,
      totalSubjectBooks,
      totalExams,
      totalTimetableEntries,
      bookReadingToday,
      totalInventory,
      totalLibraryBooks,
      totalFeeItems,
      studentAttendanceSessionsToday,
      teacherAttendanceRecordsToday,
      txs,
      attendanceByGrade,
    ] = await Promise.all([
      Student.countDocuments(studentFilter),
      Teacher.countDocuments(teacherFilter),
      Grade.countDocuments(gradeFilter),
      Darjah.countDocuments(sessionScoped),
      Session.countDocuments({ tenantId }),
      Subject.countDocuments(sessionScoped),
      SubjectBook.countDocuments(subjectBookFilter),
      ExamContainer.countDocuments(sessionScoped),
      TimetableEntry.countDocuments(sessionScoped),
      BookReadingRecord.countDocuments({ tenantId, readingDate: { $gte: start, $lte: end } }),
      InventoryItem.countDocuments({ tenantId }),
      LibraryBook.countDocuments({ tenantId }),
      FeeItem.countDocuments(sessionOid ? { tenantId, sessionId: sessionOid } : { tenantId }),
      StudentAttendance.countDocuments(attendanceDocMatch),
      TeacherAttendance.countDocuments(attendanceDocMatch),
      Transaction.find(txFilter).lean(),
      attendanceSnapshotByGrade(tenantId, start, end, sessionOid),
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;
    txs.forEach((t) => {
      if (t.type === 'income') totalIncome += t.amount || 0;
      else totalExpenses += t.amount || 0;
    });
    res.json({
      totalStudents,
      totalTeachers,
      totalGrades,
      totalDarjahs,
      totalSessions,
      totalSubjects,
      totalSubjectBooks,
      totalExams,
      totalTimetableEntries,
      bookReadingToday,
      totalInventory,
      totalLibraryBooks,
      totalFeeItems,
      studentAttendanceSessionsToday,
      teacherAttendanceRecordsToday,
      attendanceByGrade,
      finance: {
        totalIncome,
        totalExpenses,
        net: totalIncome - totalExpenses,
        transactionCount: txs.length,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
