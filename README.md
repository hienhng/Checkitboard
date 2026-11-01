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

- Node.js 20.12 or later
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
