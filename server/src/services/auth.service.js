import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { TenantSettings } from '../models/TenantSettings.js';
import { defaultGuardianRelations } from '../constants/defaultGuardianRelations.js';
import { signToken } from '../utils/jwt.js';

const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

function newInternalTenantSlug() {
  const suffix = crypto.randomBytes(8).toString('hex');
  const slug = `org-${suffix}`;
  if (!SLUG_PATTERN.test(slug)) {
    return `org-${crypto.randomBytes(8).toString('hex')}`;
  }
  return slug;
}

export function normalizeEmail(input) {
  if (input == null || String(input).trim() === '') {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }
  return String(input).trim().toLowerCase();
}

function buildAuthResult(user, tenant) {
  const tid = user.tenantId?._id ?? user.tenantId;
  const token = signToken({
    userId: user._id.toString(),
    tenantId: tid.toString(),
    username: user.username,
    role: user.role,
  });
  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      name: user.name,
      preferredLocale: user.preferredLocale,
      role: user.role,
      tenant: {
        id: tenant._id,
        slug: tenant.slug,
        name: tenant.name,
      },
    },
  };
}

export async function login(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const tenant = await Tenant.findById(user.tenantId);
  if (!tenant) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  if (!tenant.isActive) {
    const err = new Error('Organization is inactive');
    err.status = 403;
    throw err;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  return buildAuthResult(user, tenant);
}

/**
 * Register a new organization (internal tenant slug) and first admin identified by unique email.
 */
export async function register({ nameUr, nameEn, email, password }) {
  if (process.env.ALLOW_SIGNUP !== 'true') {
    const err = new Error('Registration is disabled');
    err.status = 403;
    throw err;
  }
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const err = new Error('An account with this email already exists');
    err.status = 409;
    throw err;
  }

  const nameUrTrim = (nameUr ?? '').trim();
  const nameEnTrim = (nameEn ?? '').trim();
  if (!nameUrTrim && !nameEnTrim) {
    const err = new Error('Organization name is required in at least one language');
    err.status = 400;
    throw err;
  }

  if (!password || String(password).length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const slug = newInternalTenantSlug();
  const tenant = await Tenant.create({
    slug,
    name: {
      ur: nameUrTrim || nameEnTrim,
      en: nameEnTrim || nameUrTrim,
    },
  });

  await TenantSettings.create({
    tenantId: tenant._id,
    guardianRelations: defaultGuardianRelations(),
  });

  const user = await User.create({
    tenantId: tenant._id,
    username: normalizedEmail,
    email: normalizedEmail,
    phone: '',
    name: { ur: '', en: '' },
    passwordHash,
    preferredLocale: 'ur',
    role: 'admin',
  });

  const populated = await User.findById(user._id).populate('tenantId');
  return buildAuthResult(populated, tenant);
}

export async function changePassword(userId, tenantId, currentPassword, newPassword) {
  if (!newPassword || String(newPassword).length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.status = 400;
    throw err;
  }
  const user = await User.findOne({ _id: userId, tenantId }).select('+passwordHash');
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    const err = new Error('Current password is wrong');
    err.status = 400;
    throw err;
  }
  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  await user.save();
  return { ok: true };
}
