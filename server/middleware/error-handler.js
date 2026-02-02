/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Log the error
  console.error('Global error handler:', err.stack || err.message);

  // Set default error status
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
  } else if (err.code === 'ENOENT') {
    status = 404;
    message = 'Resource not found';
  } else if (err.code === 'TIMEOUT') {
    status = 408;
    message = 'Request timeout';
  }

  // Send error response
  const errorResponse = {
    error: {
      message: message,
      status: status
    }
  };

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.stack = err.stack;
  }

  res.status(status).json(errorResponse);
}

/**
 * Async wrapper to catch promise rejections in route handlers
 */
function asyncWrapper(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  asyncWrapper
};