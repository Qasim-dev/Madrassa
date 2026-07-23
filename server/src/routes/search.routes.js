import { Router } from 'express';
import mongoose from 'mongoose';
import { escapeRegex } from '../utils/escapeRegex.js';
import { Student } from '../models/Student.js';
import { Teacher } from '../models/Teacher.js';
import { Darjah } from '../models/Darjah.js';
import { Subject } from '../models/Subject.js';
import { SubjectBook } from '../models/SubjectBook.js';

const router = Router();

function pickLocalized(obj) {
  if (!obj || typeof obj !== 'object') return { ur: '', en: '' };
  return { ur: obj.ur || '', en: obj.en || '' };
}

function normalizeQuery(q) {
  const s = q != null ? String(q).trim() : '';
  return s.length > 80 ? s.slice(0, 80) : s;
}

router.get('/suggest', async (req, res, next) => {
  try {
    const q = normalizeQuery(req.query.q);
    const limit = Math.max(1, Math.min(12, Number(req.query.limit) || 8));
    if (!q) return res.json({ q: '', items: [] });

    const safe = escapeRegex(q);
    const rx = new RegExp(safe, 'i');
    const tenantId = req.tenantId;

    const [students, teachers, darajat, subjects, books] = await Promise.all([
      Student.find({
        tenantId,
        $or: [{ studentId: rx }, { 'name.ur': rx }, { 'name.en': rx }, { 'fatherName.ur': rx }, { 'fatherName.en': rx }],
      })
        .select({ _id: 1, studentId: 1, name: 1, fatherName: 1 })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Teacher.find({
        tenantId,
        $or: [{ 'name.ur': rx }, { 'name.en': rx }, { idCard: rx }, { phone: rx }],
      })
        .select({ _id: 1, name: 1, idCard: 1, phone: 1 })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Darjah.find({
        tenantId,
        $or: [{ 'name.ur': rx }, { 'name.en': rx }, { code: rx }],
      })
        .select({ _id: 1, name: 1, code: 1, sessionId: 1 })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Subject.find({
        tenantId,
        $or: [{ 'name.ur': rx }, { 'name.en': rx }],
      })
        .select({ _id: 1, name: 1, sessionId: 1 })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      SubjectBook.find({
        tenantId,
        $or: [{ 'title.ur': rx }, { 'title.en': rx }],
      })
        .select({ _id: 1, title: 1, subjectId: 1, darjahId: 1 })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    const items = [];

    for (const s of students) {
      items.push({
        type: 'student',
        id: String(s._id),
        primary: pickLocalized(s.name),
        secondary: pickLocalized(s.fatherName),
        meta: { studentId: s.studentId || '' },
        to: `/students/${s._id}/edit`,
      });
    }

    for (const t of teachers) {
      items.push({
        type: 'teacher',
        id: String(t._id),
        primary: pickLocalized(t.name),
        secondary: { ur: '', en: '' },
        meta: { phone: t.phone || '', idCard: t.idCard || '' },
        to: `/teachers/${t._id}/edit`,
      });
    }

    for (const d of darajat) {
      items.push({
        type: 'darjah',
        id: String(d._id),
        primary: pickLocalized(d.name),
        secondary: { ur: '', en: '' },
        meta: { code: d.code || '', sessionId: d.sessionId ? String(d.sessionId) : '' },
        to: `/tartibat/darajat`,
      });
    }

    for (const s of subjects) {
      items.push({
        type: 'subject',
        id: String(s._id),
        primary: pickLocalized(s.name),
        secondary: { ur: '', en: '' },
        meta: { sessionId: s.sessionId ? String(s.sessionId) : '' },
        to: `/tartibat/subjects`,
      });
    }

    for (const b of books) {
      items.push({
        type: 'book',
        id: String(b._id),
        primary: pickLocalized(b.title),
        secondary: { ur: '', en: '' },
        meta: {
          subjectId: b.subjectId && mongoose.isValidObjectId(b.subjectId) ? String(b.subjectId) : '',
          darjahId: b.darjahId && mongoose.isValidObjectId(b.darjahId) ? String(b.darjahId) : '',
        },
        to: `/tartibat/books`,
      });
    }

    // Stable ordering: students & teachers first, then tartibat entities.
    const rank = { student: 0, teacher: 1, darjah: 2, subject: 3, book: 4 };
    items.sort((a, b) => (rank[a.type] ?? 9) - (rank[b.type] ?? 9));

    res.json({ q, items: items.slice(0, limit * 2) });
  } catch (e) {
    next(e);
  }
});

export default router;

