import { Router } from 'express';
import mongoose from 'mongoose';
import {
  createReadingRecord,
  deleteReadingRecord,
  getUserBookWithProgress,
  listMyBooksWithProgress,
  listReadingRecords,
  updateReadingRecord,
} from '../services/bookReading.service.js';

const router = Router();

function currentUserId(req) {
  return req.user?.userId || req.user?.id;
}

/** Books with current user's reading progress (library overview) */
router.get('/my-books', async (req, res, next) => {
  try {
    const userId = currentUserId(req);
    const { sessionId } = req.query;
    const list = await listMyBooksWithProgress({
      tenantId: req.tenantId,
      userId,
      sessionId,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

/** Single book + progress for current user */
router.get('/books/:bookId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.bookId)) {
      return res.status(400).json({ message: 'Invalid book id' });
    }
    const book = await getUserBookWithProgress({
      tenantId: req.tenantId,
      userId: currentUserId(req),
      bookId: req.params.bookId,
    });
    res.json(book);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

/** Paginated reading records for current user */
router.get('/', async (req, res, next) => {
  try {
    const {
      bookId,
      fromDate,
      toDate,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;

    const result = await listReadingRecords({
      tenantId: req.tenantId,
      userId: currentUserId(req),
      bookId,
      fromDate,
      toDate,
      search,
      sortBy,
      sortOrder,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { bookId, readingDate, startPage, endPage, durationMinutes, notes } = req.body;
    if (!bookId || !readingDate || startPage == null) {
      return res.status(400).json({
        message: 'bookId, readingDate, and startPage are required',
      });
    }
    const doc = await createReadingRecord({
      tenantId: req.tenantId,
      userId: currentUserId(req),
      bookId,
      readingDate,
      startPage,
      endPage,
      durationMinutes,
      notes,
    });
    res.status(201).json(doc);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid record id' });
    }
    const doc = await updateReadingRecord({
      tenantId: req.tenantId,
      userId: currentUserId(req),
      recordId: req.params.id,
      readingDate: req.body.readingDate,
      startPage: req.body.startPage,
      endPage: req.body.endPage,
      durationMinutes: req.body.durationMinutes,
      notes: req.body.notes,
    });
    res.json(doc);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid record id' });
    }
    await deleteReadingRecord({
      tenantId: req.tenantId,
      userId: currentUserId(req),
      recordId: req.params.id,
    });
    res.json({ ok: true });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

export default router;
