import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import * as authService from '../services/auth.service.js';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }
      const result = await authService.login(req.body.email, req.body.password);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('nameUr').optional().isString(),
  body('nameEn').optional().isString(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }
      const result = await authService.register({
        nameUr: req.body.nameUr,
        nameEn: req.body.nameEn,
        email: req.body.email,
        password: req.body.password,
      });
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).populate('tenantId');
    if (!user) return res.status(404).json({ message: 'Not found' });
    const tenant = user.tenantId;
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      name: user.name,
      preferredLocale: user.preferredLocale,
      role: user.role,
      tenant: tenant
        ? { id: tenant._id, slug: tenant.slug, name: tenant.name }
        : null,
    });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/me',
  requireAuth,
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isString(),
  body('name').optional().isObject(),
  body('preferredLocale').optional().isIn(['ur', 'en']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }
      const user = await User.findOne({ _id: req.user.userId, tenantId: req.tenantId });
      if (!user) return res.status(404).json({ message: 'Not found' });
      const { email, phone, name, preferredLocale } = req.body;
      if (email !== undefined) {
        const norm = String(email).trim().toLowerCase();
        const taken = await User.findOne({ email: norm, _id: { $ne: user._id } });
        if (taken) {
          return res.status(409).json({ message: 'Email already in use' });
        }
        user.email = norm;
        user.username = norm;
      }
      if (phone !== undefined) user.phone = phone;
      if (name !== undefined) user.name = { ...user.name?.toObject?.() ?? user.name, ...name };
      if (preferredLocale !== undefined) user.preferredLocale = preferredLocale;
      await user.save();
      const tenant = await Tenant.findById(user.tenantId);
      res.json({
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        name: user.name,
        preferredLocale: user.preferredLocale,
        tenant: tenant
          ? { id: tenant._id, slug: tenant.slug, name: tenant.name }
          : null,
      });
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  '/tenant',
  requireAuth,
  body('name').isObject(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }
      const tenant = await Tenant.findOne({ _id: req.tenantId });
      if (!tenant) return res.status(404).json({ message: 'Organization not found' });
      const { name } = req.body;
      if (name?.ur !== undefined) tenant.name.ur = String(name.ur).trim();
      if (name?.en !== undefined) tenant.name.en = String(name.en).trim();
      if (!tenant.name.ur && !tenant.name.en) {
        return res.status(400).json({ message: 'Institution name is required in at least one language' });
      }
      if (!tenant.name.ur) tenant.name.ur = tenant.name.en;
      if (!tenant.name.en) tenant.name.en = tenant.name.ur;
      await tenant.save();
      res.json({
        tenant: { id: tenant._id, slug: tenant.slug, name: tenant.name },
      });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/change-password',
  requireAuth,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }
      await authService.changePassword(
        req.user.userId,
        req.tenantId,
        req.body.currentPassword,
        req.body.newPassword
      );
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
