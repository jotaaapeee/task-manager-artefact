# Task Manager

A small task manager built with Next.js (App Router), tRPC and React Query. Tasks live in memory: create, list, edit and delete them, with the list rendered on the server and loaded further with infinite scroll.

Built with AI assistance. I reviewed and can explain every decision.

## Getting started

Requires Node.js 20 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000. The store starts with 25 sample tasks and resets when the server restarts.

Other scripts:

```bash
npm run build && npm start   # production build
npm run lint
```

## Stack

- Next.js 15 (App Router, TypeScript), React 19
- tRPC v11 with @tanstack/react-query v5
- Zod v4 for input validation
- Plain CSS (global styles plus CSS modules), no UI library

## Features

- **List** with server-side rendering: the first page arrives in the HTML.
- **Infinite scroll** that loads 10 tasks at a time.
- **Delete** from the list, with a loading state per row and a success or error message.
- **Create and edit** with one shared form, front-end validation (an empty title blocks the submit) and backend error messages.
- **Meaningful errors**: an empty title returns `400 Title is required`; editing or deleting a missing task returns `404 Task "<id>" not found`; a missing task on the edit page renders a 404 page.

## Project structure

```
src/
├── app/
│   ├── api/trpc/[trpc]/route.ts   # tRPC HTTP endpoint (GET for queries, POST for mutations)
│   ├── layout.tsx                 # root layout, wraps the app in the tRPC provider
│   ├── page.tsx                   # task list (Server Component, SSR)
│   └── tasks/
│       ├── new/page.tsx           # create page
│       └── [id]/edit/
│           ├── page.tsx           # edit page, loads the task on the server
│           └── not-found.tsx      # 404 for a missing task
├── components/
│   ├── TaskList.tsx               # list, delete and infinite scroll (Client Component)
│   └── TaskForm.tsx               # create/edit form (Client Component)
├── server/
│   ├── trpc.ts                    # tRPC init and error formatting
│   ├── store.ts                   # in-memory task store
│   └── routers/
│       ├── _app.ts                # root router and AppRouter type
│       └── task.ts                # task CRUD procedures
└── trpc/
    ├── client.tsx                 # typed React hooks and provider
    └── server.ts                  # server caller for Server Components
```

## How it works

- **Reading on the server.** Server Components call the router directly through `createCaller` (`src/trpc/server.ts`). There is no HTTP request to our own API, but input validation and errors are the same as over HTTP.
- **Handing off to the client.** The list page fetches the first page and passes it to `TaskList`, which uses it as `initialData` for `useInfiniteQuery`. The first client render matches the server HTML, and no request is made on load.
- **Writing from the client.** Mutations go through the typed hooks over `/api/trpc`. After a mutation the list query is invalidated, so it refetches from the server instead of being patched by hand.
- **Types end to end.** The client imports only the `AppRouter` type, so inputs and outputs are typed in the components without any server code in the browser bundle.

## Decisions and trade-offs

- **In-memory store on `globalThis`.** The task `Map` is kept on `globalThis` so it survives dev hot reloads, which re-evaluate modules. Data is lost on restart and is not shared across server instances, which is fine for this challenge. A real app would use a database.
- **Timestamp as a number.** `dataCriacao` is a Unix timestamp in ms. It goes through JSON as is, so no transformer like superjson is needed, and it sorts as a number.
- **Offset cursor.** `list` takes `{ limit, cursor }`, where the cursor is the index of the first item. It is simple and fits an in-memory array. The downside: if a task is deleted while you scroll, the following page can shift by one item. A keyset cursor (`dataCriacao` + `id`) would avoid that.
- **`force-dynamic` on the list page.** The server caller is a plain function call, so Next cannot tell the page depends on changing data. Without this, `next build` would prerender the list once.
- **`initialData` instead of hydrating the cache.** This is simpler than dehydrating a server QueryClient. The catch: `initialData` is only used when the cache is empty. When you navigate back to the list, the client shows its cached pages (refetching if they are older than 30 s) rather than the fresh server page.
- **Invalidate, not optimistic updates.** After a delete or save, the list refetches. It costs one request but always matches the server, and it is less code.
- **Dates in UTC.** Dates are formatted with a fixed locale and time zone. The server and the browser can be in different time zones, and different text on each side would cause a hydration mismatch. The trade-off is that users see UTC rather than their local time.
- **Validation on both sides.** The form checks for an empty title to give instant feedback. The Zod schema on the server is the real rule, since the API can be called directly.
- **Field names from the spec.** `titulo`, `descricao` and `dataCriacao` match the challenge's data model. Everything else is in English.
