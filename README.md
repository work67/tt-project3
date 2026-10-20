# Bali Trip 🌴

A shared to-do list and expense splitter for a ten-person trip. Everyone logs in, ticks off
trip prep, logs what they paid for, and sees who owes whom. See [PLAN.md](PLAN.md) for the
trip, the ten people, and the design decisions.

Stack: **React + Vite** frontend, **Express** backend, **SQLite** (built into Node 22) database,
all TypeScript, managed as npm workspaces.

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
with fresh seed data, stop the dev server and run `npm run reset-db -w server`
(**this deletes all trip data**).

Changed `SEED_PASSWORD` after the database already exists? Run
`npm run reset-passwords -w server` to apply it to all ten accounts (this also logs everyone out).

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

## Structure

```
client/src/
  api/          fetch wrapper + typed endpoint functions
  components/   PersonSelect
  hooks/        useLoader (fetch + reload)
  lib/          money formatting/parsing, trip context (me + users)
  pages/        Login, Todos, Expenses, Balances
  types/        models (mirrors the server)
server/src/
  config/       env loading
  db/           SQLite schema + first-run seed
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
