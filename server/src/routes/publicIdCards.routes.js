import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { StudentIdCard } from '../models/StudentIdCard.js';
import { Student } from '../models/Student.js';
import { Tenant } from '../models/Tenant.js';
import { TenantSettings } from '../models/TenantSettings.js';
import { uploadsDir } from '../config/upload.js';

const router = Router();

async function loadCardContext(token) {
  const card = await StudentIdCard.findOne({ qrToken: token }).lean();
  if (!card) return null;
  const student = await Student.findOne({ _id: card.studentId, tenantId: card.tenantId })
    .populate('sessionId', 'title')
    .populate('darjahId', 'name code')
    .populate('subjectId', 'name')
    .populate('gradeId', 'name section')
    .populate('currentGradeId', 'name section')
    .lean();
  if (!student) return null;
  const tenant = await Tenant.findById(card.tenantId).select('name').lean();
  const settings = await TenantSettings.findOne({ tenantId: card.tenantId })
    .select('logoUrl address')
    .lean();
  return { card, student, tenant, settings };
}

/** Public verify — minimal PII only (no phone, DOB, address, guardian contact). */
router.get('/verify/:token', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token || token.length < 16) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    const ctx = await loadCardContext(token);
    if (!ctx) {
      return res.status(404).json({ message: 'Card not found' });
    }
    const { card, student, tenant, settings } = ctx;

    const guardian =
      Array.isArray(student.guardians) && student.guardians.length > 0
        ? student.guardians[0]
        : student.guardian || null;

    res.json({
      status: card.status,
      cardNumber: card.cardNumber,
      bloodGroup: card.bloodGroup || '',
      issueDate: card.issueDate,
      expiryDate: card.expiryDate,
      institution: tenant?.name || null,
      logoUrl: settings?.logoUrl || '',
      student: {
        studentId: student.studentId,
        name: student.name,
        fatherName: student.fatherName,
        photoUrl: `/api/public/id-cards/verify/${encodeURIComponent(token)}/photo`,
        rollNumber: student.rollNumber,
        session: student.sessionId,
        darjah: student.darjahId,
        subject: student.subjectId,
        grade: student.currentGradeId || student.gradeId,
        guardianName: guardian?.name || null,
      },
    });
  } catch (e) {
    next(e);
  }
});

/** Serve student photo only when QR token is valid (no auth, no open /uploads). */
router.get('/verify/:token/photo', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token || token.length < 16) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }
    const ctx = await loadCardContext(token);
    if (!ctx?.student?.photoUrl) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    const raw = String(ctx.student.photoUrl).trim();
    const rel = raw.startsWith('/uploads/')
      ? raw.slice('/uploads/'.length)
      : raw.startsWith('uploads/')
        ? raw.slice('uploads/'.length)
        : null;
    if (!rel || rel.includes('..')) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    const abs = path.join(uploadsDir, rel);
    if (!abs.startsWith(uploadsDir) || !fs.existsSync(abs)) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    res.sendFile(abs);
  } catch (e) {
    next(e);
  }
});

export default router;
