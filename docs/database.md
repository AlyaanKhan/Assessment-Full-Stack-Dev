# Database

PostgreSQL. All the DDL is in `server/db/schema.sql`. Sample data, including a
ready-made login, is in `server/db/seed.sql`.

## The tables

### businesses

One row per clinic. Only one exists in the prototype.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| name | text | not null |
| created_at | timestamp | defaults to now |

### users

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| business_id | uuid | must point at a real business |
| email | text | not null, unique |
| password_hash | text | not null, bcrypt, never sent to the browser |
| name | text | not null |
| created_at | timestamp | defaults to now |

### appointments

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | must point at a real user, deleted with them |
| scheduled_for | timestamp | not null, plain wall-clock time |
| reason | text | not null |
| status | text | `pending`, `confirmed` or `cancelled`, enforced by a CHECK |
| created_at | timestamp | defaults to now |

### chat_sessions

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | must point at a real user, deleted with them |
| messages | jsonb | a list of `{role, content, created_at}` |
| metadata | jsonb | holds `ai_logs`, one entry per AI call |
| created_at | timestamp | defaults to now |
| updated_at | timestamp | moved forward on every new message |

## Why the conversation is one JSONB column

A conversation is always read whole and written by appending. Keeping it in one
column means loading a chat is a single row read with no join, and adding a
message is one `messages || $1` update.

The cost is that querying inside messages across many users is clumsy, and a very
long chat rewrites a large value each time. Neither matters for one booking
conversation. If chats ever needed searching or paging, the fix is a `messages`
table with a foreign key, which is a contained change because only
`chatService.js` touches this column.

## Indexes, and why each one exists

| Index | Why |
| --- | --- |
| `users.email` (from the UNIQUE constraint) | Every login looks a user up by email. Without it, sign-in scans the whole table. |
| `index_appointments_on_user_id` | The appointment list always filters by the logged-in user. |
| `index_appointments_on_scheduled_for` | Sorting by time, and any future "what is on this week" query, needs the times in order. |
| `index_chat_sessions_on_user_id` | Loading a user's chats filters by owner, and this also backs the ownership check that stops one user reading another user's session. |

The primary keys are indexed automatically, so id lookups are already fast.

## Notes on performance

**Reads are all small and pointed.** Every query in the app filters by a
primary key or by `user_id`, and both are indexed. No query scans a whole table.

**Ownership is checked in SQL, not in code.** A session is fetched with
`WHERE id = $1 AND user_id = $2`. One indexed query both loads the row and proves
it belongs to the caller.

**Appending a message is one statement.** No read, change and write back, so two
messages arriving together cannot overwrite each other.

**Where it would strain first.** The `appointments` table grows fastest. When one
clinic has years of history, a query for a single day would want a composite
index on `(user_id, scheduled_for)` rather than the two separate ones, and old
rows could be moved out. The `chat_sessions` table grows in size rather than row
count, so old conversations would be archived instead of indexed harder.

**Connection pooling** is handled by `pg.Pool`, so requests reuse connections
instead of opening one each time. Serverless hosts need a pooled connection
string; that is noted in the deployment guide.

## Multi-tenancy

`businesses` exists and every user carries a `business_id`. That one column is
what makes the schema SaaS-ready: appointments and chats both reach their tenant
through the user, so adding `WHERE business_id = $1` to queries, plus row level
security, would separate clinics without reshaping any table.

Nothing filters by it yet. That is deliberate and listed as a known limitation.
