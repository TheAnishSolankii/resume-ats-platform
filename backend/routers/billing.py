from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from core.database import get_db
from core.auth import get_current_user
from core.config import settings
from models.user import User, SubscriptionPlan, StripeEvent
from schemas import CheckoutRequest, CheckoutResponse
from services.stripe_service import (
    create_checkout_session,
    cancel_subscription,
    get_customer_portal,
    construct_webhook_event,
    get_plan_from_price_id,
)

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = await create_checkout_session(
        user_id=current_user.id,
        user_email=current_user.email,
        plan=body.plan,
        success_url=body.success_url,
        cancel_url=body.cancel_url,
        stripe_customer_id=current_user.stripe_customer_id,
    )
    return result


@router.post("/portal")
async def customer_portal(
    return_url: str,
    current_user: User = Depends(get_current_user),
):
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")
    url = await get_customer_portal(current_user.stripe_customer_id, return_url)
    return {"url": url}


@router.post("/cancel")
async def cancel_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")
    success = await cancel_subscription(current_user.stripe_subscription_id)
    if success:
        current_user.plan = SubscriptionPlan.free
        current_user.stripe_subscription_id = None
        db.commit()
    return {"cancelled": success}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    event = construct_webhook_event(payload, sig)

    # Idempotency — skip already-processed events
    if db.query(StripeEvent).filter(StripeEvent.event_id == event["id"]).first():
        return {"status": "already_processed"}

    db.add(StripeEvent(event_id=event["id"], event_type=event["type"], payload=dict(event)))
    db.commit()

    etype = event["type"]
    data = event["data"]["object"]

    if etype == "checkout.session.completed":
        user_id = int(data["metadata"].get("user_id", 0))
        plan_name = data["metadata"].get("plan", "pro")
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.plan = SubscriptionPlan[plan_name]
            user.stripe_customer_id = customer_id
            user.stripe_subscription_id = subscription_id
            db.commit()

    elif etype in ("customer.subscription.deleted", "customer.subscription.paused"):
        customer_id = data.get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.plan = SubscriptionPlan.free
            user.stripe_subscription_id = None
            db.commit()

    elif etype == "customer.subscription.updated":
        customer_id = data.get("customer")
        new_price = data["items"]["data"][0]["price"]["id"] if data.get("items") else None
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user and new_price:
            user.plan = get_plan_from_price_id(new_price)
            db.commit()

    db.query(StripeEvent).filter(StripeEvent.event_id == event["id"]).update({"processed": True})
    db.commit()

    return {"status": "ok"}
