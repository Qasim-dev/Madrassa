import { Router } from 'express';
import { StudentIdCard } from '../models/StudentIdCard.js';
import { Student } from '../models/Student.js';
import { Tenant } from '../models/Tenant.js';
import { TenantSettings } from '../models/TenantSettings.js';

const router = Router();

router.get('/verify/:token', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token || token.length < 16) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    const card = await StudentIdCard.findOne({ qrToken: token }).lean();
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    const student = await Student.findOne({ _id: card.studentId, tenantId: card.tenantId })
      .populate('sessionId', 'title')
      .populate('darjahId', 'name code')
      .populate('subjectId', 'name')
      .populate('gradeId', 'name section')
      .populate('currentGradeId', 'name section')
      .lean();

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const tenant = await Tenant.findById(card.tenantId).select('name').lean();
    const settings = await TenantSettings.findOne({ tenantId: card.tenantId })
      .select('logoUrl address')
      .lean();

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
      address: settings?.address || null,
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        fatherName: student.fatherName,
        photoUrl: student.photoUrl,
        phone: student.phone,
        dateOfBirth: student.dateOfBirth,
        rollNumber: student.rollNumber,
        session: student.sessionId,
        darjah: student.darjahId,
        subject: student.subjectId,
        grade: student.currentGradeId || student.gradeId,
        guardianContact: guardian?.phone || student.phone || '',
        guardianName: guardian?.name || null,
        emergencyContact: guardian?.phone || student.phone || '',
        addressCurrent: student.addressCurrent,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
