import mongoose from 'mongoose';
import { assertSessionScope, loadExamContainer } from '../services/examFlows.js';

/**
 * Middleware: enforce session_id + exam_id scoping on all exam sub-routes.
 * Attaches req.examScope = { sessionId, examId, exam }
 */
export function requireExamSessionQuery(req, _res, next) {
  try {
    const sessionId = req.query.sessionId || req.body?.sessionId;
    assertSessionScope(sessionId);
    req.examScope = { sessionId };
    next();
  } catch (e) {
    next(e);
  }
}

export async function requireExamContext(req, _res, next) {
  try {
    const sessionId = req.query.sessionId || req.body?.sessionId;
    const examId = req.params.examId;
    assertSessionScope(sessionId, examId);
    const exam = await loadExamContainer(req.tenantId, examId, sessionId);
    req.examScope = { sessionId, examId, exam };
    next();
  } catch (e) {
    next(e);
  }
}

export function buildExamFilter(req, extra = {}) {
  const { sessionId, examId } = req.examScope || {};
  if (!sessionId) {
    const err = new Error('sessionId scope missing — query rejected');
    err.status = 400;
    throw err;
  }
  const filter = { tenantId: req.tenantId, sessionId, ...extra };
  if (examId) filter.examId = examId;
  return filter;
}

export function parseObjectId(id, label = 'id') {
  if (!id || !mongoose.isValidObjectId(id)) {
    const err = new Error(`Invalid ${label}`);
    err.status = 400;
    throw err;
  }
  return id;
}
