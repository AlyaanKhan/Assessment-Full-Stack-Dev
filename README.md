# Appointment Assistant

A small web app where you book an appointment by chatting in plain English. You
sign up, type something like "book a dental cleaning on 4 December at 3pm", and
an AI reads your sentence and saves the appointment. If the AI cannot work out
the date, the time or the reason, the app shows a short form instead of guessing.

This is a prototype built for a technical assessment. It shows the core flow end
to end and nothing more.

## Live demo

Not deployed yet. See [docs/deployment.md](docs/deployment.md) for the exact
steps to put it online. Everything needed to deploy is in the repository.

## The parts and how they talk

```
Browser (React + Vite)
    |  REST over HTTP, JWT in the Authorization header
    v
API (Node + Express)
    |                         \
    | SQL                      \  HTTPS
    v                           v
PostgreSQL                    Groq (llama-3.1-8b-instant)
```

- **Client** shows the chat, the appointment list and the fallback form.
- **API** checks who you are, saves data, and asks the AI what you meant.
- **PostgreSQL** stores users, appointments and whole conversations.
- **Groq** reads your sentence and returns the booking details as JSON. It never
  writes to the database; only the API does that.

Inside the API each request travels the same path:

```
route -> middleware (auth, validation, rate limit) -> controller -> service -> database
```

## Run it on your machine

You need Node 18 or newer and a PostgreSQL database.

**1. Get the code and install**

```bash
git clone <your-repo-url>
cd "FSD (Assessment)"

cd server && npm install
cd ../client && npm install
```

**2. Set up the backend settings**

```bash
cd server
cp .env.example .env
```

Open `.env` and fill in:

| Setting | What to put |
| --- | --- |
| `PORT` | `4000` |
| `DATABASE_URL` | your PostgreSQL connection string |
| `JWT_SECRET` | any long random string |
| `GROQ_API_KEY` | your key from console.groq.com |
| `GROQ_MODEL_NAME` | `llama-3.1-8b-instant` |
| `CLIENT_ORIGIN` | `http://localhost:5173` |

**3. Create the tables and sample data**

From the `server` folder:

```bash
npm run db:setup
```

That runs `schema.sql` and then `seed.sql` for you. It uses the PostgreSQL
driver that is already installed, so you do not need the `psql` command on your
machine.

If you do have `psql`, this does the same thing:

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

**4. Set up the frontend settings**

```bash
cd ../client
cp .env.example .env
```

`VITE_API_BASE_URL=http://localhost:4000` is already the right value.

**5. Start both sides, in two terminals**

```bash
cd server && npm run dev     # http://localhost:4000
cd client && npm run dev     # http://localhost:5173
```

**6. Log in**

Open http://localhost:5173 and use the seeded account:

- Email: `demo@example.com`
- Password: `Password123`

Or create your own account on the signup page.

## Try the main flow

1. Type: `Book a dental cleaning on 4 December 2026 at 3pm`.
   The appointment appears in the list on the right.
2. Type: `I want to come in some time soon`.
   The AI cannot tell when, so the booking form opens instead of guessing.
3. Fill the form and confirm. The appointment is saved.
4. Type: `What are my upcoming bookings?`
   The answer is read from the database, not invented by the AI.
5. Type: `Who is the president of the USA?`
   The assistant says it only handles appointments, instead of bluffing.

## Key decisions and tradeoffs

**Polling instead of WebSockets.** The browser asks for new messages every 1.5
seconds while it waits for a reply, then stops. A socket would be faster but
needs more moving parts than one chat box is worth.

**The whole conversation lives in one JSONB column.** A chat is always read and
written as a whole, so a separate messages table would add joins for no gain. The
tradeoff is that searching inside messages across users is awkward. That is fine
here and easy to change later.

**The AI reads, the API writes.** Groq only returns JSON describing what the user
asked for. Saving the appointment is ordinary code in `appointmentService.js`. So
a strange AI answer can never write bad data.

**The AI never writes what the user reads.** It classifies the request and pulls
out the details; every sentence the assistant says is written by the app. An
earlier version showed the model's own sentence and it produced polite filler:
asked "Who is USA president?" it said "I'm happy to help you with that", and
asked "What are my upcoming bookings?" it said "I can help you with that" while
having no access to the database at all. Now off-topic questions get a clear note
about what this assistant does, and questions about existing bookings are
answered from the database. The cost is no small talk, which is the right trade
for a booking tool.

**Never guess a missing detail.** If the date, the time or the reason is missing
or malformed, the app shows the form. Guessing a medical appointment date is
worse than asking.

**An AI failure is not a request failure.** Every AI call has a 15 second timeout
and a try/catch. If Groq is down the chat still replies, still saves both
messages, and opens the form. This is tested.

**Timestamps are plain wall-clock time.** "3pm" is stored as 3pm with no timezone
maths, and the database driver is told to hand the text back untouched. Without
that, a 3pm booking read back on a server in another timezone becomes a different
hour. Real timezone support is a known limitation.

**Passwords.** Hashed with bcrypt, never returned by any endpoint. A wrong email
and a wrong password give the same message, so the API cannot be used to discover
who has an account.

## Assumptions

- One clinic. Every user joins the single seeded business.
- The clinic is always open. No working hours, no double-booking checks.
- Everyone is in the same timezone.
- Appointments are created as `pending`. Nothing in the prototype confirms them.
- One conversation per user, remembered in the browser between reloads.
- The AI sees the last 10 messages, which is plenty for one booking.

## Known limitations, left out on purpose

- **No deployment yet.** Needs hosting accounts. Steps are in the docs.
- **No cancel, reschedule or edit.** Only create and list, as specified.
- **The assistant does not make small talk.** It greets you back if you say
  hello, but anything else off topic gets the same short message explaining what
  it does. That is deliberate, so it can never bluff an answer. A side effect is
  that "thanks" and "goodbye" are answered with a hello, which reads a little odd.
- **The free Groq tier allows 6000 tokens a minute.** Send messages quickly, one
  after another, and some will hit that limit. The app handles it the same way as
  any other AI failure: it stays up and offers the booking form.
- **No automated test suite committed.** The app was tested end to end during
  development, including AI failure, but no test runner was added since none was
  asked for.
- **Relative weekdays can be wrong.** "Next Monday" sometimes lands on the wrong
  date, because this is a small fast model. Exact dates like "4 December at 3pm"
  are reliable. The form is the safety net.
- **No booking conflict check.** Two appointments can sit at the same time.
- **No refresh tokens.** One JWT that lasts 7 days. No logout on the server.
- **Rate limits are stored in memory.** They reset when the server restarts and
  are per instance.
- **Multi-tenancy is structural only.** The `business_id` column exists and is
  filled in, but nothing filters by it yet.
- **No admin view.** A user only sees their own appointments.

## More documentation

- [docs/architecture.md](docs/architecture.md) - the parts, and how a message flows through them
- [docs/api.md](docs/api.md) - every endpoint, with examples
- [docs/database.md](docs/database.md) - tables, indexes and how it scales
- [docs/ai-integration.md](docs/ai-integration.md) - how the AI is used and kept safe
- [docs/deployment.md](docs/deployment.md) - how to put it online

## Repository layout

```
server/
  db/schema.sql        all tables and indexes
  db/seed.sql          sample data and the demo login
  src/routes/          one file per resource
  src/controllers/     thin request handlers
  src/services/        the real logic, including aiService.js
  src/middleware/      auth, validation, logging, rate limit, errors
  src/db/              connection pool and query helpers
  src/utils/utils.js   all pure helpers
client/
  src/api/             one small wrapper per endpoint
  src/components/      chat, form, list, navbar
  src/pages/           login, signup, chat
  src/context/         AuthContext and ToastContext
  src/utils/utils.js   all pure helpers
```
