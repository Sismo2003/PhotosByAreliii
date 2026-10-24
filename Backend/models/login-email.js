import { HttpError } from '../utils/http.js';

// A client's email is also their login (User.email). Every place that changes Client.email
// calls this inside the same transaction, so the two never drift apart: the client keeps
// signing in with the email the studio sees. `user` is the client's User row, or null/undefined
// when they have no login yet (nothing to sync).
export async function syncLoginEmail(tx, user, email) {
  if (!user || user.email === email) return;
  const taken = await tx.user.findUnique({ where: { email }, select: { id: true } });
  if (taken && taken.id !== user.id) throw new HttpError(409, 'That email is already used by another login');
  await tx.user.update({ where: { id: user.id }, data: { email } });
}
