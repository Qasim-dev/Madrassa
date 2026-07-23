import mongoose from 'mongoose';
import { Sequence } from '../models/Sequence.js';
import { Session } from '../models/Session.js';

function pad(num, width) {
  const s = String(num);
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

function sessionKeyFromTitle(title) {
  const t = String(title || '').trim();
  if (!t) return 'SES';
  // pick first 4-digit year; fallback to digits; else SES
  const y = t.match(/\b(19|20)\d{2}\b/);
  if (y) return y[0];
  const d = t.replace(/[^\d]/g, '');
  if (d.length >= 4) return d.slice(0, 4);
  return 'SES';
}

export async function previewNextStudentId({ tenantId, sessionId }) {
  if (!sessionId || !mongoose.isValidObjectId(sessionId)) return '';
  const ses = await Session.findOne({ _id: sessionId, tenantId }).select('title').lean();
  if (!ses) return '';
  const key = sessionKeyFromTitle(ses.title);
  const seq = await Sequence.findOne({ tenantId, name: 'studentId', scopeId: sessionId }).lean();
  const n = seq?.next || 1;
  return `S-${key}-${pad(n, 5)}`;
}

export async function allocateNextStudentId({ tenantId, sessionId }) {
  if (!sessionId || !mongoose.isValidObjectId(sessionId)) return '';
  const ses = await Session.findOne({ _id: sessionId, tenantId }).select('title').lean();
  if (!ses) return '';
  const key = sessionKeyFromTitle(ses.title);

  const seq = await Sequence.findOneAndUpdate(
    { tenantId, name: 'studentId', scopeId: sessionId },
    { $inc: { next: 1 } },
    { new: true, upsert: true }
  ).lean();

  const n = Math.max(1, Number(seq?.next || 1) - 1);
  return `S-${key}-${pad(n, 5)}`;
}

