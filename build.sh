#!/usr/bin/env bash
# Build script — runs on Render before start command
set -e

echo "──────────────────────────────────────"
echo "  ResumeIQ Build Script"
echo "──────────────────────────────────────"

# ── 1. Install frontend deps & build ─────────────────────────────────────────
echo "📦 Installing frontend dependencies..."
cd frontend
npm install --legacy-peer-deps

echo "⚛️  Building React app..."
npm run build

# ── 2. Copy build to backend/static ──────────────────────────────────────────
echo "📁 Copying build to backend/static..."
cd ..
rm -rf backend/static
mkdir -p backend/static
cp -r frontend/dist/* backend/static/

# ── 3. Install Python deps ────────────────────────────────────────────────────
echo "🐍 Installing Python dependencies..."
cd backend
pip install -r requirements.txt

# ── 4. Run DB migrations ──────────────────────────────────────────────────────
echo "🗄️  Running database migrations..."
alembic upgrade head || echo "⚠️  Migration warning (may be first run)"

echo "✅ Build complete!"
