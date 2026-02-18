# CNU OJS

Open Journal System starter built with Next.js App Router, Prisma ORM, and Supabase Postgres.

## Stack

- Next.js 16 (App Router)
- React 19
- Prisma ORM
- Supabase Postgres

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment variables

Copy `.env.example` to `.env` and fill values from your Supabase project:

```bash
cp .env.example .env
```

Required keys:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `AUTH_URL`

Supabase tips:

- Use pooled connection string (Transaction mode, port `6543`) for `DATABASE_URL`
- Use direct connection string (Session mode, port `5432`) for `DIRECT_URL`

## 3) Set up database schema

```bash
npm run db:generate
npm run db:migrate -- --name init
```

If you prefer syncing without migrations during early prototyping:

```bash
npm run db:push
```

## 4) Run development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## 5) Seed initial admin account

Set optional values in `.env`:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_NAME`
- `SEED_ADMIN_PASSWORD`

Then run:

```bash
npm run db:seed
```

Login page is available at `http://localhost:3000/login`.

## API Health Check

- `GET /api/health` runs a lightweight `SELECT 1` against your configured Postgres database.
- Returns `200` when DB is connected and `503` when disconnected.

## Prisma Commands

- `npm run db:generate` — generate Prisma Client
- `npm run db:migrate` — run local migration flow
- `npm run db:push` — push schema directly
- `npm run db:studio` — open Prisma Studio
- `npm run db:seed` — seed initial admin account

## Auth + Role Access

- Credentials login via Auth.js at `/login`
- Protected dashboard at `/dashboard`
- Session-backed role display (`ADMIN`, `EDITOR`, `REVIEWER`, `AUTHOR`)
