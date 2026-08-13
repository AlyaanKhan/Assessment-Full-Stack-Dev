# Deployment

How to put this app online, one step at a time.

The plan: database on **Neon**, backend on **Render**, frontend on **Vercel**,
and a free uptime monitor to stop the backend falling asleep.

All three have a free tier. Budget about twenty minutes.

**Never put real secrets in git.** Every value below goes in the hosting
company's own settings page.

---

## Before you start

Create free accounts at:

- neon.tech (the database)
- render.com (the backend)
- vercel.com (the frontend)
- uptimerobot.com (keeps the backend awake)

Sign in to all four with GitHub. It makes the later steps much shorter.

Get a Groq API key from console.groq.com if you do not have one. If your key has
ever been pasted into a chat, an email or a commit, make a new one. Treat any key
that has been shared as public.

---

## Step 1: Get the code on GitHub

Skip this if your code is already pushed.

```bash
cd "your project folder"
git init
git add -A
git commit -m "Add AI appointment booking prototype"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
git push -u origin main
```

Before pushing, check that your secrets are not going with it:

```bash
git status --porcelain --ignored | grep "\.env$"
```

Both `server/.env` and `client/.env` should be listed with `!!` in front, which
means git is ignoring them. If they are not, stop and fix `.gitignore` first.

---

## Step 2: Make the database on Neon

1. Sign in to neon.tech and click **New Project**.
2. Give it any name. Pick the region closest to you.
3. When it is made, find **Connection string** on the dashboard.
4. Choose the **Pooled connection** option, and copy the string.

It looks like this:

```
postgresql://user:password@ep-something-pooler.region.aws.neon.tech/neondb?sslmode=require
```

Use the **pooled** one. Render opens and closes connections often, and the
pooled string is built to handle that. The plain one will run out of connections.

You do not need to change anything for SSL. The app turns SSL on by itself for
any database that is not on your own machine.

---

## Step 3: Create the tables

Put the Neon string into your local `server/.env` for a moment:

```
DATABASE_URL=your-neon-pooled-string-here
```

Then, from the `server` folder:

```bash
npm install
npm run db:setup
```

You should see:

```
Applied schema.sql
Applied seed.sql
Database is ready.
```

That makes every table and adds the sample data, including the demo login.

**Careful:** `db:setup` deletes every table before making them again. Run it once
at the start. Never run it against a database that has real data you want to keep.

If you have `psql` installed you can do the same thing directly:

```bash
psql "your-neon-string" -f db/schema.sql
psql "your-neon-string" -f db/seed.sql
```

---

## Step 4: Put the backend on Render

1. Sign in to render.com, click **New**, then **Web Service**.
2. Connect your GitHub account and pick this repository.
3. Fill in the settings:

| Setting | Value |
| --- | --- |
| Name | anything, for example `appointment-api` |
| Root directory | `server` |
| Runtime | Node |
| Build command | `npm install` |
| Start command | `npm start` |
| Instance type | Free |

4. Scroll to **Environment Variables** and add these:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | your Neon pooled string |
| `JWT_SECRET` | a long random string you make up |
| `GROQ_API_KEY` | your Groq key |
| `GROQ_MODEL_NAME` | `llama-3.1-8b-instant` |
| `CLIENT_ORIGIN` | leave empty for now, filled in at Step 6 |

Do not set `PORT`. Render provides it.

5. Set **Health Check Path** to `/api/health`.
6. Click **Create Web Service** and wait for the first deploy.

When it finishes, open `https://your-service.onrender.com/api/health` in a
browser. You should see:

```json
{"data":{"status":"ok","database":"connected"}}
```

If it says the database is unreachable, your `DATABASE_URL` is wrong.

Copy your Render URL. You need it in the next step.

---

## Step 5: Put the frontend on Vercel

1. Sign in to vercel.com and click **Add New**, then **Project**.
2. Import the same repository.
3. Fill in the settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | `client` |
| Build command | `npm run build` |
| Output directory | `dist` |

4. Open **Environment Variables** and add:

| Key | Value |
| --- | --- |
| `VITE_API_BASE_URL` | your Render URL, with no slash on the end |

For example `https://appointment-api.onrender.com`, not
`https://appointment-api.onrender.com/`.

5. Click **Deploy**.

The `client/vercel.json` file in this repository sends every address back to
`index.html`. That matters: without it, opening `/login` directly or pressing
refresh on any page would show a Vercel 404, because the app decides its own
pages in the browser.

Copy your Vercel URL.

---

## Step 6: Introduce the two halves

1. Go back to your Render service, open **Environment**.
2. Set `CLIENT_ORIGIN` to your Vercel URL, with no slash on the end.
3. Save. Render will redeploy on its own.

**Do not skip this.** The backend only accepts browser requests from the address
in `CLIENT_ORIGIN`. Until it is set, the site will load but every login will
fail, and the browser console will show a CORS error.

---

## Step 7: Check that it works

Open your Vercel address and walk through it:

1. The login page appears.
2. Log in with `demo@example.com` and `Password123`.
3. Your sample appointments are listed on the right.
4. Send `Book a dental cleaning on 4 December 2026 at 3pm`.
5. The new appointment appears in the list.
6. Press refresh. You are still logged in and still on the same page.

The first request after a quiet spell takes up to a minute on the free plan.
That is the service waking up, which the next step fixes.

---

## Step 8: Stop the backend falling asleep

A free Render service goes to sleep after **15 minutes** with no traffic. The
next visitor then waits up to a minute while it wakes. For a demo link somebody
else is going to open, that looks broken.

The fix is to have something visit the health address every few minutes.

### Setting up UptimeRobot

1. Sign in at uptimerobot.com.
2. Click **New monitor**.
3. Fill it in:

| Field | Value |
| --- | --- |
| Monitor type | **HTTP(S)** |
| Friendly name | Appointment Assistant API |
| URL | `https://your-service.onrender.com/api/health` |
| Monitoring interval | **5 minutes** |

4. Save.

Three details matter here:

**Choose HTTP(S), not Ping.** Ping sends a low level network message that does
not wake a web service. HTTP(S) makes a real request, which is what keeps Render
awake and what actually tests the app.

**Use the `/api/health` address, not the plain address.** The plain address
returns 404, and the monitor would report your site as down when it is fine.

**Five minutes is the important number.** It is less than Render's fifteen, so
the service never gets long enough alone to fall asleep. Five minutes is also the
smallest gap the free plan allows.

You can add your Vercel address as a second monitor if you like, but it is not
needed. Vercel does not sleep.

### What the monitor actually tells you

`/api/health` asks the database for a simple answer before replying. So:

| What UptimeRobot shows | What it means |
| --- | --- |
| Up | The API is awake and the database is reachable |
| Down, 503 | The API is running but cannot reach the database |
| Down, no answer | The whole service is down or still deploying |

That third state is worth knowing during a deploy, when a minute of red is normal.

The health route sits above the rate limiter on purpose, so a monitor calling it
all day can never be turned away with a 429 and reported as a false outage.

### The honest catch

Render's free plan gives you **750 instance hours a month**. A month is about 730
hours, so one service kept awake all the time just fits. Add a second free
service kept awake the same way and you will go over, and Render will suspend
them until the month resets.

For one demo link this is fine. It is worth knowing before you point a monitor at
several services.

---

## When something is wrong

| What you see | What it usually is |
| --- | --- |
| Login fails, console shows a CORS error | `CLIENT_ORIGIN` on Render does not exactly match your Vercel address |
| Everything loads but no data | `VITE_API_BASE_URL` is wrong, or has a slash on the end |
| Health says database unreachable | `DATABASE_URL` is wrong, or you used the unpooled string |
| Refreshing a page gives a Vercel 404 | `client/vercel.json` is missing from the deployed folder |
| The chat replies but never books | `GROQ_API_KEY` is wrong or out of credit. The app is built to fall back to the form when the AI fails, so this symptom points straight at the key |
| The chat sometimes falls back for no reason | The free Groq tier allows 6000 tokens a minute. Sending many messages quickly hits it |
| First visit of the day is very slow | The service was asleep. Step 8 fixes this |

## Notes

**Rate limits are counted in memory.** They reset whenever Render redeploys or
restarts, and they are counted separately per instance. A shared store would be
needed for real traffic.

**Deploying again is automatic.** Push to `main` and both Render and Vercel
rebuild by themselves.
