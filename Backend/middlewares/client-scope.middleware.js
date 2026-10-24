import prisma from '../config/db.js';
import { requireAuth } from './auth.middleware.js';
import { HttpError, sendError } from '../utils/http.js';

// The one place that decides whose data a /api/client request may see (docs/portal-cliente-plan.md §6.1).
// Controllers read `req.scope.clientId` and nothing else: a clientId, userId or galleryId sent by the
// browser is never trusted.
//   CLIENT → their own Client row. Blocked until they choose their own password (mustChangePassword).
//   ADMIN + header X-Preview-Client: <clientId> → "Preview as client", read only (GET/HEAD).
// Roles come from the database (requireAuth re-reads the account on every request).
const READ_METHODS = new Set(['GET', 'HEAD']);

export function requireClientScope(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      if (req.user.role === 'CLIENT') {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { clientId: true, mustChangePassword: true },
        });
        if (!user?.clientId) throw new HttpError(403, 'This account has no client profile');
        if (user.mustChangePassword) throw new HttpError(403, 'Choose your own password first', { code: 'MUST_CHANGE_PASSWORD' });
        req.scope = { clientId: user.clientId, preview: false };
        return next();
      }

      if (req.user.role === 'ADMIN') {
        const raw = req.get('X-Preview-Client');
        if (!raw) throw new HttpError(403, 'This is the client portal. Use Preview as client from the studio.');
        const clientId = Number(raw);
        if (!Number.isInteger(clientId) || clientId < 1) throw new HttpError(400, 'Invalid preview client');
        const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null }, select: { id: true } });
        if (!client) throw new HttpError(404, 'Client not found');
        if (!READ_METHODS.has(req.method)) throw new HttpError(403, 'Preview is read only');
        req.scope = { clientId, preview: true };
        return next();
      }

      throw new HttpError(403, 'Clients only');
    } catch (error) {
      sendError(res, error, 'Forbidden');
    }
  });
}
