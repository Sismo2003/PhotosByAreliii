// Validates req.body or req.query with a yup schema and puts the clean value on req.valid.
// (Express 5's req.query is a getter, so the parsed value can't be written back onto it.)
import { ValidationError } from 'yup';

export function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const value = await schema.validate(req[source] ?? {}, { abortEarly: true, stripUnknown: false });
      req.valid = { ...(req.valid ?? {}), [source]: value };
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error_message: error.errors[0], message: 'Bad request', error: true });
      }
      next(error);
    }
  };
}
