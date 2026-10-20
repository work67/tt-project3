# Bali Trip 🌴

A shared to-do list and expense splitter for a ten-person trip. Everyone logs in, ticks off
trip prep, logs what they paid for, and sees who owes whom. See [PLAN.md](PLAN.md) for the
trip, the ten people, and the design decisions.

Stack: **React + Vite** frontend, **Express** backend, all TypeScript, managed as npm workspaces.
The database is SQLite in both places it runs:

|              | Runs on                            | Database                                  |
| ------------ | ---------------------------------- | ----------------------------------------- |
| Local        | Node (`server/src/index.ts`)       | SQLite file via `node:sqlite`             |
| Cloudflare   | Workers (`server/src/worker.ts`)   | D1 (Cloudflare's hosted SQLite)           |

Both entry points run the same Express app and services, through a small async database
interface (`server/src/db/`). The schema lives in `server/migrations/` and is used by both.

## Getting started

Requires Node 22.5 or newer (for the built-in `node:sqlite`).

```bash
npm install
cp server/.env.example server/.env
npm run dev                  # client on http://localhost:5173, server on :3001
```

On first run the server creates `server/data/trip.db` and seeds the ten accounts:
`alex, priya, ben, mei, diego, sara, kofi, hana, liam, zoe`, all with the password from
`SEED_PASSWORD` in `server/.env` (default `password`), plus starter to-dos and expenses.

The seed only runs when the database is empty, not on every `npm run dev`. To start over
with fresh seed data, or to apply a changed `SEED_PASSWORD`, stop the dev server and run
`npm run db:reseed` (**this deletes all trip data**).

You'll see an `ExperimentalWarning: SQLite is an experimental feature` line on startup. It's harmless.

## Features

- **To-dos**: add, assign to anyone, set a due date, tick off; filter by open / mine / all.
- **Expenses**: who paid, how much, and which of the ten it's split between (equal split;
  leftover cents go one per person so shares always add up).
- **Who owes what**: your own balance, everyone's net balance, and the fewest payments
  needed to settle up. "Mark paid" records a repayment and updates everyone's balance.

## Scripts (run from root)

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Run client and server in watch mode |
| `npm run build`     | Build both to their `dist/` folders |
| `npm start`         | Run the built server                |
| `npm run typecheck` | Type-check both workspaces          |
| `npm run db:reseed` | Wipe the local database and reseed  |
| `npm run cf:dev`    | Run the Cloudflare build locally (Workers runtime + local D1) on :8787 |
| `npm run deploy`    | Build, apply D1 migrations, deploy to Cloudflare |

## Deploying to Cloudflare

One Worker serves both the API and the built React app. One-time setup, from `server/`:

```bash
cd server
npx wrangler login
npx wrangler d1 create bali-trip-db      # copy the database_id it prints into wrangler.jsonc
npx wrangler secret put SEED_PASSWORD    # the password the ten accounts start with
cd ..
npm run deploy                           # builds client, applies migrations, deploys
```

Wrangler prints the app's URL (`https://bali-trip.<you>.workers.dev`). The first request
seeds the ten accounts, to-dos and expenses into D1. Later deploys: just `npm run deploy`.

### Deploying with GitHub Actions

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) deploys on every push to `main`
(or manually from the Actions tab): typecheck → build client → apply D1 migrations → deploy.
Until it's set up, it skips the deploy with a warning instead of failing.

One-time setup:

1. Create the D1 database (`npx wrangler d1 create bali-trip-db` from `server/`), put its
   `database_id` in `server/wrangler.jsonc`, and commit that. The id isn't secret.
2. In Cloudflare → *My Profile → API Tokens*, create a token from the **Edit Cloudflare
   Workers** template and add **Account → D1 → Edit** to it.
3. In GitHub → *Settings → Secrets and variables → Actions*, add:
   - `CLOUDFLARE_API_TOKEN`: the token from step 2
   - `CLOUDFLARE_ACCOUNT_ID`: shown on the Cloudflare dashboard's Workers & Pages page
     (a secret or a variable both work)
   - `SEED_PASSWORD`: the ten accounts' starting password (uploaded with each deploy)
4. Push to `main`, or run the workflow from the Actions tab.

Notes:

- **Set the `SEED_PASSWORD` secret before the first visit.** Without it the code's fallback
  is used, and that's visible to anyone who can read this repo.
- To try the Cloudflare build without deploying: `npm run cf:dev`. Its local secrets come
  from `server/.dev.vars` (gitignored), e.g. `SEED_PASSWORD=password`.
- Schema changes: add a new numbered file to `server/migrations/`. Local SQLite applies it on
  the next start; `npm run deploy` applies it to D1.
- To wipe the deployed data and reseed:
  `npx wrangler d1 execute bali-trip-db --remote --command "DELETE FROM sessions; DELETE FROM settlements; DELETE FROM expense_shares; DELETE FROM expenses; DELETE FROM todos; DELETE FROM users;"`
  (the next request reseeds).
- Logins hash passwords with scrypt, which takes a few tens of ms of CPU. The Workers Free
  plan allows 10 ms per request but tolerates occasional spikes; if logins start failing with
  "exceeded CPU", move to Workers Paid.

## Structure

```
client/src/
  api/          fetch wrapper + typed endpoint functions
  components/   PersonSelect
  hooks/        useLoader (fetch + reload)
  lib/          money formatting/parsing, trip context (me + users)
  pages/        Login, Todos, Expenses, Balances
  types/        models (mirrors the server)
server/
  migrations/   SQL schema (shared by local SQLite and D1)
  wrangler.jsonc  Cloudflare Worker + D1 + static assets config
server/src/
  index.ts      local entry (Node + SQLite)
  worker.ts     Cloudflare entry (Workers + D1)
  config/       env loading
  db/           database interface, SQLite + D1 adapters, first-run seed
  routes/       auth, todos, expenses, settlements; /users and /balances in index.ts
  services/     data access + balance / settle-up maths
  middleware/   requireAuth, input validation, errors
  types/        models
```

## API

All routes except `/api/auth/login` and `/api/health` need the session cookie.

```
POST /api/auth/login  POST /api/auth/logout  GET /api/auth/me  POST /api/auth/password
GET  /api/users       GET  /api/balances
GET/POST /api/todos        PATCH/DELETE /api/todos/:id
GET/POST /api/expenses     DELETE /api/expenses/:id
GET/POST /api/settlements  DELETE /api/settlements/:id
```
