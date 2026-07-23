export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  // Expected client errors — avoid noisy stack dumps in the terminal
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  } else if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[api] ${status} ${req.method} ${req.originalUrl}: ${message}`);
  }
  if (err.code === 11000 && (err.keyPattern?.email || err.keyValue?.email != null)) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }
  res.status(status).json({ message });
}
