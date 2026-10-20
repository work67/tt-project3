# Trip Planner — Plan

A shared to-do list and expense splitter for one group trip with ten people.

## The trip

**Bali villa trip, 5 days.** Ten friends share one villa in Canggu. They fly in separately
and spend most days together: a surf lesson, a snorkeling boat to Nusa Penida, scooter rentals,
a sunrise hike up Mount Batur, and group dinners. Groceries and the villa are shared.

## The ten people

| Username | Name  | Role on the trip                          |
| -------- | ----- | ----------------------------------------- |
| alex     | Alex  | Organizer: booked the villa               |
| priya    | Priya | Activities: surf lesson and boat trip     |
| ben      | Ben   | Transport: airport transfers and scooters |
| mei      | Mei   | Food: groceries and dinner reservations   |
| diego    | Diego | Photographer; brings the drone            |
| sara     | Sara  | First aid kit and travel insurance        |
| kofi     | Kofi  | Mount Batur hike guide booking            |
| hana     | Hana  | Packing list and shared supplies          |
| liam     | Liam  | Joins for the last 3 days only            |
| zoe      | Zoe   | Treasurer: keeps an eye on who owes what  |

Not everyone joins every activity (e.g. Liam misses the boat trip), so expenses split
only among the people who took part.

## Features

1. **Login**: each of the ten people has an account (seeded). Username and password, session cookie.
   Everyone must pick their own password on first login; failed logins are rate-limited.
2. **To-dos**: title, optional notes, optional assignee, optional due date, done/undone.
   Anyone can add, assign, complete, or delete.
3. **Expenses**: description, amount, who paid, and who it's split between (equal split,
   leftover cents spread one per person).
4. **Balances**: each person's net balance plus a minimal "X pays Y $Z" settle-up list.
5. **Settlements**: record a repayment ("Ben paid Alex $40") so balances update.

## Tech decisions

- **Database: SQLite via `node:sqlite`** (built into Node 22): one file (`server/data/trip.db`),
  zero install, no native build.
- **Auth: sessions table + httpOnly cookie**. Passwords hashed with Node's built-in `scrypt`.
- Money stored as integer **cents** to avoid floating-point errors.
- Single trip: no multi-trip support needed for ten people.

## Data model

```
users(id, username, display_name, password_hash, must_change_password)
sessions(token, user_id, expires_at)
todos(id, title, notes, assignee_id?, due_date?, done, created_by, created_at)
expenses(id, description, amount_cents, paid_by, created_by, created_at)
expense_shares(expense_id, user_id, share_cents)
settlements(id, from_user_id, to_user_id, amount_cents, created_at)
login_attempts(key, failures, window_start, locked_until)
```

## API

```
POST /api/auth/login   POST /api/auth/logout   GET /api/auth/me   POST /api/auth/password
GET  /api/users
GET/POST /api/todos    PATCH/DELETE /api/todos/:id
GET/POST /api/expenses DELETE /api/expenses/:id
GET/POST /api/settlements
GET  /api/balances
```
