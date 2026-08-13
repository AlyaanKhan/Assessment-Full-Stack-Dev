// Sends the same "not found" reply for any URL the API does not know.
// Use this after all routes so unknown paths do not fall through silently.
export function handleUnknownRoute(request, response, next) {
  response.status(404).json({
    error: { message: `Cannot ${request.method} ${request.originalUrl}` },
  });
}

// Turns any error thrown anywhere in the API into one consistent reply.
// Use this as the last piece of middleware so nothing escapes unformatted.
export function handleErrors(error, request, response, next) {
  const statusCode = error.statusCode || 500;

  // Unexpected failures are logged in full; expected ones are not noise.
  if (statusCode >= 500) {
    console.error('Unhandled server error:', error);
  }

  const message = statusCode >= 500
    ? 'Something went wrong on our side. Please try again.'
    : error.message;

  response.status(statusCode).json({ error: { message } });
}
