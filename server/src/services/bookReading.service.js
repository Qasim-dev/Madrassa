import mongoose from 'mongoose';
import { BookReadingRecord } from '../models/BookReadingRecord.js';
import { SubjectBook } from '../models/SubjectBook.js';
import { UserBookProgress } from '../models/UserBookProgress.js';
import {
  READING_STATUS,
  computePagesRead,
  computeReadingPercentage,
  computeReadingStatus,
  pageRangesOverlap,
} from '../constants/readingEnums.js';
import { escapeRegex } from '../utils/escapeRegex.js';

export function parseReadingDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizePageRange(startPage, endPage) {
  const start = Number(startPage);
  const end = endPage != null && endPage !== '' ? Number(endPage) : start;

  if (!Number.isFinite(start) || start < 1) {
    const err = new Error('Start page must be greater than 0');
    err.status = 400;
    throw err;
  }
  if (!Number.isFinite(end) || end < start) {
    const err = new Error('End page must be greater than or equal to start page');
    err.status = 400;
    throw err;
  }
  return { startPage: start, endPage: end, pagesRead: computePagesRead(start, end) };
}

export async function assertBookForReading(tenantId, bookId) {
  const book = await SubjectBook.findOne({ _id: bookId, tenantId });
  if (!book) {
    const err = new Error('Book not found');
    err.status = 404;
    throw err;
  }
  if (!book.totalPages || book.totalPages < 1) {
    const err = new Error('Book must have totalPages configured before recording reading');
    err.status = 400;
    throw err;
  }
  return book;
}

export async function assertNoOverlap({ tenantId, userId, bookId, startPage, endPage, excludeId }) {
  const filter = { tenantId, userId, bookId };
  if (excludeId) filter._id = { $ne: excludeId };

  const existing = await BookReadingRecord.find(filter).select('startPage endPage');
  for (const rec of existing) {
    if (pageRangesOverlap(startPage, endPage, rec.startPage, rec.endPage)) {
      const err = new Error(
        `Reading pages ${startPage}–${endPage} overlap with an existing record (${rec.startPage}–${rec.endPage})`
      );
      err.status = 400;
      throw err;
    }
  }
}

export function validateEndPageWithinTotal(endPage, totalPages) {
  if (endPage > totalPages) {
    const err = new Error(`End page cannot exceed book total pages (${totalPages})`);
    err.status = 400;
    throw err;
  }
}

export async function recalculateUserBookProgress({ tenantId, userId, bookId }) {
  const book = await SubjectBook.findOne({ _id: bookId, tenantId }).select('totalPages');
  const totalPages = book?.totalPages || 0;

  const records = await BookReadingRecord.find({ tenantId, userId, bookId })
    .sort({ readingDate: -1, endPage: -1 })
    .select('endPage readingDate');

  if (!records.length) {
    await UserBookProgress.findOneAndUpdate(
      { tenantId, userId, bookId },
      {
        $set: {
          currentPage: 0,
          lastReadDate: null,
          readingPercentage: 0,
          status: READING_STATUS.NOT_STARTED,
        },
      },
      { upsert: true, new: true }
    );
    return {
      currentPage: 0,
      lastReadDate: null,
      readingPercentage: 0,
      status: READING_STATUS.NOT_STARTED,
    };
  }

  const currentPage = Math.max(...records.map((r) => r.endPage));
  const lastReadDate = records.reduce((latest, r) => {
    const t = new Date(r.readingDate).getTime();
    return !latest || t > new Date(latest).getTime() ? r.readingDate : latest;
  }, null);

  const readingPercentage = computeReadingPercentage(currentPage, totalPages);
  const status = computeReadingStatus(currentPage, totalPages);

  await UserBookProgress.findOneAndUpdate(
    { tenantId, userId, bookId },
    { $set: { currentPage, lastReadDate, readingPercentage, status } },
    { upsert: true, new: true }
  );

  return { currentPage, lastReadDate, readingPercentage, status };
}

export async function getUserBookWithProgress({ tenantId, userId, bookId }) {
  const book = await SubjectBook.findOne({ _id: bookId, tenantId })
    .populate({ path: 'subjectId', select: 'name sessionId' })
    .populate({ path: 'darjahId', select: 'name code sessionId' });

  if (!book) {
    const err = new Error('Book not found');
    err.status = 404;
    throw err;
  }

  let progress = await UserBookProgress.findOne({ tenantId, userId, bookId });
  if (!progress) {
    const computed = await recalculateUserBookProgress({ tenantId, userId, bookId });
    progress = { ...computed, totalPages: book.totalPages };
  }

  return {
    ...book.toObject(),
    progress: {
      currentPage: progress.currentPage ?? 0,
      lastReadDate: progress.lastReadDate ?? null,
      readingPercentage: progress.readingPercentage ?? 0,
      status: progress.status ?? READING_STATUS.NOT_STARTED,
      totalPages: book.totalPages,
    },
  };
}

export async function listReadingRecords({
  tenantId,
  userId,
  bookId,
  fromDate,
  toDate,
  search,
  sortBy = 'readingDate',
  sortOrder = 'desc',
  page = 1,
  limit = 20,
}) {
  const filter = { tenantId, userId };
  if (bookId && mongoose.isValidObjectId(bookId)) filter.bookId = bookId;

  if (fromDate || toDate) {
    filter.readingDate = {};
    const from = parseReadingDate(fromDate);
    const to = parseReadingDate(toDate);
    if (from) filter.readingDate.$gte = from;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.readingDate.$lte = end;
    }
  }

  if (search?.trim()) {
    const q = search.trim();
    const num = Number(q);
    const or = [{ notes: { $regex: escapeRegex(q), $options: 'i' } }];
    if (Number.isFinite(num)) {
      or.push({ startPage: num }, { endPage: num }, { pagesRead: num });
    }
    const parsed = parseReadingDate(q);
    if (parsed) {
      const dayStart = new Date(parsed);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(parsed);
      dayEnd.setHours(23, 59, 59, 999);
      or.push({ readingDate: { $gte: dayStart, $lte: dayEnd } });
    }
    filter.$or = or;
  }

  const allowedSort = ['readingDate', 'startPage', 'endPage', 'pagesRead', 'createdAt'];
  const sortField = allowedSort.includes(sortBy) ? sortBy : 'readingDate';
  const sortDir = sortOrder === 'asc' ? 1 : -1;
  const skip = Math.max(0, (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit)));
  const take = Math.min(100, Math.max(1, limit));

  const [items, total] = await Promise.all([
    BookReadingRecord.find(filter)
      .populate({ path: 'bookId', select: 'title totalPages subjectId darjahId' })
      .sort({ [sortField]: sortDir, createdAt: -1 })
      .skip(skip)
      .limit(take),
    BookReadingRecord.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: Math.max(1, page),
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    },
  };
}

export async function createReadingRecord({
  tenantId,
  userId,
  bookId,
  readingDate,
  startPage,
  endPage,
  durationMinutes,
  notes,
}) {
  const book = await assertBookForReading(tenantId, bookId);
  const date = parseReadingDate(readingDate);
  if (!date) {
    const err = new Error('Valid reading date is required');
    err.status = 400;
    throw err;
  }

  const pages = normalizePageRange(startPage, endPage);
  validateEndPageWithinTotal(pages.endPage, book.totalPages);
  await assertNoOverlap({ tenantId, userId, bookId, ...pages });

  if (durationMinutes != null && durationMinutes !== '') {
    const dur = Number(durationMinutes);
    if (!Number.isFinite(dur) || dur < 0) {
      const err = new Error('Duration must be a non-negative number');
      err.status = 400;
      throw err;
    }
  }

  const doc = await BookReadingRecord.create({
    tenantId,
    userId,
    bookId,
    readingDate: date,
    startPage: pages.startPage,
    endPage: pages.endPage,
    pagesRead: pages.pagesRead,
    durationMinutes: durationMinutes != null && durationMinutes !== '' ? Number(durationMinutes) : null,
    notes: notes?.trim() || '',
  });

  await recalculateUserBookProgress({ tenantId, userId, bookId });

  return BookReadingRecord.findById(doc._id).populate({
    path: 'bookId',
    select: 'title totalPages',
  });
}

export async function updateReadingRecord({
  tenantId,
  userId,
  recordId,
  readingDate,
  startPage,
  endPage,
  durationMinutes,
  notes,
}) {
  const existing = await BookReadingRecord.findOne({ _id: recordId, tenantId, userId });
  if (!existing) {
    const err = new Error('Reading record not found');
    err.status = 404;
    throw err;
  }

  const book = await assertBookForReading(tenantId, existing.bookId);
  const update = {};

  if (readingDate !== undefined) {
    const date = parseReadingDate(readingDate);
    if (!date) {
      const err = new Error('Valid reading date is required');
      err.status = 400;
      throw err;
    }
    update.readingDate = date;
  }

  const nextStart = startPage != null ? startPage : existing.startPage;
  const nextEnd = endPage != null ? endPage : existing.endPage;
  const pages = normalizePageRange(nextStart, nextEnd);
  validateEndPageWithinTotal(pages.endPage, book.totalPages);
  await assertNoOverlap({
    tenantId,
    userId,
    bookId: existing.bookId,
    ...pages,
    excludeId: existing._id,
  });

  update.startPage = pages.startPage;
  update.endPage = pages.endPage;
  update.pagesRead = pages.pagesRead;

  if (durationMinutes !== undefined) {
    if (durationMinutes === null || durationMinutes === '') {
      update.durationMinutes = null;
    } else {
      const dur = Number(durationMinutes);
      if (!Number.isFinite(dur) || dur < 0) {
        const err = new Error('Duration must be a non-negative number');
        err.status = 400;
        throw err;
      }
      update.durationMinutes = dur;
    }
  }

  if (notes !== undefined) update.notes = String(notes).trim();

  const doc = await BookReadingRecord.findOneAndUpdate(
    { _id: recordId, tenantId, userId },
    { $set: update },
    { new: true, runValidators: true }
  ).populate({ path: 'bookId', select: 'title totalPages' });

  await recalculateUserBookProgress({ tenantId, userId, bookId: existing.bookId });
  return doc;
}

export async function deleteReadingRecord({ tenantId, userId, recordId }) {
  const doc = await BookReadingRecord.findOneAndDelete({ _id: recordId, tenantId, userId });
  if (!doc) {
    const err = new Error('Reading record not found');
    err.status = 404;
    throw err;
  }
  await recalculateUserBookProgress({ tenantId, userId, bookId: doc.bookId });
  return doc;
}

export async function listMyBooksWithProgress({ tenantId, userId, sessionId }) {
  const bookFilter = { tenantId };
  if (sessionId) {
    const { Subject } = await import('../models/Subject.js');
    const { Darjah } = await import('../models/Darjah.js');
    const subIds = await Subject.find({ tenantId, sessionId }).distinct('_id');
    const djIds = await Darjah.find({ tenantId, sessionId }).distinct('_id');
    bookFilter.subjectId = { $in: subIds };
    bookFilter.darjahId = { $in: djIds };
  }

  const books = await SubjectBook.find(bookFilter)
    .populate('subjectId', 'name')
    .populate('darjahId', 'name code')
    .sort({ createdAt: -1 });

  const progressRows = await UserBookProgress.find({
    tenantId,
    userId,
    bookId: { $in: books.map((b) => b._id) },
  });

  const progressMap = Object.fromEntries(progressRows.map((p) => [String(p.bookId), p]));

  return books.map((book) => {
    const p = progressMap[String(book._id)];
    return {
      ...book.toObject(),
      progress: p
        ? {
            currentPage: p.currentPage,
            lastReadDate: p.lastReadDate,
            readingPercentage: p.readingPercentage,
            status: p.status,
          }
        : {
            currentPage: 0,
            lastReadDate: null,
            readingPercentage: 0,
            status: READING_STATUS.NOT_STARTED,
          },
    };
  });
}
