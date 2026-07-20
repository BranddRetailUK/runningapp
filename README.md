# Runline

Runline is a private treadmill analytics dashboard. It turns a Technogym workout-summary screenshot into reviewed, structured run data and charts distance, pace, calories, duration, and consistency over time.

## How imports work

1. Upload a PNG, JPEG, or WebP screenshot from the dashboard.
2. The server sends the in-memory image to the configured OpenAI vision model and receives schema-validated summary values.
3. Review the extracted values and confirm the workout date. The date defaults to the current calendar day in `Europe/London` because Technogym screenshots do not contain the workout date.
4. Save the structured values to PostgreSQL.

The source screenshot is not stored. Only the reviewed metrics, extraction metadata, and a SHA-256 fingerprint used to prevent duplicate imports are persisted.

## Local setup

Requirements: Node.js 20.9 or newer and PostgreSQL.

Populate the ignored `.env` file with:

- `DATABASE_URL`: PostgreSQL connection string.
- `OPENAI_API_KEY`: API key used only by the server-side screenshot parser.
- `OPENAI_MODEL`: vision-capable extraction model; defaults to `gpt-5.6-luna`.
- `APP_USERNAME` and `APP_PASSWORD`: HTTP Basic Auth credentials for the dashboard and API.
- `MAX_UPLOAD_BYTES`: optional upload ceiling; defaults to 12 MB.

Install dependencies with `npm install`, then use `npm run dev`. `npm run check` runs linting, TypeScript checks, tests, and a production build.

## Railway deployment

The repository includes Railway build, start, restart, and health-check configuration. Provision a PostgreSQL service and set the app service's `DATABASE_URL` to the database service reference. Set the remaining variables listed above on the app service.

`/api/health` is intentionally public so Railway can perform deployment health checks. Every dashboard page and data API is protected by HTTP Basic Auth. Use a generated Railway HTTPS domain for browser access; Railway's internal private domain is only reachable by other services in the project.

The `runs` schema is created idempotently on first database access. The equivalent SQL is retained in `migrations/001_initial.sql` for inspection and manual administration.
