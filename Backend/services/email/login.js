// The client's sign-in inside "Your photos are ready" (docs/portal-cliente-plan.md §7): a client who
// has never signed in gets a NEW temporary password in that email; one who has, gets none.
// It is issued when the email is actually sent (not when Areli presses Deliver), so pausing emails
// never leaves a client with a password nobody told them.
import crypto from 'node:crypto';
import argon2 from 'argon2';
import EmailModel from '../../models/email.model.js';

// "Pba-" + 12 random characters + a digit: passes the password rules (Backend/utils/password-rules.js)
// the same way scripts/dev-client-login.js does.
const temporaryPassword = () => `Pba-${crypto.randomBytes(9).toString('base64url')}${crypto.randomInt(10)}`;

/** { email, tempPassword } for a client who never signed in, else null. */
export async function issueTemporaryLogin(clientId) {
  const client = await EmailModel.clientForEmail(clientId);
  if (!client || client.deletedAt || client.user?.lastLoginAt) return null;
  const tempPassword = temporaryPassword();
  const user = await EmailModel.setTemporaryLogin(client, await argon2.hash(tempPassword));
  return { email: user.email, tempPassword };
}
