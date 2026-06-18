# ResumeIQ — AI-Powered ATS Optimization Platform

A production-ready SaaS platform for AI-driven resume analysis, ATS scoring, and career optimization.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| AI | OpenAI GPT-4o / Claude API |
| Payments | Stripe |
| Proxy | Nginx |
| Containers | Docker + Docker Compose |

---

## Features

- **ATS Score Generation** — Simulate real ATS screening with a 0–100 score and letter grade
- **Keyword Analysis** — Found vs. missing keyword detection with visual diff
- **Section Scoring** — Granular scores for Formatting, Keywords, Experience, Education, Skills
- **AI Resume Rewriting** — GPT-4o rewrites your resume to maximize ATS performance
- **Job Description Matching** — Paste a JD to get a targeted match score
- **Interview Question Generation** — 15 tailored questions (Behavioral / Technical / Situational / Culture)
- **PDF Export** — One-click browser print to PDF
- **Authentication** — JWT access + refresh tokens, session management
- **Dashboard** — Stats, recent analyses, quick actions
- **Resume History** — Full history with re-analysis support
- **Admin Panel** — User management, platform stats, revenue estimates
- **Stripe Subscriptions** — Free / Pro ($19) / Enterprise ($49) with webhook handling

---

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/yourname/resumeiq
cd resumeiq
cp .env.example .env
# Edit .env — fill in SECRET_KEY, OPENAI_API_KEY, STRIPE keys
```

### 2. Run with Docker

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs (DEBUG=true only) |
| Metrics | http://localhost:8000/metrics |

---

## Backend API

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get tokens |
| POST | `/api/auth/refresh` | Rotate refresh token |
| POST | `/api/auth/logout` | Revoke session |
| GET | `/api/auth/me` | Current user |

### Resumes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resumes/` | List all resumes |
| POST | `/api/resumes/` | Create from text |
| POST | `/api/resumes/upload` | Upload PDF/TXT |
| GET | `/api/resumes/{id}` | Get with full analysis |
| POST | `/api/resumes/{id}/analyze` | Re-run analysis |
| POST | `/api/resumes/{id}/rewrite` | AI rewrite |
| POST | `/api/resumes/{id}/interview-questions` | Generate questions |
| DELETE | `/api/resumes/{id}` | Delete |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/billing/checkout` | Create Stripe checkout |
| POST | `/api/billing/portal` | Customer billing portal |
| POST | `/api/billing/cancel` | Cancel subscription |
| POST | `/api/billing/webhook` | Stripe webhook handler |

### Admin (admin role required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform metrics |
| GET | `/api/admin/users` | Paginated user list |
| PATCH | `/api/admin/users/{id}` | Update user role/plan |
| DELETE | `/api/admin/users/{id}` | Delete user |

---

## Stripe Setup

1. Create products in Stripe Dashboard
2. Copy price IDs to `.env`:
   ```
   STRIPE_PRICE_PRO=price_xxx
   STRIPE_PRICE_ENTERPRISE=price_xxx
   ```
3. Set up webhook endpoint: `https://yourdomain.com/api/billing/webhook`
4. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`

---

## Subscription Limits

| Plan | Monthly Analyses | AI Rewrite | Interview Prep |
|------|-----------------|------------|----------------|
| Free | 3 | ✗ | ✗ |
| Pro | 100 | ✓ | ✓ |
| Enterprise | Unlimited | ✓ | ✓ |

---

## Environment Variables

See `.env.example` for full reference. Required:

```env
SECRET_KEY=<random 32+ chars>
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Production Checklist

- [ ] Set `DEBUG=false`
- [ ] Use strong `SECRET_KEY` (32+ chars, random)
- [ ] Configure SSL in `docker/nginx.conf`
- [ ] Set `ALLOWED_ORIGINS` to your domain
- [ ] Enable Postgres backups
- [ ] Set up monitoring (Prometheus/Grafana — `/metrics` is pre-exposed)
- [ ] Configure rate limiting (built-in via `slowapi`)
- [ ] Set up log aggregation

---

## Development

```bash
# Backend only
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend only
cd frontend
npm install
npm run dev
```

---

## License

MIT — build freely, deploy commercially.
