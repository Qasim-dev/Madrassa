import jwt from 'jsonwebtoken';

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
};

const accessExpires = () => process.env.JWT_ACCESS_EXPIRES || '1h';
const refreshExpires = () => process.env.JWT_REFRESH_EXPIRES || '7d';

export function signAccessToken(payload) {
  return jwt.sign({ ...payload, typ: 'access' }, secret(), { expiresIn: accessExpires() });
}

export function signRefreshToken(payload) {
  return jwt.sign({ ...payload, typ: 'refresh' }, secret(), { expiresIn: refreshExpires() });
}

/** @deprecated use signAccessToken — kept for call-site migration */
export function signToken(payload, expiresIn = accessExpires()) {
  return jwt.sign({ ...payload, typ: 'access' }, secret(), { expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, secret());
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, secret());
  if (payload.typ && payload.typ !== 'access') {
    const err = new Error('Invalid token type');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return payload;
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, secret());
  if (payload.typ !== 'refresh') {
    const err = new Error('Invalid token type');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return payload;
}
