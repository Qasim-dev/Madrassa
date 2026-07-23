import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import mongoose from 'mongoose';
import { SpeechSummary } from '../models/SpeechSummary.js';
import { uploadsDir, uploadSpeechMedia } from '../config/upload.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const router = Router();

const speechUpload = uploadSpeechMedia.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]);

function parseSpeechBody(body, files = {}) {
  const title = {
    ur: String(body.titleUr || body.title?.ur || '').trim(),
    en: String(body.titleEn || body.title?.en || '').trim(),
  };
  const speaker = {
    ur: String(body.speakerUr || body.speaker?.ur || '').trim(),
    en: String(body.speakerEn || body.speaker?.en || '').trim(),
  };
  const summary = {
    ur: String(body.summaryUr || body.summary?.ur || '').trim(),
    en: String(body.summaryEn || body.summary?.en || '').trim(),
  };

  const speechDateRaw = body.speechDate;
  const speechDate =
    speechDateRaw && String(speechDateRaw).trim()
      ? new Date(speechDateRaw)
      : null;

  const sessionId =
    body.sessionId && mongoose.isValidObjectId(String(body.sessionId))
      ? String(body.sessionId)
      : null;
  const teacherId =
    body.teacherId && mongoose.isValidObjectId(String(body.teacherId))
      ? String(body.teacherId)
      : null;

  const pdfFile = files.pdf?.[0];
  const audioFile = files.audio?.[0];

  return {
    title,
    speaker,
    summary,
    speechDate: speechDate && !Number.isNaN(speechDate.getTime()) ? speechDate : null,
    sessionId,
    teacherId,
    notes: String(body.notes || '').trim(),
    isActive: body.isActive !== false && body.isActive !== 'false',
    pdfUrl: pdfFile ? `/uploads/${pdfFile.filename}` : body.pdfUrl != null ? String(body.pdfUrl) : undefined,
    audioUrl: audioFile ? `/uploads/${audioFile.filename}` : body.audioUrl != null ? String(body.audioUrl) : undefined,
  };
}

function unlinkUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const filePath = path.join(uploadsDir, path.basename(url));
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { q, sessionId } = req.query;
    const filter = { tenantId: req.tenantId };
    if (sessionId && mongoose.isValidObjectId(sessionId)) filter.sessionId = sessionId;

    const qTrim = q != null ? String(q).trim() : '';
    if (qTrim) {
      const rx = new RegExp(escapeRegex(qTrim), 'i');
      filter.$or = [
        { 'title.ur': rx },
        { 'title.en': rx },
        { 'speaker.ur': rx },
        { 'speaker.en': rx },
        { 'summary.ur': rx },
        { 'summary.en': rx },
        { notes: rx },
      ];
    }

    const list = await SpeechSummary.find(filter)
      .populate('sessionId', 'name')
      .populate('teacherId', 'name')
      .sort({ speechDate: -1, createdAt: -1 })
      .lean();
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await SpeechSummary.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('sessionId', 'name')
      .populate('teacherId', 'name');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.post('/', (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return speechUpload(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  }
  next();
}, async (req, res, next) => {
  try {
    const parsed = parseSpeechBody(req.body, req.files);
    if (!parsed.title.ur && !parsed.title.en) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const doc = await SpeechSummary.create({
      tenantId: req.tenantId,
      title: parsed.title,
      speaker: parsed.speaker,
      summary: parsed.summary,
      speechDate: parsed.speechDate,
      sessionId: parsed.sessionId,
      teacherId: parsed.teacherId,
      notes: parsed.notes,
      isActive: parsed.isActive,
      pdfUrl: parsed.pdfUrl || '',
      audioUrl: parsed.audioUrl || '',
    });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return speechUpload(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  }
  next();
}, async (req, res, next) => {
  try {
    const existing = await SpeechSummary.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const parsed = parseSpeechBody(req.body, req.files);
    if (parsed.title.ur || parsed.title.en) existing.title = parsed.title;
    if (req.body.speakerUr !== undefined || req.body.speakerEn !== undefined || req.body.speaker) {
      existing.speaker = parsed.speaker;
    }
    if (req.body.summaryUr !== undefined || req.body.summaryEn !== undefined || req.body.summary) {
      existing.summary = parsed.summary;
    }
    if (req.body.speechDate !== undefined) existing.speechDate = parsed.speechDate;
    if (req.body.sessionId !== undefined) existing.sessionId = parsed.sessionId;
    if (req.body.teacherId !== undefined) existing.teacherId = parsed.teacherId;
    if (req.body.notes !== undefined) existing.notes = parsed.notes;
    if (req.body.isActive !== undefined) existing.isActive = parsed.isActive;

    if (req.files?.pdf?.[0]) {
      unlinkUpload(existing.pdfUrl);
      existing.pdfUrl = `/uploads/${req.files.pdf[0].filename}`;
    } else if (req.body.removePdf === 'true' || req.body.removePdf === true) {
      unlinkUpload(existing.pdfUrl);
      existing.pdfUrl = '';
    }

    if (req.files?.audio?.[0]) {
      unlinkUpload(existing.audioUrl);
      existing.audioUrl = `/uploads/${req.files.audio[0].filename}`;
    } else if (req.body.removeAudio === 'true' || req.body.removeAudio === true) {
      unlinkUpload(existing.audioUrl);
      existing.audioUrl = '';
    }

    await existing.save();
    res.json(existing);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await SpeechSummary.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    unlinkUpload(doc.pdfUrl);
    unlinkUpload(doc.audioUrl);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
