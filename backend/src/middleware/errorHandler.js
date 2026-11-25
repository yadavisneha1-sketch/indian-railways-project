export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'An unexpected server error occurred.',
  });
}
