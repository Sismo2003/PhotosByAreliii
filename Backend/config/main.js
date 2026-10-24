import 'dotenv/config';

export const PORT = process.env.PORT || 4000;
export const JWT_SECRET = process.env.JWT_SECRET;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const COOKIE_NAME = 'pba_token';
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:4321';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set — copy Backend/.env.example to Backend/.env and set it.');
}
