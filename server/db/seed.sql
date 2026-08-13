-- Sample data so the app is usable straight after setup.
-- Run this after schema.sql.

-- The single business every prototype user is attached to.
INSERT INTO businesses (id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Northside Clinic');

-- Ready made login for testing.
--   email:    demo@example.com
--   password: Password123
-- The hash below is a bcrypt hash of that password.
INSERT INTO users (id, business_id, email, password_hash, name)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'demo@example.com',
  '$2a$10$1eMYJuSyGrB89kyqKEP.y.y6UfWp8RdtJQDrlMI6gdOtqghB/kyta',
  'Demo User'
);

-- A few appointments so the list is not empty on first login.
-- The times are worked out from today rather than written as fixed dates, so the
-- sample data still makes sense whenever somebody runs this file. Between them
-- they show all three statuses, and one appointment that has already happened.
INSERT INTO appointments (user_id, scheduled_for, reason, status)
VALUES
  ('22222222-2222-2222-2222-222222222222', (CURRENT_DATE + 3) + TIME '10:00', 'Annual health check', 'confirmed'),
  ('22222222-2222-2222-2222-222222222222', (CURRENT_DATE + 10) + TIME '15:30', 'Follow up on blood test results', 'pending'),
  ('22222222-2222-2222-2222-222222222222', (CURRENT_DATE + 5) + TIME '09:00', 'Dental cleaning', 'cancelled'),
  ('22222222-2222-2222-2222-222222222222', (CURRENT_DATE - 12) + TIME '11:15', 'Sore throat consultation', 'confirmed');

-- One finished conversation showing the stored message and AI log shape.
INSERT INTO chat_sessions (id, user_id, messages, metadata)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  '[
    {
      "role": "user",
      "content": "Book me an annual health check on 1 September 2026 at 10am",
      "created_at": "2026-08-10T08:59:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Your appointment is booked for Tuesday, 1 September 2026 at 10:00 AM. Reason: Annual health check.",
      "created_at": "2026-08-10T08:59:02.000Z"
    }
  ]'::JSONB,
  '{
    "ai_logs": [
      {
        "at": "2026-08-10T08:59:02.000Z",
        "model": "llama-3.1-8b-instant",
        "input_message": "Book me an annual health check on 1 September 2026 at 10am",
        "raw_output": "{\"intent\":\"booking\",\"reply\":\"Your appointment is booked.\",\"date\":\"2026-09-01\",\"time\":\"10:00\",\"reason\":\"Annual health check\",\"missing\":[]}",
        "parsed_result": {
          "intent": "booking",
          "date": "2026-09-01",
          "time": "10:00",
          "reason": "Annual health check",
          "missing": []
        },
        "error": null
      }
    ]
  }'::JSONB
);
