# AI integration

Provider: Groq. Model: `llama-3.1-8b-instant`.

All of it lives in one file, `server/src/services/aiService.js`. Nothing else in
the app talks to Groq, and that file never touches the database.

## What the AI is for

One job: read a conversation and say what the person is asking for. It does not
book anything, it does not decide anything, and it does not write a single word
that the user sees. It reports.

## What we ask for

The model is told to reply with a single JSON object and nothing else:

```json
{
  "intent": "booking",
  "date": "2026-12-04",
  "time": "15:00",
  "reason": "dental cleaning"
}
```

`intent` is one of three values:

| Intent | Meaning |
| --- | --- |
| `booking` | They want to make an appointment |
| `list_appointments` | They are asking what they already have booked |
| `greeting` | A hello or ordinary politeness with no request attached |
| `other` | Anything else, such as general knowledge questions |

Any detail the user did not give must come back as `null`. The prompt says this
plainly, several times, because a guessed appointment date is worse than no
appointment. The request also sets Groq's JSON mode and a low temperature, so
answers are consistent.

Today's date and weekday are put in the prompt, so "tomorrow" can be worked out.

## The AI never writes the reply

Every sentence the assistant says is written by `chatService.js`, not by the
model. This was a deliberate change after testing.

An earlier version asked the model for a `reply` sentence and showed it to the
user. A small fast model fills that slot with polite filler. Asked "Who is USA
president?" it answered "I'm happy to help you with that", and asked "What are my
upcoming bookings?" it answered "I can help you with that" and then did nothing.
The second one is worse than useless: the model has no access to the database, so
it cannot know the answer, but it sounds like it does.

Now the model only classifies and extracts, and the app writes the words:

| Situation | What the user is told |
| --- | --- |
| Booking, all details present | A confirmation naming the date, time and reason |
| Booking, something missing | A question naming exactly what is missing |
| Asking what they have booked | A list read from the database |
| Saying hello | A greeting back, then what to do next |
| Off topic | A short note that this assistant only handles appointments |
| AI unavailable | A note to use the form instead |

Greetings get their own answer because they are not really off topic. "Hi, how
are you?" is often the first thing somebody types, and replying "I can only help
with appointments" to a hello reads as a telling off.

The tradeoff is that the assistant cannot make small talk. For a booking tool
that is the right trade: the wording is always accurate, and it can never invent
an answer about the user's own data.

## Memory

The last 10 messages of the conversation are sent with every call. That is enough
for a booking gathered over a few turns:

> User: I would like to book a physiotherapy session
> Assistant: What date and time would suit you?
> User: 12 November 2026 at 9:30am

On the third message the model still sees the reason from the first, and returns
all three details together. Ten messages keeps the request small and cheap; the
number is one constant in `config.js`.

## Reading the answer safely

The reply is never trusted. It goes through three steps, all pure functions in
`utils.js`:

1. `parseFirstJsonObject` finds the JSON even if the model wrapped it in chat,
   and returns `null` rather than throwing if it is broken.
2. `cleanUpBookingDetails` keeps only the four fields we expect. Anything that is
   not a non-empty string becomes `null`, so a number or an object where a date
   should be cannot get through. An intent it does not recognise becomes `other`.
3. `isValidDateText` and `isValidTimeText` check the shape is really a date and a
   real time. `2026-02-31` is rejected. `24:00` is rejected.

Only after all three does `chatService` treat a detail as present.

## When it will not book

`chatService` books only if the intent is booking **and** the date, the time and
the reason all survive those checks. Otherwise it tells the frontend to show the
form, and sends back whatever it did understand so the form comes pre-filled.

The user only fills in the parts that are actually missing.

## Guardrails

**Timeout.** Every call gets 15 seconds, then gives up.

**Try/catch around everything.** A bad key, a rate limit, a network drop, an
unreadable answer: all end up in the same place, returning
`{ succeeded: false }` rather than throwing.

**A failure is not a request failure.** If the AI is unavailable, the chat still
returns 201, the user gets a clear message telling them to use the form, and both
messages are still saved. This was tested by pointing the app at an invalid key:
the request still succeeded and the form appeared.

**The AI cannot write.** Saving is `appointmentService.bookAppointment`, ordinary
code with its own validation. Even a wild AI answer can only cause a form to
appear.

**The AI cannot speak for the data.** When somebody asks what they have booked,
the answer is read from the database by `appointmentService`, not generated. The
model only decides that the question was asked.

## Logging

Every call is logged twice.

To the console, for watching it work while developing:

```
[aiService] input: Book a dental cleaning on 4 December 2026 at 3pm
[aiService] raw output: {"intent":"booking","date":"2026-12-04","time":"15:00",...}
[aiService] parsed result: { intent: 'booking', date: '2026-12-04', ... }
```

And into the database, in `chat_sessions.metadata.ai_logs`, so a booking that
went wrong can be explained afterwards:

```json
{
  "at": "2026-08-12T13:58:13.000Z",
  "model": "llama-3.1-8b-instant",
  "input_message": "what the user typed",
  "raw_output": "exactly what the model said",
  "parsed_result": { },
  "error": null
}
```

`raw_output` is kept as it came back, so a parsing problem can be reproduced.

## What was left out

No agent framework, no tool calling, no vector database, no retrieval. One prompt
and one call per message is all this flow needs.

The known weakness is relative weekdays. "Next Monday" sometimes resolves to the
wrong date on a model this small. Exact dates are reliable. Rather than build
prompt workarounds, the app leans on the rule it already has: when in doubt, ask
with the form.
