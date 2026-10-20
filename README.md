# Project 3

Full-stack TypeScript app: **React + Vite** frontend, **Express** backend, managed as npm workspaces.

## Getting started

```bash
npm install
cp server/.env.example server/.env   # if server/.env doesn't exist
npm run dev                          # client on :5173, server on :3001
```

The Vite dev server forwards `/api/*` to Express, so the client calls `/api/...` with no CORS setup needed in development.

## Scripts (run from root)

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Run client and server in watch mode   |
| `npm run build`     | Build both to their `dist/` folders   |
| `npm start`         | Run the built server                  |
| `npm run typecheck` | Type-check both workspaces            |

## Structure

```
client/src/
  api/          fetch wrapper + one module per resource
  components/   reusable UI pieces
  hooks/        data-fetching / stateful hooks
  pages/        top-level views
  types/        shared TS types
server/src/
  config/       env loading
  routes/       URL → controller mapping
  controllers/  request/response handling, validation
  services/     business logic and data access
  middleware/   error handling, 404, etc.
  types/        shared TS types
```

To add a resource: create `types/`, `services/`, `controllers/` and `routes/` files on the server, mount the router in `routes/index.ts`, then add a matching `api/` module on the client.
