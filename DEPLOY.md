# 🚀 Deploy ResumeIQ — GitHub + Render Guide

## Step 1 — GitHub Setup (Mac terminal se karo)

```bash
# 1. Project folder mein jao
cd path/to/resume-ats

# 2. Git initialize karo
git init

# 3. Pehli commit karo
git add .
git commit -m "feat: initial ResumeIQ commit — Gemini-powered ATS platform"

# 4. GitHub par naya repo banao (github.com → New Repository)
# Name: resume-ats-platform
# Visibility: Public (portfolio ke liye)
# README: NO (already hai hamare paas)

# 5. Remote add karo (apna username daalo)
git remote add origin https://github.com/TheAnishSolankii/resume-ats-platform.git

# 6. Push karo
git branch -M main
git push -u origin main
```

---

## Step 2 — Gemini API Key Lo (Free hai!)

1. **aistudio.google.com** → Sign in with Google
2. **Get API Key** → Create API Key
3. Copy karo → `AIzaSy...` wala key

---

## Step 3 — Render Deploy

### Option A — Automatic (render.yaml se)
1. **render.com** → Sign up (GitHub se)
2. **New** → **Blueprint**
3. Connect your GitHub repo: `resume-ats-platform`
4. Render automatically `render.yaml` detect karega
5. Click **Apply**

### Option B — Manual (zyada control)
1. **render.com** → New → **Web Service**
2. Connect GitHub repo
3. Fill in:
   - **Name:** `resumeiq-api`
   - **Root Directory:** ` ` (blank, root se)
   - **Build Command:** `./build.sh`
   - **Start Command:** `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free

4. **Environment Variables** add karo:
   | Key | Value |
   |-----|-------|
   | `GEMINI_API_KEY` | `AIzaSy...` (tumhara key) |
   | `GEMINI_MODEL` | `gemini-1.5-flash` |
   | `SECRET_KEY` | koi bhi random 32+ char string |
   | `DATABASE_URL` | Render dega automatically |
   | `DEBUG` | `false` |

5. **Add Database:**
   - New → **PostgreSQL**
   - Name: `resumeiq-db`
   - Plan: Free
   - `DATABASE_URL` automatically link ho jayega

6. **Deploy** → Wait 3-5 minutes

---

## Step 4 — Live URL

Deploy hone ke baad milega:
```
https://resumeiq-api.onrender.com
```

Yahi tumhara live portfolio project hai! 🎉

---

## Resume Mein Kaise Add Karo

```
Projects
─────────────────────────────────────────────────────
ResumeIQ — AI-Powered ATS Resume Optimization Platform
• Built full-stack SaaS with React + FastAPI + PostgreSQL + Google Gemini API
• Features: ATS scoring, keyword analysis, AI resume rewriting, interview prep
• Implemented JWT authentication, role-based access control, Stripe-ready billing
• Deployed on Render with automated CI/CD via GitHub
• Tech: Python, FastAPI, React, PostgreSQL, Google Gemini, Docker, Alembic
• Live: https://resumeiq-api.onrender.com | GitHub: github.com/TheAnishSolankii/resume-ats-platform
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails | Check `build.sh` has execute permission: `chmod +x build.sh` |
| `GEMINI_API_KEY` error | Render dashboard → Environment → Add the key |
| DB connection error | Make sure PostgreSQL service is created and linked |
| Frontend shows blank | Check `backend/static/` folder has `index.html` after build |
| Free tier sleeps | Normal — first request after 15min takes ~30s to wake up |

---

## Local Development (Mac)

```bash
# Terminal 1 — Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # fill in GEMINI_API_KEY
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev   # opens localhost:3000
```
