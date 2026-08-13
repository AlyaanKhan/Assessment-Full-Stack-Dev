-- Full database structure for the AI appointment booking prototype.
-- Run this once against an empty PostgreSQL database (version 13 or newer,
-- because it uses the built-in gen_random_uuid() function).

DROP TABLE IF EXISTS chat_sessions;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS businesses;

-- One row per company using the product. Kept minimal on purpose: it exists so
-- the schema is already shaped for multi-tenant SaaS, not because the
-- prototype needs more than one business.
CREATE TABLE businesses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- People who can log in. A user belongs to exactly one business, so every
-- appointment and chat below inherits its tenant through the user.
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  name           TEXT NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- A booked slot. scheduled_for is plain wall-clock time in the business's own
-- local timezone; the prototype does not convert between timezones.
CREATE TABLE appointments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  scheduled_for  TIMESTAMP NOT NULL,
  reason         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- One conversation. The whole transcript lives in the messages array and every
-- AI call is appended to metadata.ai_logs so a failed booking can be debugged.
CREATE TABLE chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  messages    JSONB NOT NULL DEFAULT '[]'::JSONB,
  metadata    JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Login looks a user up by email on every sign-in, so this lookup must be fast.
-- The UNIQUE constraint on users.email already creates this index; it is named
-- here only to make the intent obvious when reading the schema.
-- (No separate CREATE INDEX needed for users.email.)

-- The appointment list page always filters by the logged-in user.
CREATE INDEX index_appointments_on_user_id ON appointments (user_id);

-- Calendar style reads ask for a date range, so sorting by time needs an index.
CREATE INDEX index_appointments_on_scheduled_for ON appointments (scheduled_for);

-- Loading a user's chats filters by owner, and this also backs the ownership
-- check that stops one user reading another user's session.
CREATE INDEX index_chat_sessions_on_user_id ON chat_sessions (user_id);
