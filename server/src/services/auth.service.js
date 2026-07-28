import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { TenantSettings } from '../models/TenantSettings.js';
import { defaultGuardianRelations } from '../constants/defaultGuardianRelations.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { permissionsForRole } from '../constants/permissions.js';

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

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

async function issueTokenPair(user, tenant) {
  const tid = user.tenantId?._id ?? user.tenantId;
  const base = {
    userId: user._id.toString(),
    tenantId: tid.toString(),
    username: user.username,
    role: user.role,
  };
  const accessToken = signAccessToken(base);
  const refreshToken = signRefreshToken(base);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      name: user.name,
      preferredLocale: user.preferredLocale,
      role: user.role,
      permissions: permissionsForRole(user.role),
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
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash +refreshTokenHash');
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
  return issueTokenPair(user, tenant);
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

  const withSecrets = await User.findById(user._id).select('+refreshTokenHash');
  return issueTokenPair(withSecrets, tenant);
}

export async function refreshSession(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    throw err;
  }
  const user = await User.findOne({ _id: payload.userId, tenantId: payload.tenantId }).select(
    '+refreshTokenHash'
  );
  if (!user || !user.refreshTokenHash) {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    throw err;
  }
  if (user.refreshTokenHash !== hashToken(refreshToken)) {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    throw err;
  }
  const tenant = await Tenant.findById(user.tenantId);
  if (!tenant?.isActive) {
    const err = new Error('Organization is inactive');
    err.status = 403;
    throw err;
  }
  return issueTokenPair(user, tenant);
}

export async function logout(userId, tenantId) {
  await User.updateOne(
    { _id: userId, tenantId },
    { $set: { refreshTokenHash: '' } }
  );
  return { ok: true };
}

export async function changePassword(userId, tenantId, currentPassword, newPassword) {
  if (!newPassword || String(newPassword).length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.status = 400;
    throw err;
  }
  const user = await User.findOne({ _id: userId, tenantId }).select('+passwordHash +refreshTokenHash');
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
  user.refreshTokenHash = '';
  await user.save();
  return { ok: true };
}

/**
 * Always returns a generic ok payload (no email enumeration).
 * In non-production (or PASSWORD_RESET_RETURN_TOKEN=true), includes resetToken for testing.
 */
export async function requestPasswordReset(email) {
  const generic = { ok: true, message: 'If that email exists, a reset token was issued.' };
  let normalized;
  try {
    normalized = normalizeEmail(email);
  } catch {
    return generic;
  }
  const user = await User.findOne({ email: normalized }).select(
    '+passwordResetTokenHash +passwordResetExpires'
  );
  if (!user) return generic;

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const returnToken =
    process.env.PASSWORD_RESET_RETURN_TOKEN === 'true' || process.env.NODE_ENV !== 'production';
  if (returnToken) {
    return { ...generic, resetToken: rawToken };
  }
  // Production: integrate email here; token is stored hashed until then.
  if (process.env.NODE_ENV === 'production') {
    console.warn('[auth] Password reset requested; configure email delivery for reset links.');
  }
  return generic;
}

export async function resetPasswordWithToken(rawToken, newPassword) {
  if (!rawToken || String(rawToken).length < 16) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }
  if (!newPassword || String(newPassword).length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.status = 400;
    throw err;
  }
  const tokenHash = hashToken(rawToken);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordHash +passwordResetTokenHash +passwordResetExpires +refreshTokenHash');

  if (!user) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }
  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  user.passwordResetTokenHash = '';
  user.passwordResetExpires = null;
  user.refreshTokenHash = '';
  await user.save();
  return { ok: true };
}

/** Admin creates a staff (or admin) user in the same tenant */
export async function createTenantUser({
  tenantId,
  email,
  password,
  role = 'staff',
  name,
  phone,
}) {
  const normalizedEmail = normalizeEmail(email);
  if (!['admin', 'staff'].includes(role)) {
    const err = new Error('Invalid role');
    err.status = 400;
    throw err;
  }
  if (!password || String(password).length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.status = 400;
    throw err;
  }
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const err = new Error('An account with this email already exists');
    err.status = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await User.create({
    tenantId,
    username: normalizedEmail,
    email: normalizedEmail,
    phone: phone || '',
    name: name || { ur: '', en: '' },
    passwordHash,
    preferredLocale: 'ur',
    role,
  });
  return {
    id: user._id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
    preferredLocale: user.preferredLocale,
  };
}
