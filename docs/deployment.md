# Deployment

The app is not deployed yet, because that needs accounts that belong to you.
Everything the hosts need is already in the repository. These steps take about
fifteen minutes.

The plan: database on Neon, API on Render, client on Vercel.

**Never put real secrets in git.** Every value below goes in the host's own
settings page.

## 1. Database on Neon

1. Make a project at neon.tech and copy the connection string.
2. Use the **pooled** connection string. Hosts like Render open and close
   connections often, and the pooled one handles that.
3. Create the tables. Put the Neon URL in `server/.env` as `DATABASE_URL`, then
   from the `server` folder run:

```bash
npm run db:setup
```

   With `psql` installed you can do the same thing directly:

```bash
psql "<your-neon-url>" -f server/db/schema.sql
psql "<your-neon-url>" -f server/db/seed.sql
```

SSL is handled already: the connection code turns SSL on for any host that is
not localhost.

## 2. API on Render

Create a Web Service pointing at this repository.

| Setting | Value |
| --- | --- |
| Root directory | `server` |
| Build command | `npm install` |
| Start command | `npm start` |

Environment variables:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | the pooled Neon string |
| `JWT_SECRET` | a long random string you generate |
| `GROQ_API_KEY` | your Groq key |
| `GROQ_MODEL_NAME` | `llama-3.1-8b-instant` |
| `CLIENT_ORIGIN` | your Vercel URL, added after step 3 |
| `PORT` | leave unset; Render provides it |

Health check path: `/api/health`.

## 3. Client on Vercel

Import the same repository.

| Setting | Value |
| --- | --- |
| Root directory | `client` |
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

Environment variable:

| Key | Value |
| --- | --- |
| `VITE_API_BASE_URL` | your Render URL, with no trailing slash |

## 4. Join the two together

1. Copy the Vercel URL.
2. Put it in `CLIENT_ORIGIN` on Render and redeploy.

This matters. The API only accepts browser requests from the origin named in
`CLIENT_ORIGIN`, so the app will not work until it is set.

## 5. Check it works

1. Open the Vercel URL. The login page should appear.
2. Log in with `demo@example.com` and `Password123`.
3. Send: `Book a dental cleaning on 4 December 2026 at 3pm`.
4. The appointment should appear in the list.

If the chat replies but never books, check `GROQ_API_KEY` on Render. The app is
built to degrade to the form when the AI fails, so that symptom points straight
at the key.

## Notes

**A free Render service sleeps** when unused, so the first request after a quiet
spell takes a few seconds. Fine for a demo.

**Rate limits are held in memory**, so they reset on each deploy and are counted
per instance. A shared store would be needed for real traffic.

**Rotate the Groq key** if it has ever been in a chat, an email or a commit.
Treat any key that has been shared as public.
