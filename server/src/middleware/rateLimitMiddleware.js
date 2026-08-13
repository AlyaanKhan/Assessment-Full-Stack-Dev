import rateLimit from 'express-rate-limit';

// Builds the reply sent when somebody makes too many requests.
// Use this so rate limit errors look like every other error in the API.
function buildTooManyRequestsResponse(request, response) {
  response.status(429).json({
    error: { message: 'Too many requests. Please wait a moment and try again.' },
  });
}

// Applies a loose limit to the whole API.
// Use this as a safety net against a runaway script hitting any endpoint.
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildTooManyRequestsResponse,
});

// Applies a strict limit to signup and login.
// Use this to slow down anyone guessing passwords.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildTooManyRequestsResponse,
});

// Applies a strict limit to sending chat messages.
// Use this because every chat message costs a paid AI call.
export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildTooManyRequestsResponse,
});
