# API reference

Base URL when running locally: `http://localhost:4000`

## Shape of every reply

Success:

```json
{ "data": { } }
```

Failure:

```json
{ "error": { "message": "Something a person can read" } }
```

## Status codes

| Code | Meaning |
| --- | --- |
| 200 | Fine |
| 201 | Something was created |
| 400 | The request body was wrong |
| 401 | Not logged in, or the token has expired |
| 404 | Not found, or not yours |
| 429 | Too many requests |
| 500 | Our mistake |

## Logging in

Every protected endpoint needs this header:

```
Authorization: Bearer <token>
```

## Auth

### POST /api/auth/signup

Body: `name` (2 or more characters), `email`, `password` (8 or more characters).

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Sam Green","email":"sam@example.com","password":"Password123"}'
```

Returns 201 with `{ data: { user, token } }`. The user never includes the
password hash. Returns 400 if the email is already taken.

### POST /api/auth/login

Body: `email`, `password`.

Returns 200 with `{ data: { user, token } }`, or 401. A wrong email and a wrong
password give exactly the same message on purpose.

### GET /api/auth/me

Needs a token. Returns 200 with `{ data: { user } }`.

## Chat

All chat endpoints need a token.

### POST /api/chat/session

No body. Starts an empty conversation.

Returns 201 with `{ data: { session } }`.

### GET /api/chat/session/:sessionId

Returns the whole conversation. This is the endpoint the browser polls.

Returns 200 with `{ data: { session } }`. Returns 404 if the conversation does
not exist **or belongs to somebody else**, so the API never confirms that another
user's conversation exists.

### POST /api/chat/message

Body: `sessionId` (uuid), `content` (1 to 1000 characters).

```bash
curl -X POST http://localhost:4000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"sessionId":"<uuid>","content":"Book a dental cleaning on 4 December 2026 at 3pm"}'
```

Returns 201 with:

```json
{
  "data": {
    "sessionId": "...",
    "userMessage": { "role": "user", "content": "...", "created_at": "..." },
    "assistantMessage": { "role": "assistant", "content": "...", "created_at": "..." },
    "needsAppointmentForm": false,
    "suggestedAppointment": { "date": "2026-12-04", "time": "15:00", "reason": "dental cleaning" },
    "missingDetails": [],
    "createdAppointment": { "id": "...", "scheduled_for": "2026-12-04 15:00:00", "status": "pending" }
  }
}
```

The assistant also answers "what are my upcoming bookings" here. That reply is
built from the database, not from the AI, and comes back in the same shape with
`needsAppointmentForm: false`.

The three fields that drive the interface:

- `needsAppointmentForm` - true means show the form.
- `suggestedAppointment` - whatever the AI did work out, used to pre-fill the
  form so the user does not retype it.
- `missingDetails` - which of `date`, `time`, `reason` are still needed.

If the AI is unavailable this endpoint still returns 201, with a helpful reply
and `needsAppointmentForm: true`. An AI outage is never a failed request.

## Appointments

Both endpoints need a token.

### POST /api/appointments

Body: `date` as `YYYY-MM-DD`, `time` as `HH:MM`, `reason` (3 or more characters).

```bash
curl -X POST http://localhost:4000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"date":"2026-12-18","time":"10:30","reason":"Follow up visit"}'
```

Returns 201 with `{ data: { appointment } }`. New appointments are always
`pending`.

### GET /api/appointments

Returns 200 with `{ data: { appointments } }`, soonest first, and only the ones
belonging to the logged-in user.

## Health

### GET /api/health

No token needed. Returns `{ "data": { "status": "ok" } }`. Useful for hosting
health checks.

## Rate limits

| Endpoints | Limit |
| --- | --- |
| Signup and login | 20 requests per 15 minutes |
| Sending chat messages | 20 requests per minute |
| Everything else | 300 requests per 15 minutes |

Chat is limited more tightly than the rest because every message costs a paid AI
call. Going over gives 429 in the normal error shape.
