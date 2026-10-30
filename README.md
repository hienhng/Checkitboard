# Checkit

Checkit is a vocabulary-learning platform for educators and learners. Educators can create classes and vocabulary assignments from reading passages; learners can complete check-ups, review vocabulary with flashcards, and track their progress.

## Features

- Role-based educator and learner accounts, with email verification and password reset
- Class management and vocabulary-list assignments
- Passage-based vocabulary creation and AI-assisted definitions and questions
- Configurable assessments, automatic grading, and progress tracking
- Flashcards, sticky notes, and parent email notifications

## Tech stack

- React, TypeScript, Vite, Tailwind CSS, and Radix UI
- Node.js, Express, and Passport
- PostgreSQL with Drizzle ORM
- Optional AI providers: Groq, OpenAI, and Hugging Face

## Requirements

- Node.js 20 or later
- PostgreSQL
- npm

## Getting started

1. Install dependencies:

   ```sh
   npm install
   ```

2. Set the required environment variables in your shell:

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

## Optional configuration

AI features use the first available provider in this order: Groq, OpenAI, then Hugging Face. Set one or more API keys to enable AI-assisted features:

```powershell
$env:GROQ_API_KEY = "..."
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
