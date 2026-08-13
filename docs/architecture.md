# Architecture

## The three parts

**Client** - a React app built with Vite. It draws the chat, the appointment list
and the fallback form. It holds no clever state: plain React state plus one
`AuthContext` for the logged-in user.

**API** - a Node and Express server. It is the only part that may write to the
database. It checks the login token on every protected route.

**Database** - PostgreSQL. Three tables that matter: `users`, `appointments` and
`chat_sessions`, plus a small `businesses` table for future multi-tenancy.

Groq sits outside all three. It is asked questions and gives answers. It is never
trusted with data.

## Layers inside the API

Every request walks the same short path. Each layer has one job.

| Layer | Job | Does not |
| --- | --- | --- |
| Route | Match the URL, list the middleware | Contain logic |
| Middleware | Check the token, check the body, count requests, log | Know about features |
| Controller | Read the request, call one service, send the reply | Contain logic or SQL |
| Service | Do the real work | Know about HTTP |
| Database helper | Run SQL | Decide anything |

A controller is about ten lines. If a controller grows, the logic belongs in a
service instead.

## How one chat message flows

This is the most interesting path in the app.

1. The user types and presses send. The client shows the message immediately so
   the app feels quick, and starts polling.
2. `POST /api/chat/message` arrives. The rate limiter counts it, the validator
   checks the body, the auth middleware confirms the token.
3. `chatService` saves the user message on its own, straight away. This matters:
   the polling request can now show it while the AI is still thinking.
4. `chatService` asks `aiService` what the conversation means. It sends the last
   10 messages as memory.
5. `aiService` calls Groq with a 15 second timeout, wrapped in try/catch. It
   returns one of two things: details it understood, or a clear failure. It never
   throws.
6. `chatService` decides what to do:
   - Not a booking request, so just reply.
   - A booking with everything present, so call `appointmentService` to save it.
   - Anything missing, unreadable or an AI failure, so ask for the form.
7. The assistant reply is saved, together with a full log of the AI call.
8. The reply goes back to the browser. Polling sees the assistant message and
   stops.

Step 6 is where the guardrail lives. Only that step can book, and only when
every detail is really there.

## Why polling

The spec allows sockets or polling. Polling was chosen because the app has one
chat box and one reply to wait for. A 1.5 second interval feels immediate,
runs on any host without sticky sessions, and needs no reconnect logic. It stops
as soon as the assistant answers, so it does not poll in the background forever.

The cost is a few wasted requests per message. For a prototype that is cheaper
than the complexity a socket would add.

## Where state lives

- **Server**: the truth. Every message and appointment is in PostgreSQL.
- **Browser localStorage**: the JWT, and which conversation you were in, so a
  refresh does not lose your place.
- **React state**: only what is on screen right now.

After every send, the client re-fetches the conversation from the server, so the
screen always ends up matching the database.

## Errors

One rule: services throw errors that carry a status code, and one handler at the
end of `app.js` turns any error into `{ error: { message } }`. Nothing else
formats an error. Unexpected failures are logged in full but reported to the user
as a plain message, so internals never leak.

On the client, the API wrapper turns every failed response into a thrown error
with a readable message, the page catches it and shows a toast. An `ErrorBoundary`
wraps the whole app, so a rendering crash shows a calm message instead of a blank
screen.
