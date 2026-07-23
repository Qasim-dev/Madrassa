import { Router } from 'express';
import mongoose from 'mongoose';
import { LibraryBook } from '../models/LibraryBook.js';
import { LibraryTransaction } from '../models/LibraryTransaction.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const router = Router();

async function nextSerialNumber(tenantId) {
  const last = await LibraryBook.findOne({ tenantId }).sort({ serialNumber: -1 }).select('serialNumber').lean();
  return (last?.serialNumber ?? 0) + 1;
}

function locPick(obj, lng = 'ur') {
  if (!obj) return '';
  return obj[lng] || obj.ur || obj.en || '';
}

/** ── Catalog (کتابیں) ── */

router.get('/books', async (req, res, next) => {
  try {
    const { q, sessionId, subjectCategory, language, status } = req.query;
    const filter = { tenantId: req.tenantId };
    if (sessionId && mongoose.isValidObjectId(sessionId)) filter.sessionId = sessionId;
    if (subjectCategory) filter.subjectCategory = subjectCategory;
    if (language) filter.language = language;
    if (status === 'available') filter.availableCopies = { $gt: 0 };
    if (status === 'out') filter.availableCopies = 0;

    const qTrim = q != null ? String(q).trim() : '';
    if (qTrim) {
      const rx = new RegExp(escapeRegex(qTrim), 'i');
      filter.$or = [
        { 'title.ur': rx },
        { 'title.en': rx },
        { 'author.ur': rx },
        { 'author.en': rx },
        { shelfNumber: rx },
        { notes: rx },
      ];
      const num = Number(qTrim);
      if (!Number.isNaN(num)) filter.$or.push({ serialNumber: num });
    }

    const list = await LibraryBook.find(filter).sort({ serialNumber: 1 }).lean();
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/books/stats', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenantId, isActive: { $ne: false } };
    const { sessionId } = req.query;
    if (sessionId && mongoose.isValidObjectId(sessionId)) filter.sessionId = sessionId;

    const books = await LibraryBook.find(filter).lean();
    const totalTitles = books.length;
    const totalCopies = books.reduce((s, b) => s + (Number(b.totalCopies) || 0), 0);
    const availableCopies = books.reduce((s, b) => s + (Number(b.availableCopies) || 0), 0);
    const issuedCount = await LibraryTransaction.countDocuments({ tenantId: req.tenantId, status: 'issued' });

    res.json({
      totalTitles,
      totalCopies,
      availableCopies,
      issuedCount,
      outCopies: totalCopies - availableCopies,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/books', async (req, res, next) => {
  try {
    const body = { ...req.body, tenantId: req.tenantId };
    if (!body.serialNumber) body.serialNumber = await nextSerialNumber(req.tenantId);
    const copies = Math.max(1, Number(body.totalCopies) || 1);
    body.totalCopies = copies;
    body.availableCopies = body.availableCopies != null ? Number(body.availableCopies) : copies;
    const doc = await LibraryBook.create(body);
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/books/:id', async (req, res, next) => {
  try {
    const existing = await LibraryBook.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const issued = (Number(existing.totalCopies) || 0) - (Number(existing.availableCopies) || 0);
    const nextTotal = req.body.totalCopies != null ? Math.max(1, Number(req.body.totalCopies)) : existing.totalCopies;
    const nextAvailable =
      req.body.availableCopies != null
        ? Math.max(0, Number(req.body.availableCopies))
        : Math.max(0, nextTotal - issued);

    const doc = await LibraryBook.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      {
        $set: {
          ...(req.body.sessionId !== undefined ? { sessionId: req.body.sessionId || null } : {}),
          ...(req.body.serialNumber !== undefined ? { serialNumber: Number(req.body.serialNumber) } : {}),
          ...(req.body.title !== undefined ? { title: req.body.title } : {}),
          ...(req.body.author !== undefined ? { author: req.body.author } : {}),
          ...(req.body.volumes !== undefined ? { volumes: Number(req.body.volumes) || 1 } : {}),
          ...(req.body.shelfNumber !== undefined ? { shelfNumber: String(req.body.shelfNumber || '') } : {}),
          ...(req.body.location !== undefined ? { location: String(req.body.location || '') } : {}),
          ...(req.body.language !== undefined ? { language: req.body.language } : {}),
          ...(req.body.languageCustom !== undefined ? { languageCustom: String(req.body.languageCustom || '') } : {}),
          ...(req.body.publisher !== undefined ? { publisher: req.body.publisher } : {}),
          ...(req.body.editor !== undefined ? { editor: req.body.editor } : {}),
          ...(req.body.conditionNotes !== undefined ? { conditionNotes: req.body.conditionNotes } : {}),
          ...(req.body.subjectCategory !== undefined ? { subjectCategory: req.body.subjectCategory } : {}),
          ...(req.body.subjectCategoryCustom !== undefined
            ? { subjectCategoryCustom: String(req.body.subjectCategoryCustom || '') }
            : {}),
          totalCopies: nextTotal,
          availableCopies: Math.min(nextAvailable, nextTotal),
          ...(req.body.notes !== undefined ? { notes: req.body.notes } : {}),
          ...(req.body.isActive !== undefined ? { isActive: !!req.body.isActive } : {}),
        },
      },
      { new: true, runValidators: true }
    );
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/books/:id', async (req, res, next) => {
  try {
    const open = await LibraryTransaction.countDocuments({
      tenantId: req.tenantId,
      bookId: req.params.id,
      status: 'issued',
    });
    if (open > 0) {
      return res.status(400).json({ message: 'Cannot delete — books are currently issued' });
    }
    const doc = await LibraryBook.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    await LibraryTransaction.deleteMany({ tenantId: req.tenantId, bookId: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** ── Issue / Return (اندراج / اخراج) ── */

router.get('/transactions', async (req, res, next) => {
  try {
    const { status, bookId, studentId, teacherId } = req.query;
    const filter = { tenantId: req.tenantId };
    if (status) filter.status = status;
    if (bookId) filter.bookId = bookId;
    if (studentId) filter.studentId = studentId;
    if (teacherId) filter.teacherId = teacherId;

    const list = await LibraryTransaction.find(filter)
      .populate('bookId')
      .populate('studentId', 'name studentId rollNumber')
      .populate('teacherId', 'name')
      .sort({ issueDate: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/transactions/issue', async (req, res, next) => {
  try {
    const {
      bookId,
      borrowerType = 'student',
      studentId,
      teacherId,
      borrowerName,
      issueDate,
      dueDate,
      remarks,
      copies = 1,
    } = req.body;

    const book = await LibraryBook.findOne({ _id: bookId, tenantId: req.tenantId });
    if (!book) return res.status(404).json({ message: 'Book not found' });

    const n = Math.max(1, Number(copies) || 1);
    if ((book.availableCopies ?? 0) < n) {
      return res.status(400).json({ message: 'Not enough copies available' });
    }

    book.availableCopies = (book.availableCopies ?? 0) - n;
    await book.save();

    const tx = await LibraryTransaction.create({
      tenantId: req.tenantId,
      bookId: book._id,
      transactionType: 'issue',
      borrowerType,
      studentId: studentId || null,
      teacherId: teacherId || null,
      borrowerName: borrowerName || {},
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'issued',
      remarks: remarks || '',
      copies: n,
    });

    const populated = await LibraryTransaction.findById(tx._id)
      .populate('bookId')
      .populate('studentId', 'name studentId')
      .populate('teacherId', 'name');
    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
});

router.post('/transactions/:id/return', async (req, res, next) => {
  try {
    const tx = await LibraryTransaction.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!tx) return res.status(404).json({ message: 'Not found' });
    if (tx.status === 'returned') return res.status(400).json({ message: 'Already returned' });

    const book = await LibraryBook.findOne({ _id: tx.bookId, tenantId: req.tenantId });
    if (!book) return res.status(404).json({ message: 'Book not found' });

    const n = Math.max(1, Number(tx.copies) || 1);
    book.availableCopies = Math.min((book.availableCopies ?? 0) + n, book.totalCopies ?? n);
    await book.save();

    tx.status = 'returned';
    tx.returnDate = req.body.returnDate ? new Date(req.body.returnDate) : new Date();
    tx.transactionType = 'return';
    if (req.body.remarks) tx.remarks = String(req.body.remarks);
    await tx.save();

    const populated = await LibraryTransaction.findById(tx._id)
      .populate('bookId')
      .populate('studentId', 'name studentId')
      .populate('teacherId', 'name');
    res.json(populated);
  } catch (e) {
    next(e);
  }
});

export default router;
