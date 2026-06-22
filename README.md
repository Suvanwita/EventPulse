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

Notifications:
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

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
- `notification-created`
- `notification-read`

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

## In-App Notifications

EventPulse stores per-user notifications for registration confirmations, waitlist joins and promotions, cancellations, check-ins, and crew access changes. Authenticated clients can fetch `/api/notifications`, read the navbar badge count through `/api/notifications/unread-count`, and mark one or all notifications as read. Socket.IO pushes `notification-created` and `notification-read` events to each authenticated user room so the badge and `/notifications` center update live.

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

Fenwick Tree is used for efficient time-range check-in analytics over bucketed event entry data. The optimized time-range path powers `GET /api/analytics/events/:id/time-range` without replacing PostgreSQL as the source of truth.

Trie is used for fast autocomplete across events, venues, zones, and categories.

Graph utilities are used to model venue zones and gate loads, enabling least-crowded gate recommendations and simple crowd-flow routing.

## Event Crew Access

Organizers can assign selected students as event-specific organizers, crew members, performers, speakers, volunteer helpers, or VIP entries. Access is scoped to a single event and does not change the student’s global `STUDENT` role. Each crew access record can specify a special gate and an optional note that volunteers can see during scanning. Crew access updates emit live Socket.IO events to the event room and publish best-effort Kafka stream events.

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

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend environment variables:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

The frontend keeps the futuristic EventPulse spatial operations UI while integrating with the backend APIs. Login and registration store the JWT and user profile in local storage, attach `Authorization: Bearer <token>` to API requests, and update navigation by role.

Integrated pages:
- `/login`
- `/register`
- `/events`
- `/events/[id]`
- `/notifications`
- `/pass/[eventId]`
- `/organizer/dashboard`
- `/organizer/events/new`
- `/organizer/events/[id]`
- `/volunteer/scan`
- `/admin/venues`
- `/admin/analytics`

Role routing:
- `STUDENT` -> `/events`
- `ORGANIZER` -> `/organizer/dashboard`
- `VOLUNTEER` -> `/volunteer/scan`
- `ADMIN` -> `/admin/venues`

Unauthorized users are sent to `/login`. Authenticated users with the wrong role see an access-denied operations panel.

## Frontend Demo Flow

1. Login as `organizer@iiita.ac.in`.
2. Create an event from `/organizer/events/new`.
3. Login as `student1@iiita.ac.in`.
4. Register from `/events/[id]`.
5. Open `/pass/[eventId]` and copy the demo QR token.
6. Login as `volunteer@iiita.ac.in`.
7. Scan the copied token from `/volunteer/scan`.
8. Scan it again to verify duplicate-entry rejection.
9. Login as `admin@iiita.ac.in`.
10. View `/admin/venues` and `/admin/analytics`.
11. Open `/organizer/events/[id]` to watch live capacity and check-in updates.

WebSocket behavior:
- Organizer event control rooms and the volunteer scanner use `socket.io-client`.
- Clients join rooms with `join-event-room` and leave with `leave-event-room`.
- Live events update capacity, registration, waitlist, check-in, entry-rate, and no-show signals.

Common frontend fixes:
- If API calls fail, confirm `NEXT_PUBLIC_API_URL` points to the backend.
- If sockets stay offline, confirm `NEXT_PUBLIC_SOCKET_URL` points to the backend Socket.IO server.
- If protected pages redirect, login again and confirm the demo user has the expected role.
- If QR scan fails, generate a fresh pass because QR tokens are signed and expire at event end time.

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
