"""Stripe service — checkout, webhooks, subscription management."""
import stripe
from fastapi import HTTPException
from core.config import settings
from models.user import SubscriptionPlan

stripe.api_key = settings.STRIPE_SECRET_KEY

PLAN_PRICE_MAP = {
    "pro": settings.STRIPE_PRICE_PRO,
    "enterprise": settings.STRIPE_PRICE_ENTERPRISE,
}

PLAN_ENUM_MAP = {
    "pro": SubscriptionPlan.pro,
    "enterprise": SubscriptionPlan.enterprise,
}


async def create_checkout_session(
    user_id: int,
    user_email: str,
    plan: str,
    success_url: str,
    cancel_url: str,
    stripe_customer_id: str = None,
) -> dict:
    if plan not in PLAN_PRICE_MAP:
        raise HTTPException(status_code=400, detail="Invalid plan")

    kwargs = {
        "mode": "subscription",
        "line_items": [{"price": PLAN_PRICE_MAP[plan], "quantity": 1}],
        "success_url": success_url + "?session_id={CHECKOUT_SESSION_ID}",
        "cancel_url": cancel_url,
        "metadata": {"user_id": str(user_id), "plan": plan},
        "subscription_data": {"metadata": {"user_id": str(user_id)}},
    }

    if stripe_customer_id:
        kwargs["customer"] = stripe_customer_id
    else:
        kwargs["customer_email"] = user_email

    session = stripe.checkout.Session.create(**kwargs)
    return {"checkout_url": session.url, "session_id": session.id}


async def cancel_subscription(stripe_subscription_id: str) -> bool:
    try:
        stripe.Subscription.cancel(stripe_subscription_id)
        return True
    except stripe.error.StripeError:
        return False


async def get_customer_portal(stripe_customer_id: str, return_url: str) -> str:
    session = stripe.billing_portal.Session.create(
        customer=stripe_customer_id,
        return_url=return_url,
    )
    return session.url


def construct_webhook_event(payload: bytes, sig_header: str):
    try:
        return stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        raise HTTPException(status_code=400, detail=str(e))


def get_plan_from_price_id(price_id: str) -> SubscriptionPlan:
    for plan, pid in PLAN_PRICE_MAP.items():
        if pid == price_id:
            return PLAN_ENUM_MAP[plan]
    return SubscriptionPlan.free
