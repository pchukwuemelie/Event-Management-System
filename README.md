# EventHorizon API – Auth Foundation

Node.js + Express + MongoDB (Mongoose) backend handling user accounts for EventHorizon.
Features: Joi validation, bcrypt password hashing, JWT login, protected routes, and **token-based email verification (no OTP)**.

## Setup

**Prerequisites:** Node.js 18+, a MongoDB instance (local or [Atlas](https://www.mongodb.com/atlas)), and optionally an SMTP account (e.g. Gmail app password, [Mailtrap](https://mailtrap.io)).

```bash
git clone <your-repo-url>
cd eventhorizon-api
npm install
cp .env.example .env     # then edit .env
npm run dev              # or: npm start
```

### Environment variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default `5000`) |
| `MONGO_URI` | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/eventhorizon` |
| `JWT_SECRET` | Long random string used to sign login JWTs |
| `JWT_EXPIRES_IN` | Login token lifetime (default `1d`) |
| `CLIENT_URL` | Base URL used in the email link → `CLIENT_URL/verify-email?token=...` |
| `VERIFICATION_TOKEN_TTL_HOURS` | Verification link lifetime (default `24`) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | SMTP settings. **If `EMAIL_HOST` is empty, the link is printed in the server console** (handy for local testing). |

> **Testing without a frontend:** set `CLIENT_URL=http://localhost:5000/api/auth`. The emailed link then hits the API directly. In production, point `CLIENT_URL` at the frontend, which reads `?token=` and calls `GET /api/auth/verify-email?token=...`.

Gmail: enable 2FA and create an [App Password](https://myaccount.google.com/apppasswords); use it as `EMAIL_PASS`.

## Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account, send verification email |
| GET | `/api/auth/verify-email?token=` | – | Verify email with token from the link |
| POST | `/api/auth/resend-verification` | – | Send a fresh verification link |
| POST | `/api/auth/login` | – | Returns JWT (verified users only) |
| GET | `/api/user/profile` | Bearer JWT | Current user's profile |
| GET | `/health` | – | Health check |

**Register body:** `{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "Passw0rd123" }`
Password rules: 8–72 chars, alphanumeric only, at least one letter and one number.

### Status codes
`201` created · `200` ok · `400` validation error / invalid or expired token · `401` bad credentials or missing/invalid JWT · `403` email not verified · `404` route not found · `409` duplicate email · `429` rate limited · `500` server error

## Email verification flow

1. On register, the server generates `crypto.randomBytes(32)` (64 hex chars) – separate from the login JWT.
2. Only the **SHA-256 hash** of the token and an expiry time are stored on the user document.
3. The raw token is emailed inside the verification link.
4. `GET /api/auth/verify-email` hashes the incoming token, looks for a match that hasn't expired, sets `isVerified = true`, and deletes the token fields (single use).
5. Unverified users get `403` on login, and the `protect` middleware also rejects unverified users (so an old JWT can't bypass verification).

## Security notes
- Passwords hashed with bcrypt (cost 12); `password` is `select: false` and stripped from JSON output.
- JWTs signed with HS256 and verified with an explicit algorithm allow-list.
- Login returns the same error for unknown email / wrong password, with a dummy bcrypt compare to reduce timing differences.
- `helmet`, request body size limit, and rate limiting on `/api/auth/*`.
- Joi strips unknown fields from requests.

## Project structure
```
src/
  config/       env + DB connection
  models/       User schema (hashing, token generation)
  validators/   Joi schemas
  middleware/   validate, auth (JWT), error handler
  controllers/  auth + user logic
  routes/       route definitions
  utils/        ApiError, asyncHandler, email sender
postman/        Postman collection
```

## API testing
Import `postman/EventHorizon.postman_collection.json` into Postman. Run **Register**, copy the link/token from your email (or server console), paste into the `verifyToken` collection variable, run **Verify Email**, then **Login** (the JWT is saved automatically) and **Get Profile**.
