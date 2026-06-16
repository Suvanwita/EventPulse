# EventPulse

EventPulse is a full-stack campus event platform for capacity-aware registrations, waitlists, QR passes, live entry scanning, analytics, and real-time organizer/volunteer dashboards.

## Structure

- `frontend/` - Next.js App Router app.
- `backend/` - Node.js, Express, Prisma, PostgreSQL, Redis, Kafka, Socket.IO API.
- `docker-compose.yml` - Local PostgreSQL, Redis, Kafka/Zookeeper, frontend, and backend services.

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name init_eventpulse_schema
npm run seed
npm run dev
```

The backend runs on `http://localhost:4000` by default.

## Docker

```bash
docker compose up -d postgres redis kafka zookeeper
docker compose up frontend backend
```

PostgreSQL is mapped to host port `5433` to avoid common local conflicts. Inside Docker, services use `postgres:5432`.

## Prisma

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run seed
```

## API Routes

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Venues:
- `POST /api/venues`
- `GET /api/venues`
- `GET /api/venues/:id`
- `PATCH /api/venues/:id`
- `DELETE /api/venues/:id`
- `GET /api/venues/:id/schedule`

Events:
- `POST /api/events`
- `GET /api/events`
- `GET /api/events/:id`
- `PATCH /api/events/:id`
- `DELETE /api/events/:id`

Registrations and waitlist:
- `POST /api/events/:id/register`
- `POST /api/events/:id/cancel`
- `GET /api/events/:id/registration-status`
- `GET /api/events/:id/waitlist`
- `POST /api/events/:id/promote-next`

Passes and check-in:
- `GET /api/events/:id/pass`
- `POST /api/checkin/scan`
- `GET /api/events/:id/checkins`

Analytics:
- `GET /api/analytics/events/:id`
- `GET /api/analytics/venues`
- `GET /api/analytics/checkins`

Health:
- `GET /health`

## Auth Flow

Users register or log in with email/password. Passwords are hashed with `bcryptjs`. Login returns a JWT with:

```json
{
  "userId": "...",
  "role": "STUDENT"
}
```

Protected routes use `Authorization: Bearer <token>`. Public registration can create `STUDENT`, `ORGANIZER`, and `VOLUNTEER`; `ADMIN` cannot be created through public registration.

## Registration Flow

Students register for `OPEN` or `LIVE` events before `registrationDeadline`. Registration uses Redis lock `lock:event:{eventId}:registration` and a Prisma transaction to prevent overbooking. If capacity is available, the system allocates the first available seat and creates a `CONFIRMED` registration.

## Waitlist Flow

If an event is full and waitlist capacity remains, the student receives a `WAITLISTED` registration and a `WaitlistEntry` with the next queue position. Cancelling a confirmed registration releases the seat and promotes the first `WAITING` waitlist entry by `position ASC`.

## QR Check-In Flow

Confirmed students fetch `GET /api/events/:id/pass`. The backend signs a QR payload using HMAC with `JWT_SECRET`, stores only the token hash, and returns a QR image data URL. Volunteers, organizers, and admins scan via `POST /api/checkin/scan`. The scan path uses rate limits, QR token verification, Redis scan locks, and the unique `CheckIn.registrationId` constraint to reject duplicate entry.

## WebSocket Events

Clients join event rooms with:
- `join-event-room`
- `leave-event-room`

Room format:
- `event:{eventId}`

Server emitted events:
- `capacity-updated`
- `registration-updated`
- `waitlist-updated`
- `checkin-updated`
- `entry-rate-updated`
- `no-show-released`

## Redis Usage

Redis is used for:
- registration locks
- QR scan locks
- fixed-window rate limits
- fast live counters:
  - `event:{eventId}:registeredCount`
  - `event:{eventId}:checkedInCount`
  - `event:{eventId}:waitlistCount`

PostgreSQL remains the source of truth. Redis counters can be rebuilt with database sync helpers.

## Kafka Usage

Kafka is used for async streams, not source-of-truth storage. Publish failures are logged and do not crash API requests.

Topics:
- `eventpulse.registration.created`
- `eventpulse.waitlist.joined`
- `eventpulse.waitlist.promoted`
- `eventpulse.registration.cancelled`
- `eventpulse.checkin.completed`
- `eventpulse.security.scan_failed`
- `eventpulse.no_show.released`

## Concurrency And Synchronization

Registration, cancellation, waitlist promotion, no-show release, and QR scans are protected with Redis locks and Prisma transactions. Database unique constraints provide a final safety net for one registration per user/event, one waitlist entry per user/event, and one check-in per registration.

## Workers

Run manually for now:

```bash
cd backend
npm run worker:noshow
npm run worker:analytics
```

`worker:noshow` marks unscanned confirmed registrations as `NO_SHOW` after a grace period, releases seats, promotes waitlisted users, updates counters, and publishes Kafka events.

`worker:analytics` computes aggregate event, venue, and check-in metrics and logs them.

## Demo Credentials

All seeded users use password `password123`.

- `admin@iiita.ac.in` - `ADMIN`
- `organizer@iiita.ac.in` - `ORGANIZER`
- `volunteer@iiita.ac.in` - `VOLUNTEER`
- `student1@iiita.ac.in` - `STUDENT`
- `student2@iiita.ac.in` - `STUDENT`
- `student3@iiita.ac.in` - `STUDENT`
- `student4@iiita.ac.in` - `STUDENT`
- `student5@iiita.ac.in` - `STUDENT`

## Manual Testing Checklist

1. Register/login.
2. Create IIITA venue.
3. Create IIITA event.
4. Detect venue conflict.
5. Register student.
6. Fill event capacity.
7. Move users to waitlist.
8. Cancel confirmed registration.
9. Auto-promote waitlisted user.
10. Generate QR pass.
11. Scan QR.
12. Reject duplicate QR scan.
13. Check live counters.
14. Verify Kafka logs.
15. Run no-show worker.
