# Checkit

Checkit is a vocabulary-learning platform for educators and learners. Educators can create classes and vocabulary assignments from reading passages; learners can complete check-ups, review vocabulary with flashcards, and track their progress.

## Features

- Role-based educator and learner accounts, with email verification and password reset
- Class management and vocabulary-list assignments
- Passage-based vocabulary creation and AI-assisted definitions and questions
- Automatic grid-in questions for each vocabulary word, with AI assessment of learners' typed answers on submission
- Configurable assessments, automatic grading, and progress tracking
- Flashcards, sticky notes, and parent email notifications

## Tech stack

- React, TypeScript, Vite, Tailwind CSS, and Radix UI
- Node.js, Express, and Passport
- PostgreSQL with Drizzle ORM
- Optional AI providers: Gemini, OpenAI, and Hugging Face

## Requirements

- Node.js 22.x
- PostgreSQL
- npm

## Getting started

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and set `DATABASE_URL` and `SESSION_SECRET`.
   The app, database commands, and seed script load this file automatically.
   You can also set the variables in your shell:

   ```powershell
   $env:DATABASE_URL = "postgresql://user:password@localhost:5432/checkit"
   $env:SESSION_SECRET = "replace-with-a-long-random-secret"
   ```

   `DATABASE_URL` must point to a PostgreSQL database. `SESSION_SECRET` should be a unique, private value; do not use the development fallback in a deployed environment.

3. Create or update the database schema:

   ```sh
   npm run db:push
   ```

   This command uses Drizzle Kit to push the schema. Review its effects before running it against a database containing important data.

4. Start the development server:

   ```sh
   npm run dev
   ```

   Open [http://localhost:5000](http://localhost:5000). The server hosts both the API and the Vite development app on port `5000`.
   Set `PORT` in `.env` to use another port.

### This workspace's local database (Windows)

The local development database is stored in `.local/postgres` on port `5433`.
Its connection settings are in the ignored `.env` file. After restarting Windows,
start PostgreSQL in a separate PowerShell terminal before running `npm run dev`:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\postgres.exe' -D .local/postgres -p 5433 -h 127.0.0.1 -c shared_buffers=32MB -c max_connections=50
```

## Optional configuration

AI features use the first available provider in this order: Google AI Studio (Gemini), OpenAI, then Hugging Face. Create a key in [Google AI Studio](https://aistudio.google.com/apikey) and add it to your local `.env`:

```dotenv
GEMINI_API_KEY=your-ai-studio-api-key
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`. Set it to another available model when needed. The server uses Google's [OpenAI-compatible Gemini endpoint](https://ai.google.dev/gemini-api/docs/openai); the Gemini key is sent to Google. Keep it server-side and restart the server after changing `.env`.

Grid-in assessment uses Gemini or OpenAI and accepts accurate answers in the learner's own words. If assessment fails, answers remain saved and the learner can retry submission. Grades are recorded only after assessment succeeds.

Alternatively, set shell variables. OpenAI and Hugging Face keys are optional fallbacks:

```powershell
$env:GEMINI_API_KEY = "..."
$env:OPENAI_API_KEY = "..."
$env:HUGGINGFACE_API_KEY = "..."
```

Email delivery can be configured with Gmail (`EMAIL_USER` and `EMAIL_APP_PASSWORD`) or SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD`). `EMAIL_FROM` can optionally specify the sender address. Email-dependent features will not send messages until a provider is configured.

## Deploy to Vercel

The repository includes `vercel.json` and `api/index.ts`. Vercel serves the
frontend from `dist/public` and sends `/api/*` to a Node.js function. Browser
routes such as `/settings` fall back to `index.html`; unknown API routes return
JSON with a 404 status. Local development still uses `npm run dev`.

1. Provision a hosted PostgreSQL database. Use the provider's pooled connection
   URL for `DATABASE_URL`, including its required SSL options. A database running
   on your PC cannot be reached by Vercel. Keep the database and function close
   geographically; the app shares up to five connections per function instance.
2. Initialize a **new, empty database** with `npm run db:setup`, using its
   connection URL in your shell. This creates the schema in `db/setup.sql`,
   including session storage, without sample accounts. It does not upgrade
   existing tables. For an existing database, back it up and review schema
   changes before applying them. Do not run database setup or seeding as part of
   Vercel's build: preview builds must not modify production data.
3. Import the repository into Vercel with the repository root as the Root
   Directory. The committed configuration selects **Vite**, runs `npm run build`,
   and uses `dist/public` as the Output Directory. Use **Node.js 22.x** and enable
   **Fluid compute**; the API has a maximum duration of 300 seconds for AI calls.
4. Add the following variables in the project's Vercel Environment Variables
   settings before deploying. Use separate databases and secrets for Preview
   and Production. Local `.env` files are excluded from uploads and are not
   loaded on Vercel.

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Hosted PostgreSQL connection URL with the provider's SSL settings |
   | `SESSION_SECRET` | A unique random secret of at least 32 characters |
   | `FRONTEND_URL` | The deployed public HTTPS origin, with no trailing slash; used for email links |
   | `GEMINI_API_KEY` | Google AI Studio key for vocabulary generation and grid-in grading; alternatively configure `OPENAI_API_KEY` |
   | `EMAIL_USER`, `EMAIL_APP_PASSWORD` | Gmail address and app password, or use all SMTP variables below |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Alternative SMTP configuration; set `SMTP_SECURE=true` for implicit TLS |
   | `EMAIL_FROM` | Optional sender address; must be permitted by your email provider |

   Generate a session secret with:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Vercel sets `NODE_ENV=production` automatically. Keep provider keys server-side;
   never prefix them with `VITE_`. Set `FRONTEND_URL` for each environment's
   intended domain and redeploy after changing environment variables.

5. Deploy and verify `/api/health` returns `{"status":"ok"}`. Then test account
   registration, email verification, login, a page refresh on `/settings`, and a
   complete vocabulary assignment with AI grading. `/api/user` should return
   JSON with a 401 status before login; `/api/does-not-exist` should return JSON
   with a 404 status. The health endpoint checks the API process; login and
   registration also verify database/session access.

Profile images are limited to **2 MB** so base64-encoded JSON fits below
[Vercel's 4.5 MB function payload limit](https://vercel.com/docs/functions/limitations).
The PostgreSQL pool uses Vercel's `attachDatabasePool` lifecycle helper. Session
records are stored in PostgreSQL and survive function restarts. Parent result
notifications in `server/email.ts` currently log the message instead of sending
mail; account verification and password-reset emails use the configured provider.

Before deploying, run:

```sh
npm ci
npm run check
npm test
npm run build
```

The database integration test runs only when `TEST_DATABASE_URL` is set. It
creates and drops its own temporary schema. See the official
[Vite deployment guide](https://vercel.com/docs/frameworks/frontend/vite) and
[Node.js functions documentation](https://vercel.com/docs/functions/runtimes/node-js)
for the hosting model used here.

## Database seed data

To insert sample educator, learner, class, and assignment data into an empty database:

```sh
npm run db:seed
```

The sample accounts use `teacher@example.com` and `student@example.com`, both with the password `password123`. This is development-only data; do not use these credentials in a deployed environment.

## Other commands

| Command | Description |
| --- | --- |
| `npm run check` | Type-check the project with TypeScript |
| `npm run build` | Build the frontend and bundle the server |
| `npm run start` | Start the production server after building (POSIX shells) |

On Windows, after `npm run build`, start the production server in PowerShell with:

```powershell
$env:NODE_ENV = "production"
node dist/index.js
```
