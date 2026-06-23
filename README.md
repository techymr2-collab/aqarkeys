# Aqarkeys

A web app where property managers collect rent and report to owners without spreadsheets. Built for mid market managers running 50 to 500 units across Dubai, the UK, the US, and Canada.

## Stack

- Vite + React + TypeScript (strict mode)
- Tailwind CSS (dark first, blue `#324CE3`, Plus Jakarta Sans, glassmorphism)
- Supabase (auth, Postgres, row level security, storage)
- React Router, TanStack Query, Recharts

## Getting started

Requires **Node 20 LTS** or newer.

```bash
npm install
cp .env.example .env   # fill in your Supabase URL and anon key
npm run dev
```

The app runs at http://localhost:5173.

## Scripts

- `npm run dev` start the dev server
- `npm run build` type check and build for production
- `npm run lint` type check only
- `npm run preview` preview the production build
- `npm run test` run all tests (unit + RLS integration)
- `npm run test:unit` run only the fast unit tests
- `npm run test:watch` watch mode

## Testing

Unit tests cover the pure logic (money/date formatting, the `friendlyError`
helper, and invoice-period generation). An integration harness in
[tests/rls.test.ts](tests/rls.test.ts) signs in as the seeded manager, owner,
and tenant and asserts row level security isolation (an owner cannot see other
owners' data, a tenant only sees their own unit/lease/invoices, neither can
write where they shouldn't). The RLS tests require the demo seed
(`node --env-file=.env scripts/seed.mjs`) and the `.env` credentials.

## Database and demo data

SQL lives in `supabase/migrations` and is applied with the helper runner (needs
`SUPABASE_DB_URL` in `.env`):

```bash
node --env-file=.env scripts/run-sql.mjs supabase/migrations/0001_schema.sql supabase/migrations/0002_rls.sql supabase/migrations/0003_rls_fix.sql
```

Seed a realistic demo portfolio (3 properties across AED/GBP/CAD, ~30 units,
leases, invoices, expenses). Idempotent: it resets the demo org each run.

```bash
node --env-file=.env scripts/seed.mjs
```

### Demo logins (password `Passw0rd!23`)

- `manager@frontbits.test` full access
- `owner@frontbits.test` owns two properties (AED and CAD)
- `tenant@frontbits.test` leases a Marina Heights unit

### Self serve signup

Visit `/signup` to create a new agency. The `handle_new_user` trigger creates a
fresh organization and makes the signer up its manager, isolated from every
other org by row level security. The project requires email confirmation, so
new managers confirm by email before their first sign in. To make demos
frictionless, enable autoconfirm in Supabase under Authentication, Providers,
Email.

### Inviting owners and tenants

From the Owners or Tenants pages a manager can invite a record to a read only
portal. This creates an `invitations` row and a shareable link. When the
invitee accepts (`/accept-invite?token=...`) and signs up, `handle_new_user`
reads the invitation to set their org and role server side (never trusting
client metadata) and links their account to the owner or tenant record. The
built in mailer is rate limited, so heavy testing can hit an email limit; the
trigger logic is identical whether the account is created by signup or the
admin API.

## Status

Phase 1 complete: auth and roles, properties and units, tenants and leases,
rent and invoicing, manager and owner dashboards, and the tenant portal, all
enforced with row level security.
