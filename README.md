# ⚡Ascend — Developer Skill Intelligence Platform

Ascend is a full-stack web application that measures, tracks, and grows your technical skills using a science-backed decay model. It is built for software developers who want to stay sharp, identify skill gaps, and understand where the job market is heading. Unlike static portfolios or self-reported skill lists, Ascend treats your skills as living assets, they grow when you practise and decay when you don't, giving you an honest, real-time picture of your developer profile.

---

## 🌐 Technology I Used

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| State management | Zustand v5 |
| Server-state / caching | TanStack React Query v5 |
| Code editor | Monaco Editor (`@monaco-editor/react`) |
| In-browser code input | CodeMirror v6 (`@uiw/react-codemirror`) |
| 3D / WebGL animations | Three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` |
| Charts | Recharts |
| Animations | Framer Motion, GSAP |
| UI components | Radix UI (Progress, Tabs), Lucide React icons |
| Toast notifications | Sonner |

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Language | TypeScript 5 |
| Database | MongoDB (via Mongoose 9), PostgreSQL (via Prisma ORM, hosted on Neon |
| Password hashing | Argon2 |
| Authentication | JWT (jsonwebtoken) + HTTP-only cookies |
| Validation | Zod v4 |
| File parsing | pdf-parse, Mammoth (DOCX) |
| Email | Nodemailer |
| File uploads | Multer |
| Logging | Morgan |
| Security headers | Helmet |
| Rate limiting | express-rate-limit |

### 🛠️ Tools & Integrations

| Tool | Purpose |
|---|---|
| Redis (ioredis) | Caching + BullMQ connection |
| BullMQ | Background job queues (decay engine, GitHub scan, liquidity, microtasks) |
| AWS Lambda | Sandboxed code execution (JavaScript & Python) |
| AWS SDK (`@aws-sdk/client-lambda`) | Lambda invocation |
| Google Generative AI (`@google/generative-ai`) | AI-powered question and boost generation |
| GitHub OAuth API | Repository scanning and authentication |
| Three.js GLSL shaders | Custom fluid & particle effects on the landing page |
| tsx | TypeScript execution in development |

---

## 🌟 Features

- **Skill Decay Engine** — Skills lose score over time using an exponential decay formula (`P(t) = P0 × e^(-t/S)`). Each skill has a stability constant that controls how fast it decays. Foundational skills are more stable; frameworks decay faster. A dependency cascade system means that if a parent skill (e.g. JavaScript) decays, its dependent child skills (e.g. React) are also penalised proportionally.

- **Liquidity Score** — A single composite score (0–100) that represents the average health of all your skills. It updates automatically after every decay tick, verification, boost, or skill change, giving you one number that reflects your current developer readiness.

- **GitHub Repository Scanning** — On sign-up with GitHub OAuth, Ascend scans your 25 most recent repositories, inspects dependency files (`package.json`, `requirements.txt`, `pom.xml`), and automatically detects your tech stack. This pre-populates your skill profile without manual entry.

- **Resume Parsing** — Users can upload a PDF or DOCX résumé. The server extracts the text, tokenises it (including compound terms like "Tailwind CSS"), and matches it against the skill catalogue to suggest relevant skills.

- **Skill Verification Tests** — A structured onboarding test and recurring boost tests use a combination of 5 AI-generated MCQs and one compiler challenge to prove proficiency. Tests avoid questions you have seen in the last four weeks.

- **Sandboxed Code Execution** — Code submitted during compiler tests or practice problems is sent to AWS Lambda functions (separate functions for JavaScript and Python). Lambda runs the code in isolation with a 5-second timeout and returns stdout, stderr, and per-test-case results.

- **AI-Powered Verification Feedback** — After a user submits their verification test, Google Gemini analyses their answers and generates personalised, skill-specific feedback. This helps users understand exactly where they went wrong and what to improve, rather than receiving a generic score.

- **Skill Boost System** — After verifying a skill, users can run focused boost sessions (MCQ or compiler) to push the skill score back up. Each boost type grants a fixed score increase (`mcq`, `beginner`, `intermediate`, `advanced`).

- **Practice Problems (LeetCode-style)** — A problems section with difficulty filtering, a Monaco-powered in-browser IDE, dry-run mode, and full submission with test-case-by-test-case feedback. Solving problems updates streak counters and lifetime statistics.

- **Global Leaderboard** — A paginated, multi-mode leaderboard (most problems solved, highest liquidity score, longest streak). Page 1 shows the current user's absolute rank. A Hall of Fame highlights the top 3 streaks. Results are cached in Redis with stale-while-revalidate logic.

- **Market Intelligence** — A live feed of trending skills with demand percentage and open-roles count. Admins update the data; changes are broadcast to all connected clients via Server-Sent Events (SSE), so the dashboard updates in real time without polling.

- **Admin Dashboard** — A separate admin area with charts, user management (block/unblock), question management (create and bulk seed), skill catalogue management (CRUD on skill definitions, stability constants, dependencies), and market intelligence controls.

- **Secure Account Settings** — Users can change their username, email, and password through email-token-verified flows. Each change generates a hashed, time-limited token sent by email and must be confirmed before it takes effect.

---

## 🧩 What Users Can Do

### Regular Users Can:

- Sign up with email/password or GitHub OAuth
- Verify their email address before accessing the platform
- Scan their GitHub repositories to auto-detect their tech stack
- Upload a résumé (PDF or DOCX) to discover skills automatically
- Manually select skills from a curated catalogue and rate their confidence
- Take an initial verification test to confirm their baseline scores
- View a personal dashboard showing liquidity score, skill health (healthy / draining / debt), score history chart, skill debts, and problem-solving stats
- Run boost sessions (MCQ and compiler) to raise decayed skill scores
- Practice coding problems in a Monaco IDE with live execution and test-case feedback
- View the global leaderboard and their own rank
- Track trending skills and market demand in Market Intel
- Change their username, email, and password via secure email-verified flows
- Control notification preferences (decay alerts, weekly reports)

### Admins Can:

- Access a dedicated admin portal (`/admin`)
- View platform-wide stats: total users, active users, skill distribution, new signups over time
- Block or unblock individual user accounts
- Create, edit, and delete questions (MCQ and code) for verification tests
- Bulk seed questions via JSON upload
- Manage the skill catalogue: add new skills, set stability constants, define dependencies between skills, toggle skills active/inactive
- Manage the market intelligence feed: add, update, and delete trending skills with demand metrics
- View chart data across different time periods (weekly, monthly, all-time)

---

## Process / User Flow

1. **Landing & Sign-up** — User visits the landing page and signs up with email/password or continues with GitHub.
2. **Email Verification** — Manual sign-ups receive a verification email with a 24-hour token link. GitHub sign-ups skip this step as GitHub emails are pre-verified.
3. **GitHub Scan (GitHub users)** — After OAuth, the backend pushes a scan job to the `GITHUB_SCAN` BullMQ queue. A worker fetches the user's repositories, parses dependency files, maps package names to skill presets, and stores the detected skills. The frontend polls `/api/auth/scan-status/:jobId` until the job completes.
4. **Skill Discovery** — Users review their auto-detected skills or manually browse the catalogue. They rate their confidence for each skill (which becomes the baseline score) and choose their core language.
5. **Verification Test** — Users take an initial skill test (5 MCQs + 1 coding challenge). Answers are graded; MCQ answers are checked directly, and code is executed on AWS Lambda and validated against test cases. Results boost or confirm the baseline scores.
6. **Score Report** — After the test, users see a score report and are directed to the main dashboard.
7. **Ongoing Usage** — The decay engine (BullMQ cron, every 6 hours) reduces skill scores for all active users automatically. Users return to run boost sessions, solve practice problems, or add new skills. The liquidity score and dashboard update in real time.

---

## 🔌 API Documentation

### Auth APIs (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/auth/github/callback` | Handle GitHub OAuth callback, issue JWT | No |
| POST | `/api/auth/register` | Register with email and password | No |
| POST | `/api/auth/login` | Login with email and password | No |
| GET | `/api/auth/verify-email/:token` | Confirm email verification token | No |
| POST | `/api/auth/logout` | Clear auth cookie | No |
| GET | `/api/auth/me` | Get current authenticated user | Yes |
| GET | `/api/auth/scan-status/:jobId` | Poll GitHub scan job status | Yes |

**Sample — POST `/api/auth/register`**

Request:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "careerGoal": "Fullstack Developer"
}
```

Response:
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "user": {
    "_id": "664a...",
    "username": "john_doe",
    "email": "john@example.com",
    "onboardingStatus": "pending_discovery"
  }
}
```

---

### Skill APIs (`/api/skills`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/skills/catalog` | Get available skill catalogue | Yes |
| POST | `/api/skills/init` | Set initial skills during onboarding | Yes |
| POST | `/api/skills/add` | Add new skills to profile | Yes |
| DELETE | `/api/skills/:skillId` | Remove a skill from profile | Yes |
| GET | `/api/skills/categorized` | Get skills grouped by health status | Yes |
| POST | `/api/skills/boost` | Apply a score boost to a skill | Yes |
| POST | `/api/skills/parse-resume` | Upload résumé and extract skills | Yes |
| GET | `/api/skills/admin/catalog` | Admin: get full skill catalogue | Admin |
| POST | `/api/skills/admin/catalog` | Admin: create a new skill definition | Admin |
| PATCH | `/api/skills/admin/catalog/:skillId` | Admin: update a skill definition | Admin |
| DELETE | `/api/skills/admin/catalog/:skillId` | Admin: delete a skill definition | Admin |

---

### Verification APIs (`/api/verification`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/verification/start` | Generate and start a skill verification test | Yes |
| POST | `/api/verification/submit` | Submit test answers and get results | Yes |
| GET | `/api/verification/boost/generate` | Generate a boost session (MCQ + code) | Yes |
| POST | `/api/verification/boost/mcq/submit` | Submit MCQ boost answers | Yes |
| POST | `/api/verification/boost/compiler/submit` | Submit code boost and run on Lambda | Yes |
| POST | `/api/verification/run-code` | Dry-run code against test cases | Yes |

---

### User APIs (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/users/dashboard` | Get dashboard stats (liquidity, skills, streak) | Yes |
| PATCH | `/api/users/profile` | Update username, career goal, avatar | Yes |
| POST | `/api/users/email-change/request` | Request email change (sends token) | Yes |
| GET | `/api/users/email-change/verify/:token` | Verify email change token | No |
| POST | `/api/users/password-change/request` | Request password change (sends token) | Yes |
| GET | `/api/users/password-change/verify/:token` | Verify password change token | No |
| GET | `/api/users/admin/all` | Admin: list all users | Admin |
| PATCH | `/api/users/admin/status/:userId` | Admin: block or unblock a user | Admin |
| GET | `/api/users/admin/dashboard` | Admin: platform-wide stats | Admin |
| GET | `/api/users/admin/charts` | Admin: chart data by time period | Admin |

---

### Problem APIs (`/api/problems`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/problems` | List all problems (with filters) | Yes |
| GET | `/api/problems/user/stats` | Get current user's problem statistics | Yes |
| GET | `/api/problems/:questionId` | Get a single problem | Yes |
| POST | `/api/problems/:questionId/run` | Dry-run code (no submission) | Yes |
| POST | `/api/problems/:questionId/submit` | Submit solution and record result | Yes |

---

### Leaderboard APIs (`/api/leaderboard`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/leaderboard?mode=solved&page=1` | Get paginated leaderboard with user rank | Yes |

Supported `mode` values: `solved`, `score`, `streak`.

---

### Market APIs (`/api/market`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/market/stream` | SSE stream of trending skill updates | No |
| POST | `/api/market/trending` | Admin: add a trending skill | Admin |
| PUT | `/api/market/trending/:id` | Admin: update a trending skill | Admin |
| DELETE | `/api/market/trending/:id` | Admin: delete a trending skill | Admin |

---

### Admin Question APIs (`/api/admin/questions`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/admin/questions` | Create a single question | Admin |
| POST | `/api/admin/questions/bulk` | Bulk seed questions from JSON array | Admin |

---

## 🗃️ Database Overview

Ascend uses a dual-database architecture: **MongoDB** for flexible, user-centric data, and **PostgreSQL** for the relational Questions module.

### Users

Stores authentication details, profile data, liquidity score history, and notification settings.

Key fields: `authProvider` (github / manual), `githubId`, `password` (select: false), `isEmailVerified`, `onboardingStatus` (pending_scan → pending_discovery → pending_test → completed), `status` (active / blocked), `liquidityScore.current`, `liquidityScore.history[]`, `role` (user / admin), `coreLanguage`, `settings.decayNotifications`.

### Skills

One document per skill per user. Tracks the live score and decay parameters.

Key fields: `userId` (ref: User, indexed), `name`, `category` (Foundational / Framework / Tooling / Language), `currentScore`, `baselineScore`, `stabilityConstant`, `masteryMultiplier`, `lastVerifiedDate`, `verificationMethod`, `dependsOn[]` (ref: SkillDefinition).

### SkillDefinitions

Admin-managed catalogue of available skills. Acts as the source of truth for skill metadata.

Key fields: `name`, `normalizedName` (unique index, lowercase), `category`, `stabilityConstant` (min: 1), `dependsOn[]` (ref: SkillDefinition), `isActive` (indexed).

### Questions

Questions — MCQ and coding questions used for verification and boost sessions. Originally a MongoDB collection, migrated to PostgreSQL to enforce database-level enums/constraints, replace a race-condition-prone regex ID generator with atomic sequence generation, and normalise test cases into a relational table.
Key fields: `questionId` (unique, atomically generated), `skill`, `level` (beginner / intermediate / advanced), `type` (mcq / code), `options[]`, `correctAnswerIndex`, `starterCode`, `validationScript`, `isVerified`.

### QuestionTestCase 

Normalised, relational test cases for coding questions, linked to a Question via a foreign key with cascade delete.

### TestHistory

Tracks which question IDs a user has seen recently. Used to ensure users do not receive the same questions within a 4-week window.

Key fields: `userId` (indexed), `skillName`, `questionIds[]`.

### Submissions

Records every code submission made in the practice problems section.

Key fields: `userId`, `questionId`, `code`, `runtime`, `status` (accepted / wrong_answer / runtime_error / time_limit), `passedCases`, `totalCases`, `executionTimeMs`. Indexes on `{ userId, questionId }`, `{ userId, status }`, and `{ createdAt: -1 }`.

### UserProblemStats

Aggregated problem-solving statistics per user. Updated on each accepted submission.

Key fields: `userId` (unique), `totalSolved`, `easySolved`, `mediumSolved`, `hardSolved`, `totalSubmissions`, `currentStreak`, `longestStreak`, `lastSolvedDate`, `solvedQuestionIds[]`.

### TrendingSkills

Market intelligence data managed by admins and streamed to users in real time.

Key fields: `skillName`, `demandPercentage`, `openRoles`, `parentLanguage`, `history[]` (date, demandPercentage, openRoles).

---

## 🎯 Performance Optimization

**Redis Stale-While-Revalidate Caching** — The `withCache` utility wraps database-heavy queries. It returns the cached value immediately and silently refreshes the cache in the background when the data becomes stale. This is used on the leaderboard, dashboard, and admin chart endpoints to reduce database load.

**Leaderboard Cache Scope** — Page 1 of the leaderboard includes user-specific rank context, so its Redis key is scoped per user (`leaderboard:solved:page1:uid:<id>`). Subsequent pages use a shared key since they contain no user-specific data. This avoids unnecessary per-user cache misses on deep pages.

**In-Memory Skill Definition Map** — The decay engine builds a `Map<id, {normalizedName, stabilityConstant}>` from the SkillDefinition collection and caches it in memory for 15 minutes. This prevents redundant database queries on every decay tick cycle.

**BullMQ Batch Processing** — The decay engine processes users in batches of 50 using cursor-based pagination (`_id > lastId`). This prevents loading the entire user collection into memory during a single decay tick.

**MongoDB Bulk Writes** — During each decay tick, all score updates for a single user's skills are collected into a `bulkWrite` operation instead of individual `save()` calls, reducing round-trips to MongoDB.

**MongoDB Compound Indexes** — The Question collection has a compound index on `{ skill, level }` to accelerate aggregation queries used during test and boost generation. The Submission collection has three targeted indexes for lookup-by-user, status filtering, and reverse-chronological feeds.

**Code Splitting — Lazy Landing Page** — The landing page imports Three.js (≈200 KB) which would slow the initial app bundle load. It is lazy-loaded with `React.lazy` and `Suspense` so the dashboard chunk loads independently.

**Server-Sent Events for Market Data** — Rather than polling the market intelligence endpoint, connected clients receive push updates over a persistent SSE connection when an admin modifies trending skill data. This eliminates repeated polling requests.

**Minimum Drop Threshold** — The decay engine skips writing to the database if a skill's calculated drop is less than 0.1 points, avoiding unnecessary write amplification on skills that are barely changing.

---

## 🔒 Security Features

**Argon2 Password Hashing** — All passwords are hashed with Argon2 (the winner of the Password Hashing Competition) before storage. The password field has `select: false` in the Mongoose schema, so it is never returned in queries unless explicitly requested.

**JWT in HTTP-Only Cookies** — Authentication tokens are stored in HTTP-only cookies set by the server. This prevents JavaScript access to the token and mitigates XSS-based token theft.

**GitHub OAuth Token Flow** — The GitHub OAuth exchange happens server-side. The client receives only the app's own JWT; the GitHub access token is never exposed to the browser beyond the scan job.

**Email-Verified Account Changes** — Email and password changes are not applied immediately. The server generates a SHA-256-hashed, time-limited token (30 minutes), emails it to the user, and only applies the change when the token is verified. This prevents account takeover from a compromised session.

**RBAC (Role-Based Access Control)** — Routes are protected by `authenticate` (JWT validation) and `isAdmin` (role check) middleware. Admin routes are fully separated from user routes and double-gated.

**Three-Tier Rate Limiting** — Three separate rate limiters protect different surface areas: a global limiter (450 req / 15 min) as a safety net; an auth limiter (15 failed attempts / 15 min) to block brute-force attacks; and an abuse limiter (30 req / 15 min) to protect expensive AI and Lambda execution endpoints.

**Helmet Security Headers** — All HTTP responses include security headers via Helmet (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.).

**CORS Strict Origin** — CORS is configured with `credentials: true` and the origin locked to `CLIENT_URL` from environment variables, rejecting requests from unauthorised origins.

**Blocked Account Enforcement** — The `status` field is checked on every login and GitHub OAuth callback. Blocked users receive a 403 before any data is accessed.

**Input Validation with Zod** — All request bodies are validated with Zod schemas on the server before any business logic runs. Validation errors return structured 400 responses.

**Environment Variables for Secrets** — All credentials (JWT secret, GitHub client secret, AWS keys, Gemini API key, database URI) are stored in environment variables and never hardcoded.

---

## 🏗️ How I Built It

### Frontend Architecture

The client is a React 19 single-page application bundled by Vite. Routing is handled by React Router v7 with route-level code splitting. Global auth state lives in a Zustand store (`useAuthStore`), which is the single source of truth for the current user and token. Server state (API data, cache, refetch logic) is managed by TanStack React Query, with query keys centralised in `queryKeys.js`. Axios is wrapped in a configured instance (`api.js`) that attaches the base URL and credentials flag so all services share the same setup.

The UI splits into two layout trees: `DashboardLayout` for authenticated users and `AdminLayout` for admin users. `ProtectedRoute` and `AdminRoute` components guard their respective subtrees by checking the Zustand auth state.

The landing page uses Three.js (`@react-three/fiber` + `@react-three/drei`) with custom GLSL vertex and fragment shaders for fluid and particle animations. This entire chunk is lazy-loaded to keep the app bundle lean.

### Backend Architecture

The server is an Express 5 application written in TypeScript and executed as an ES module. It follows a feature-module structure: each domain (auth, skills, verification, users, problems, leaderboard, market, questions) lives in its own folder with a controller, service, routes, and validation file. Business logic is in services; controllers only extract inputs and call services.

Background work is handled by BullMQ queues backed by Redis. There are four queues: `GITHUB_SCAN`, `SKILL_DECAY`, `LIQUIDITY`, and a `MICROTASK` queue. Each queue has a corresponding worker file that processes jobs asynchronously, completely decoupled from the HTTP request lifecycle.

Code execution is intentionally offloaded to AWS Lambda. The backend invokes the appropriate Lambda function (JavaScript or Python) with the user's code and returns the result. This keeps the main server process safe from arbitrary code execution and resource exhaustion.

### Database Design

MongoDB was chosen for its flexibility with nested score history arrays and varying skill structures. Mongoose provides schema validation and index management at the application layer. Collections follow a reference-based design (`userId` foreign keys) rather than full embedding, keeping documents small and queries targeted.

### API Structure

All routes are prefixed with `/api`. Rate limiting is applied at the route group level rather than globally, giving fine-grained control. Admin routes are mounted under `/api/admin/` and protected by both JWT authentication and an admin role middleware. The health check endpoint (`/health`) sits outside the `/api` prefix for load balancer compatibility.

---

## 💡 What I Learned

**Designing a Decay Algorithm** — Implementing the exponential decay formula `P(t) = P0 × e^(-t/S)` and converting it into an incremental delta-based system (so boosts are not overwritten by ticks) required careful mathematical reasoning. The dependency cascade added another layer: parent skill drops propagate to children at a scaled ratio based on their relative stability constants.

**Background Jobs and Queue Architecture** — Using BullMQ with Redis taught me how to separate long-running work (GitHub scanning, mass decay updates) from the HTTP request cycle. Designing the batch cursor pattern for the decay engine helped me understand how to process large datasets without loading everything into memory.

**Sandboxed Code Execution** — Integrating AWS Lambda for code execution taught me about the security boundaries needed to run untrusted user code, and the practical challenges of timeout handling, runtime routing, and normalising output across different languages.

**Redis Caching Patterns** — Implementing stale-while-revalidate caching from scratch (rather than using a library) deepened my understanding of cache lifetime management, background refresh, and the importance of scoping cache keys correctly to avoid serving wrong data across users.

**OAuth and Secure Auth Flows** — Building both GitHub OAuth and manual email/password flows in the same system clarified the edge cases around account linking, blocked users, email verification enforcement, and the token lifecycle for account settings changes.

**Real-Time Data with SSE** — Using Server-Sent Events for the market intelligence feed was a practical lesson in when SSE is a better fit than WebSockets (one-directional push, simpler infrastructure, HTTP/2 compatible) and how to manage persistent connections on the server.

---

## 📈 How It Can Be Improved

**Testing** — There are currently no automated tests.

**CI/CD Pipeline** — Setting up GitHub Actions to run lint, type-check, and tests on every pull request, and to automate deployment on merges to `main`, would remove manual deployment steps.

**Monitoring and Observability** — Adding structured logging (e.g. Pino), error tracking (e.g. Sentry), and application performance monitoring would make it easier to diagnose issues in production.

**More Languages in the Compiler** — The Lambda executor currently supports JavaScript and Python. Adding Java, Go, and C++ would expand the problem set and make boost tests more relevant for a wider range of developers.

**Advanced Leaderboard Filters** — Adding time-scoped leaderboards (weekly, monthly) and skill-specific rankings would make the competitive features more engaging.

**Skill Recommendation Engine** — Analysing a user's skill debts alongside the market intelligence data to recommend the highest-ROI skills to revive would turn Ascend into a proactive career coach.

**WebSockets for Live Dashboard** — Replacing the current polling approach for the GitHub scan status with WebSockets or SSE would give a cleaner, truly real-time onboarding experience.

**Stripe Integration** — Adding a premium tier with features like deeper analytics, unlimited boosts, or team leaderboards would make Ascend commercially viable.

---

## ▶️ How to Run the Project

### Prerequisites

- Node.js v20+
- MongoDB (local instance or MongoDB Atlas)
- Redis (local instance or Upstash)
- AWS account with two Lambda functions deployed (JavaScript and Python code executors)
- GitHub OAuth App (for GitHub login and scanning)
- Google Gemini API key

### Clone Project

```bash
git clone https://github.com/<your-username>/ascend.git
cd ascend
```

### Backend Setup

```bash
cd server
npm install
```

### Frontend Setup

```bash
cd ../client
npm install
```

### Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Server
PORT=5000
CLIENT_URL=http://localhost:5173

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ascend

# JWT
JWT_SECRET=your_jwt_secret_here

# Redis
REDIS_URL=redis://localhost:6379

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# AWS Lambda (Code Execution)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
LAMBDA_FUNCTION_NAME=ascend-js-executor
LAMBDA_PYTHON_FUNCTION_NAME=ascend-python-executor

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=Ascend <your_email@gmail.com>

# PostgreSQL (Neon)
DATABASE_URL=postgresql://user:pass@host/dbname
```

### Run Development Server

**Backend:**
```bash
cd server
npm run dev
```

**Frontend (in a new terminal):**
```bash
cd client
npm run dev
```

The backend runs on `http://localhost:5000` and the frontend on `http://localhost:5173`.

### Seed the Database (Optional)

```bash
cd server
npm run seed
```

### Build for Production

**Backend:**
```bash
cd server
npm run build
npm start
```

**Frontend:**
```bash
cd client
npm run build
```

---

## 📁 Folder Structure

```
ascend/
├── client/                         # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── admin/              # Admin-specific UI components
│       │   ├── landing/            # Landing page sections + Three.js canvas
│       │   │   └── shaders/        # GLSL vertex & fragment shaders
│       │   ├── skills/             # AddSkills, Boost modals
│       │   └── ui/                 # Shared UI: tabs, progress, dropdowns
│       ├── hooks/                  # Custom React Query hooks (dashboard, leaderboard, problems)
│       ├── layouts/                # DashboardLayout, AdminLayout
│       ├── lib/                    # Query client config, query key constants
│       ├── pages/
│       │   ├── admin/              # Admin pages (Dashboard, Users, Questions, Market, Skills)
│       │   └── *.jsx               # User pages (Dashboard, Problems, Leaderboard, Settings, etc.)
│       ├── services/               # Axios service modules per domain
│       ├── store/                  # Zustand stores (auth, skills, market, admin, UI)
│       └── utils/                  # Icon maps, theme utils, skill editor maps
│
└── server/                         # Express backend (TypeScript)
    └── src/
        ├── config/                 # DB connection, Redis client, email transporter
        ├── jobs/                   # BullMQ job registrations (decay, liquidity, microtask)
        ├── middlewares/            # auth, admin, error, rate limiter, upload, user
        ├── models/                 # Mongoose models (User, Skill, SkillDefinition, Question, etc.)
        ├── modules/
        │   ├── auth/               # GitHub OAuth + manual auth
        │   ├── decay-engine/       # Decay calculation service + constants
        │   ├── leaderboard/        # Leaderboard aggregation + caching
        │   ├── market/             # Trending skills + SSE stream
        │   ├── problems/           # Problem listing, run, submit
        │   ├── questions/          # Admin question management
        │   ├── skills/             # Skill CRUD, boost, resume parser, catalogue
        │   ├── users/              # Dashboard, profile, account settings
        │   └── verification/       # Test generation, submission, Lambda compiler
        ├── queues/                 # BullMQ queue definitions
        ├── scripts/                # Seed scripts, decay test scripts
        ├── seeds/                  # Seed data (questions.json)
        ├── types/                  # Shared TypeScript interfaces
        ├── utils/                  # Cache helper, decay calculator, normaliser, skill constants
        ├── workers/                # BullMQ workers (scan, decay, liquidity, microtask)
        ├── app.ts                  # Express app setup (middlewares, routes)
        └── server.ts               # Entry point (DB connect, job register, listen)
```
