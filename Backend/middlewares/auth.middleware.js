import jwt from 'jsonwebtoken';
import { JWT_SECRET, COOKIE_NAME } from '../config/main.js';
import UserModel from '../models/user.model.js';
import { sendError } from '../utils/http.js';

// Pinned: a token that names another algorithm (or "none") is never accepted.
const VERIFY_OPTIONS = { algorithms: ['HS256'] };

export function optionalAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET, VERIFY_OPTIONS); // { id, role, iat }
  } catch {
    req.user = null;
  }
  next();
}

const unauthorized = (res) =>
  res.status(401).json({ error_message: 'Authentication required', message: 'Unauthorized', error: true });

// A valid signature is not enough: the account is re-read on every request, so a session ends
// as soon as the client is deleted or the password changes (tokens issued before
// `passwordChangedAt` are rejected) and the role is always the database's, never the token's.
export function requireAuth(req, res, next) {
  optionalAuth(req, res, async () => {
    if (!req.user) return unauthorized(res);
    try {
      const session = await UserModel.findSession(req.user.id);
      if (!session || session.client?.deletedAt) return unauthorized(res);
      if (session.passwordChangedAt && req.user.iat < Math.floor(session.passwordChangedAt.getTime() / 1000)) {
        return unauthorized(res);
      }
      req.user = { id: session.id, role: session.role, iat: req.user.iat };
      next();
    } catch (error) {
      sendError(res, error, 'Internal server error');
    }
  });
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error_message: 'Admin access required', message: 'Forbidden', error: true });
    }
    next();
  });
}
