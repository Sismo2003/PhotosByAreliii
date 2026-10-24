// An Error that carries the HTTP status the controller should answer with.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details; // optional machine-readable extras (e.g. who owns a taken phone)
  }
}

/** Failure envelope (backend skill): `error_message` is the human-readable reason. */
export function sendError(res, error, message) {
  const status = error instanceof HttpError ? error.status : 500;
  if (status === 500) console.error(error);
  return res.status(status).json({
    error_message: status === 500 ? 'Something went wrong' : error.message,
    message,
    error: true,
    ...(status !== 500 && error.details ? { details: error.details } : {}),
  });
}

/** Positive integer from a route param or query string, or an HttpError(400). */
export function parseId(value, name = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, `Invalid ${name}`);
  return id;
}
