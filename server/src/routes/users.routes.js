import { Router } from 'express';
import { body } from 'express-validator';
import { User } from '../models/User.js';
import * as authService from '../services/auth.service.js';
import { requirePermission } from '../middleware/rbac.js';
import { rejectIfInvalid } from '../utils/apiValidation.js';

const router = Router();

router.use(requirePermission('users:manage'));

router.get('/', async (req, res, next) => {
  try {
    const list = await User.find({ tenantId: req.tenantId })
      .select('email phone name role preferredLocale createdAt')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/',
  body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must contain at least 8 characters.'),
  body('role').optional().isIn(['admin', 'staff']).withMessage('Please select a valid role.'),
  async (req, res, next) => {
    try {
      if (rejectIfInvalid(req, res, 'Please fix the highlighted fields.')) return;
      const created = await authService.createTenantUser({
        tenantId: req.tenantId,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role || 'staff',
        name: req.body.name,
        phone: req.body.phone,
      });
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  '/:id',
  body('role').optional().isIn(['admin', 'staff']).withMessage('Please select a valid role.'),
  body('phone').optional().isString(),
  async (req, res, next) => {
    try {
      if (rejectIfInvalid(req, res, 'Please fix the highlighted fields.')) return;
      if (String(req.params.id) === String(req.user.userId) && req.body.role && req.body.role !== 'admin') {
        return res.status(400).json({ message: 'You cannot demote your own account.' });
      }
      const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
      if (!user) return res.status(404).json({ message: 'Not found' });
      if (req.body.role !== undefined) user.role = req.body.role;
      if (req.body.phone !== undefined) user.phone = req.body.phone;
      if (req.body.name !== undefined) {
        user.name = { ...user.name?.toObject?.() ?? user.name, ...req.body.name };
      }
      await user.save();
      res.json({
        id: user._id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        preferredLocale: user.preferredLocale,
      });
    } catch (e) {
      next(e);
    }
  }
);

router.delete('/:id', async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.userId)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }
    const doc = await User.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
