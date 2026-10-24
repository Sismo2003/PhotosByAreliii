import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model.js';
import { JWT_SECRET, COOKIE_NAME, NODE_ENV } from '../config/main.js';
import { toE164 } from '../utils/phone.js';
import { nowForDb } from '../utils/date.js';
import { PASSWORD_MAX, checkPassword } from '../utils/password-rules.js';
import { HttpError, sendError } from '../utils/http.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const signSession = (user) => jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });

// What the API returns for the signed-in user. Clients are named by their Client profile.
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name ?? user.client?.displayName ?? null,
  role: user.role,
  mustChangePassword: user.mustChangePassword,
  // A client's registered name, so the portal can check "no name in the password" while they type.
  firstName: user.client?.firstName ?? null,
  lastName: user.client?.lastName ?? null,
});

// `identifier` is an email or a phone number. `email` is still accepted from older callers.
async function findUserForLogin(identifier) {
  const value = identifier.trim();
  if (value.includes('@')) return UserModel.findByLoginEmail(value.toLowerCase());
  const e164 = toE164(value);
  return e164 ? UserModel.findByLoginPhone(e164) : null;
}

export const login = async (req, res) => {
  try {
    const { password } = req.body;
    const identifier = req.body.identifier ?? req.body.email;
    if (typeof identifier !== 'string' || !identifier.trim() || !password) {
      return res.status(400).json({ error_message: 'Email or phone and password are required', message: 'Bad request', error: true });
    }

    const user = await findUserForLogin(identifier);
    // A soft-deleted client is fully deactivated: same answer as an unknown account.
    if (!user || user.client?.deletedAt) {
      return res.status(401).json({ error_message: 'Invalid credentials', message: 'Unauthorized', error: true });
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return res.status(401).json({ error_message: 'Invalid credentials', message: 'Unauthorized', error: true });
    }

    res.cookie(COOKIE_NAME, signSession(user), COOKIE_OPTIONS);
    await UserModel.touchLastLogin(user.id, nowForDb());

    res.status(200).json({ message: 'Login successful', data: publicUser(user), error: false });
  } catch (error) {
    sendError(res, error, 'Internal server error');
  }
};

export const logout = async (_req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.status(200).json({ message: 'Logged out', data: null, error: false });
};

export const me = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (user?.client?.deletedAt) {
      return res.status(401).json({ error_message: 'Authentication required', message: 'Unauthorized', error: true });
    }
    if (!user) {
      return res.status(404).json({ error_message: 'User not found', message: 'Not found', error: true });
    }
    res.status(200).json({
      message: 'OK',
      data: publicUser(user),
      error: false,
    });
  } catch (error) {
    sendError(res, error, 'Internal server error');
  }
};

// POST /api/auth/change-password { currentPassword?, newPassword } — clients only.
// A client signs in with a password we generated (`mustChangePassword`) and is made to choose
// their own here. That first time `currentPassword` is not asked: they just proved it at sign-in
// (/client/welcome only shows "new" + "repeat"). Any later change requires it.
// Admins don't use this yet (they will get a modal in the admin panel).
// Wrong current password answers 400, never 401: a 401 means "session over" to the apps.
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof newPassword !== 'string' || !newPassword) throw new HttpError(400, 'The new password is required');
    if (newPassword.length > PASSWORD_MAX) throw new HttpError(400, `The new password can have at most ${PASSWORD_MAX} characters`);

    const user = await UserModel.findById(req.user.id);
    if (!user) throw new HttpError(404, 'User not found');
    if (user.role !== 'CLIENT') throw new HttpError(403, 'This is only for client accounts');

    const first = user.mustChangePassword;
    if (!first && (typeof currentPassword !== 'string' || !currentPassword)) {
      throw new HttpError(400, 'Current and new password are required');
    }

    const checks = checkPassword(newPassword, user.client ?? {});
    if (!checks.length) throw new HttpError(400, 'The password must have more than 8 characters', { code: 'PASSWORD_RULES', checks });
    if (!checks.uppercase) throw new HttpError(400, 'The password needs at least 1 uppercase letter', { code: 'PASSWORD_RULES', checks });
    if (!checks.number) throw new HttpError(400, 'The password needs at least 1 number', { code: 'PASSWORD_RULES', checks });
    if (!checks.noName) throw new HttpError(400, 'The password can’t contain your first or last name', { code: 'PASSWORD_RULES', checks });
    if (first) {
      if (await argon2.verify(user.passwordHash, newPassword)) {
        throw new HttpError(400, 'Choose a password different from the one we sent you', { code: 'SAME_AS_TEMPORARY' });
      }
    } else {
      if (newPassword === currentPassword) throw new HttpError(400, 'Choose a password different from the current one');
      // Longer than any allowed password → can't be right; skip the argon2 work.
      const valid = currentPassword.length <= PASSWORD_MAX && (await argon2.verify(user.passwordHash, currentPassword));
      if (!valid) res.locals.wrongPassword = true; // counted by the route's rate limit
      if (!valid) throw new HttpError(400, 'Your current password is not correct', { code: 'WRONG_PASSWORD' });
    }

    // Whole seconds: the new session's `iat` must not fall before this cut-off (see setPassword).
    const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    const hash = await argon2.hash(newPassword);
    if (first) {
      // Another tab/request chose it a moment ago: don't overwrite it silently.
      if (!(await UserModel.setFirstPassword(user.id, hash, changedAt))) {
        throw new HttpError(409, 'Your password was already chosen. Sign in with it.', { code: 'ALREADY_CHOSEN' });
      }
    } else {
      await UserModel.setPassword(user.id, hash, changedAt);
    }

    // Every other session (a stolen cookie, another device) dies here; this one gets a fresh token.
    res.cookie(COOKIE_NAME, signSession(user), COOKIE_OPTIONS);
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ message: 'Password updated', data: publicUser({ ...user, mustChangePassword: false }), error: false });
  } catch (error) {
    sendError(res, error, 'Could not change the password');
  }
};
