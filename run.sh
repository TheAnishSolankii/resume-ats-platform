#!/usr/bin/env bash
# ── ResumeIQ Helper Scripts ───────────────────────────────────────────────────
set -euo pipefail

CMD=${1:-help}

case "$CMD" in

  setup)
    echo "⚙  Setting up ResumeIQ..."
    [ -f .env ] || (cp .env.example .env && echo "📝 Created .env — fill in your API keys before continuing")
    echo "✅ Done. Run: ./run.sh dev"
    ;;

  dev)
    echo "🚀 Starting development stack..."
    docker compose up db redis -d
    echo "🗄  Database and Redis ready"
    echo "👉 Backend: cd backend && uvicorn main:app --reload"
    echo "👉 Frontend: cd frontend && npm run dev"
    ;;

  start)
    echo "🚀 Starting full stack..."
    docker compose up --build -d
    echo "✅ ResumeIQ running at http://localhost"
    echo "   API: http://localhost:8000"
    echo "   Metrics: http://localhost:8000/metrics"
    ;;

  stop)
    docker compose down
    echo "🛑 Stopped"
    ;;

  migrate)
    echo "🗄  Running migrations..."
    docker compose exec api alembic upgrade head
    echo "✅ Migrations applied"
    ;;

  migrate-new)
    MSG=${2:-"auto migration"}
    docker compose exec api alembic revision --autogenerate -m "$MSG"
    echo "✅ New migration created"
    ;;

  logs)
    SVC=${2:-api}
    docker compose logs -f "$SVC"
    ;;

  shell)
    docker compose exec api python -c "
from core.database import SessionLocal
from models.user import User
db = SessionLocal()
print('Users:', db.query(User).count())
db.close()
"
    ;;

  stripe-listen)
    echo "📡 Listening for Stripe webhooks..."
    stripe listen --forward-to localhost:8000/api/billing/webhook
    ;;

  reset-db)
    read -p "⚠  This will DELETE all data. Continue? [y/N] " yn
    [[ "$yn" == "y" ]] || exit 0
    docker compose down -v
    docker compose up db -d
    sleep 3
    docker compose exec api alembic upgrade head
    echo "✅ Database reset"
    ;;

  help|*)
    echo "ResumeIQ CLI"
    echo ""
    echo "Usage: ./run.sh <command>"
    echo ""
    echo "Commands:"
    echo "  setup          Copy .env.example → .env"
    echo "  dev            Start DB+Redis for local development"
    echo "  start          Start full Docker stack"
    echo "  stop           Stop all containers"
    echo "  migrate        Apply pending DB migrations"
    echo "  migrate-new    Create a new migration"
    echo "  logs [svc]     Tail logs (default: api)"
    echo "  shell          Open Python DB shell"
    echo "  stripe-listen  Forward Stripe webhooks locally"
    echo "  reset-db       ⚠ Wipe and recreate database"
    ;;
esac
