import mongoose from 'mongoose';
import { Session } from '../models/Session.js';
import { Darjah } from '../models/Darjah.js';
import { Subject } from '../models/Subject.js';
import { SubjectBook } from '../models/SubjectBook.js';
import { Grade } from '../models/Grade.js';
import { escapeRegex } from './escapeRegex.js';
import { cell, localizedFromRowFlexible, parseFlexibleDate } from './excelImport.js';

function isOid(v) {
  return v && mongoose.isValidObjectId(String(v));
}

function exactRx(s) {
  return new RegExp(`^${escapeRegex(String(s).trim())}$`, 'i');
}

function containsRx(s) {
  return new RegExp(escapeRegex(String(s).trim()), 'i');
}

function rawText(value) {
  if (value == null) return '';
  return String(value).trim();
}

/** Resolve Session by Mongo id or title (e.g. 2026-2027). */
export async function resolveSessionId(tenantId, value) {
  const raw = rawText(value);
  if (!raw) return null;
  if (isOid(raw)) {
    const byId = await Session.findOne({ _id: raw, tenantId }).select('_id').lean();
    if (byId) return byId._id;
  }
  const byTitle = await Session.findOne({ tenantId, title: exactRx(raw) }).select('_id').lean();
  return byTitle?._id || null;
}

/** Resolve Darjah by id, code, or name (ur/en), scoped to session when known. */
export async function resolveDarjahId(tenantId, sessionId, value) {
  const raw = rawText(value);
  if (!raw) return null;
  const scope = { tenantId };
  if (sessionId) scope.sessionId = sessionId;

  if (isOid(raw)) {
    const byId = await Darjah.findOne({ ...scope, _id: raw }).select('_id').lean();
    if (byId) return byId._id;
  }

  const exact = await Darjah.findOne({
    ...scope,
    $or: [{ code: exactRx(raw) }, { 'name.ur': exactRx(raw) }, { 'name.en': exactRx(raw) }],
  })
    .select('_id')
    .lean();
  if (exact) return exact._id;

  const soft = await Darjah.findOne({
    ...scope,
    $or: [{ 'name.ur': containsRx(raw) }, { 'name.en': containsRx(raw) }, { code: containsRx(raw) }],
  })
    .select('_id')
    .lean();
  return soft?._id || null;
}

/** Resolve Subject by id or name within session. */
export async function resolveSubjectId(tenantId, sessionId, value) {
  const raw = rawText(value);
  if (!raw) return null;
  const scope = { tenantId };
  if (sessionId) scope.sessionId = sessionId;

  if (isOid(raw)) {
    const byId = await Subject.findOne({ ...scope, _id: raw }).select('_id').lean();
    if (byId) return byId._id;
  }

  const exact = await Subject.findOne({
    ...scope,
    $or: [{ 'name.ur': exactRx(raw) }, { 'name.en': exactRx(raw) }],
  })
    .select('_id')
    .lean();
  if (exact) return exact._id;

  const soft = await Subject.findOne({
    ...scope,
    $or: [{ 'name.ur': containsRx(raw) }, { 'name.en': containsRx(raw) }],
  })
    .select('_id')
    .lean();
  return soft?._id || null;
}

/** Resolve book by id or title (optionally within subject/darjah). */
export async function resolveBookId(tenantId, value, { subjectId, darjahId } = {}) {
  const raw = rawText(value);
  if (!raw) return null;
  const scope = { tenantId };
  if (subjectId) scope.subjectId = subjectId;
  if (darjahId) scope.darjahId = darjahId;

  if (isOid(raw)) {
    const byId = await SubjectBook.findOne({ ...scope, _id: raw }).select('_id').lean();
    if (byId) return byId._id;
  }

  const exact = await SubjectBook.findOne({
    ...scope,
    $or: [{ 'title.ur': exactRx(raw) }, { 'title.en': exactRx(raw) }],
  })
    .select('_id')
    .lean();
  if (exact) return exact._id;

  const soft = await SubjectBook.findOne({
    ...scope,
    $or: [{ 'title.ur': containsRx(raw) }, { 'title.en': containsRx(raw) }],
  })
    .select('_id')
    .lean();
  return soft?._id || null;
}

/** Resolve Grade by id or name/code within session. */
export async function resolveGradeId(tenantId, sessionId, value) {
  const raw = rawText(value);
  if (!raw) return null;
  const scope = { tenantId };
  if (sessionId) scope.sessionId = sessionId;

  if (isOid(raw)) {
    const byId = await Grade.findOne({ _id: raw, tenantId }).select('_id').lean();
    if (byId) return byId._id;
  }

  const exact = await Grade.findOne({
    ...scope,
    $or: [{ code: exactRx(raw) }, { 'name.ur': exactRx(raw) }, { 'name.en': exactRx(raw) }],
  })
    .select('_id')
    .lean();
  return exact?._id || null;
}

export function studentFieldsFromRow(row) {
  return {
    sessionRaw: cell(row, 'session', 'sessionTitle', 'sessionId', 'سیشن'),
    studentId: cell(row, 'studentId', 'student_id'),
    name: localizedFromRowFlexible(row, 'name', ['name.ur', 'nameUr', 'نام']),
    fatherName: localizedFromRowFlexible(row, 'fatherName', [
      'fatherName.ur',
      'father_name.ur',
      'والد',
      'والد کا نام',
    ]),
    gender: cell(row, 'gender', 'جنس'),
    idCard: cell(row, 'idCard', 'cnic', 'شناختی کارڈ'),
    phone: cell(row, 'phone', 'فون', 'فون نمبر'),
    city: cell(row, 'city', 'شہر'),
    country: localizedFromRowFlexible(row, 'country'),
    state: localizedFromRowFlexible(row, 'state'),
    cityLoc: localizedFromRowFlexible(row, 'cityLoc', ['cityLoc.ur', 'city.ur']),
    districtCurrent: localizedFromRowFlexible(row, 'districtCurrent'),
    districtPermanent: localizedFromRowFlexible(row, 'districtPermanent'),
    addressCurrent: localizedFromRowFlexible(row, 'addressCurrent'),
    addressPermanent: localizedFromRowFlexible(row, 'addressPermanent'),
    exitReason: localizedFromRowFlexible(row, 'exitReason'),
    classTypeLabel: cell(row, 'classTypeLabel'),
    photoUrl: cell(row, 'photoUrl'),
    dateOfBirth: parseFlexibleDate(cell(row, 'dateOfBirth', 'dob', 'DOB', 'تاریخ پیدائش') || row.dateOfBirth),
    enrollmentDate: parseFlexibleDate(
      cell(row, 'enrollmentDate', 'admissionDate', 'admission', 'تاریخ داخلہ') || row.enrollmentDate || row.admissionDate
    ),
    exitDate: parseFlexibleDate(cell(row, 'exitDate') || row.exitDate),
    darjahRaw: cell(row, 'darjah', 'darjahName', 'darjahCode', 'class', 'className', 'درجہ', 'darjahId'),
    subjectRaw: cell(row, 'subject', 'subjectName', 'شعبہ', 'subjectId'),
    bookRaw: cell(row, 'book', 'bookTitle', 'کتاب', 'bookId'),
    gradeRaw: cell(row, 'grade', 'gradeName', 'gradeId', 'currentGrade', 'currentGradeId'),
    previousGradeRaw: cell(row, 'previousGrade', 'previousGradeId'),
    teacherId: cell(row, 'teacherId'),
  };
}

export function teacherFieldsFromRow(row) {
  return {
    teacherKey: cell(row, 'teacherKey', 'key'),
    name: localizedFromRowFlexible(row, 'name', ['name.ur', 'نام']),
    parentage: localizedFromRowFlexible(row, 'parentage', ['parentage.ur', 'ولدیت']),
    idCard: cell(row, 'idCard', 'cnic', 'شناختی کارڈ'),
    phone: cell(row, 'phone', 'فون'),
    maritalStatus: cell(row, 'maritalStatus'),
    dateOfBirth: parseFlexibleDate(cell(row, 'dateOfBirth', 'dob') || row.dateOfBirth),
    country: localizedFromRowFlexible(row, 'country'),
    state: localizedFromRowFlexible(row, 'state'),
    cityLoc: localizedFromRowFlexible(row, 'cityLoc'),
    districtCurrent: localizedFromRowFlexible(row, 'districtCurrent'),
    districtPermanent: localizedFromRowFlexible(row, 'districtPermanent'),
    addressCurrent: localizedFromRowFlexible(row, 'addressCurrent'),
    addressPermanent: localizedFromRowFlexible(row, 'addressPermanent'),
    deeniTaleem: cell(row, 'deeniTaleem'),
    asriTaleem: cell(row, 'asriTaleem'),
    extraSkills: cell(row, 'extraSkills'),
    jobStartDate: parseFlexibleDate(cell(row, 'jobStartDate') || row.jobStartDate),
    jobEndDate: parseFlexibleDate(cell(row, 'jobEndDate') || row.jobEndDate),
    status: cell(row, 'status') || 'active',
  };
}

export function assignmentFieldsFromRow(row) {
  return {
    teacherKey: cell(row, 'teacherKey', 'key'),
    sessionRaw: cell(row, 'session', 'sessionTitle', 'sessionId', 'سیشن'),
    darjahRaw: cell(row, 'darjah', 'darjahName', 'darjahCode', 'class', 'درجہ', 'darjahId'),
    subjectRaw: cell(row, 'subject', 'subjectName', 'شعبہ', 'subjectId'),
    bookRaw: cell(row, 'book', 'bookTitle', 'کتاب', 'bookId'),
  };
}
