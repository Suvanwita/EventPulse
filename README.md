# EventPulse

EventPulse is a full-stack website for a campus event capacity, QR check-in, waitlist, and real-time crowd tracking system.

## Structure

- `frontend/` - Next.js App Router app with Tailwind CSS and dummy data.
- `backend/` - Placeholder Node service for future API work.
- `docker-compose.yml` - Local containers for frontend and backend.

## Run Locally

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000`.

The backend currently has no application logic:

```bash
cd backend
npm install
npm run dev
```

## Docker

```bash
docker compose up
```

