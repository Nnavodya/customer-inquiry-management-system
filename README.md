# Customer Inquiry Management System

A full-stack internal support workspace for Coffee Ninja staff. A staff member signs in and records an inquiry on behalf of a customer who contacted the business by phone or email. Staff can then find and manage the inquiry, assign it to a colleague, and move it through its status lifecycle. Customers do not sign in to or submit inquiries directly through this application.

## Technology

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express 5
- **Database:** PostgreSQL with `pg` and parameterized SQL
- **Authentication:** JWT in an HTTP-only, `SameSite=Lax` cookie
- **Tests:** Node.js built-in test runner; Vitest and React Testing Library

## Features

- Staff sign-in with seeded employee and administrator accounts; there is no public registration or customer-facing submission portal.
- Record a customer's inquiry as the signed-in staff member, including customer name, contact information, subject, and description. The API validates required fields and rejects a matching unresolved inquiry submitted in the previous 10 minutes.
- Admins can view and manage all inquiries. Employees can view and manage inquiries they created or that are assigned to them. The API enforces these rules on list, detail, edit, status, and assignment routes.
- Search inquiries by customer, contact, subject, or description; filter by status and assigned staff member.
- Assign or unassign an inquiry to a staff member. The staff list is ordered by active workload, and the create form suggests the least-loaded member. This is a workload-based suggestion, not an automatic assignment guarantee.
- Admins can view Team Profiles with active, resolved, and total assigned inquiry counts, and filter the queue from a profile.
- Edit customer-provided inquiry details from the queue.
- Move inquiries through `New`, `In Progress`, and `Resolved`. Reopening a resolved inquiry requires confirmation in the UI; the API rejects a direct transition from `Resolved` to `New`.
- Detail edits require the timestamp the UI last received. The API returns `409 Conflict` if that timestamp differs from the stored timestamp by more than one second when it checks, helping catch stale edits. Status updates send the timestamp too, but the API only checks it when provided. Both checks read the timestamp before issuing a separate update, so they are not atomic and a narrow race remains; timestamps within one second are treated as matching. See [DECISIONS.md](./DECISIONS.md).

## Assignment workflow and scope

The app implements the internal staff workflow described in the assignment: staff record customer inquiries and can assign them for follow-up. Creator attribution supports access after handoff. The app shows current status and last-updated time, but has no activity history, customer portal, automatic real-time sync, or pagination. See [DECISIONS.md](./DECISIONS.md) for the design rationale and limitations.

## Requirements

- Node.js **20.9 or later** (required by Next.js 16)
- npm
- PostgreSQL

## Local setup

### 1. Create a PostgreSQL database

For example, using the PostgreSQL command-line tools:

```bash
createdb -U postgres coffee_ninja
```

Or connect to PostgreSQL and run:

```sql
CREATE DATABASE coffee_ninja;
```

### 2. Configure the backend

Copy `backend/.env.example` to `backend/.env` and set the PostgreSQL password and a private random JWT secret. Keep `.env` local; do not commit it.

The example configuration uses:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=postgres
PGPASSWORD=YOUR_LOCAL_POSTGRES_PASSWORD
PGDATABASE=coffee_ninja
JWT_SECRET=REPLACE_WITH_A_RANDOM_SECRET
```

### 3. Install dependencies, create the schema, and seed data

From the repository root:

```bash
cd backend
npm install
npm run seed
```

For a fresh local database, `npm run seed` creates/updates the tables and the seeded `staff1`, `staff2`, and `admin` accounts, and inserts three sample inquiries if the inquiry table is empty. Running it again resets the passwords of those three seeded accounts to `Password123!`; it does not reset passwords for other staff accounts. It skips sample inquiries when the table already contains records.

Alternatively, for a fresh database, apply the SQL files once in this order:

```bash
psql -U postgres -d coffee_ninja -f database/schema.sql
psql -U postgres -d coffee_ninja -f database/seed.sql
```

The SQL setup creates the same initial staff accounts and three sample inquiries. Unlike `npm run seed`, rerunning `database/seed.sql` does not reset passwords for existing seeded accounts and may insert duplicate sample inquiries. For repeatable setup or existing local data, prefer `npm run seed`.

### 4. Start the backend and frontend

Run the backend in one terminal:

```bash
cd backend
npm run dev
```

Run the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API listens at [http://localhost:5000](http://localhost:5000).

## Seeded test accounts

| Username | Password | Name |
| --- | --- | --- |
| `staff1` | `Password123!` | Sarah Perera |
| `staff2` | `Password123!` | Kasun Silva |
| `admin` | `Password123!` | System Administrator |

These are local assessment accounts. Change or replace the default credentials and JWT secret before using the app outside local development.

## API overview

Protected routes require a valid sign-in cookie.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check API/database connectivity |
| `POST` | `/api/auth/login` | Sign in |
| `GET` | `/api/auth/me` | Get the current staff session |
| `POST` | `/api/auth/logout` | Sign out |
| `GET` | `/api/staff` | List staff with workload counts |
| `GET` | `/api/inquiries` | List, search, and filter inquiries |
| `POST` | `/api/inquiries` | Create an inquiry |
| `GET` | `/api/inquiries/:id` | Get inquiry details |
| `PUT` | `/api/inquiries/:id` | Edit customer-provided inquiry details |
| `PATCH` | `/api/inquiries/:id/status` | Update inquiry status |
| `PATCH` | `/api/inquiries/:id/assign` | Assign or unassign staff |

## Tests and checks

Latest local verification: Backend tests: **16 passed**. Frontend tests: **7 passed**. The frontend production build and lint checks also completed successfully. These results reflect local verification; the tests do not cover the complete PostgreSQL-backed inquiry workflow or browser-based end-to-end scenarios.

Run backend tests:

```bash
cd backend
npm test
```

The backend tests cover rejection of unauthenticated requests and invalid tokens, admin/employee inquiry-list scope, employee detail/edit/status/assignment denial for inaccessible inquiries, creator attribution on inquiry creation, malformed inquiry IDs, missing required fields, and invalid edit requests. Many route tests use a database query stub; these tests do not prove complete PostgreSQL-backed create/edit/status workflows.

Run frontend tests:

```bash
cd frontend
npm test
```

The frontend tests cover sidebar navigation, sign-out action, and header rendering. They do not currently cover inquiry form submission, editing, or browser-based end-to-end workflows.

Run the production build and lint:

```bash
cd frontend
npm run build
npm run lint
```

## Decisions and limitations

See [DECISIONS.md](./DECISIONS.md) for design choices, trade-offs, and known gaps. Key limitations:

- Timestamp checks are not atomic; the status check is optional at the API. This is not real-time synchronization.
- Full database-backed inquiry workflow tests and browser-based end-to-end tests are not yet included.
- The frontend currently calls the local API at `http://localhost:5000/api`; update its `API_URL` when running the app against another backend address.
