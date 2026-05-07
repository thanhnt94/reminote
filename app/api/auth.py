"""Auth API — Internal login, SSO callback, current user."""

from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserLogin, UserResponse, TokenResponse
from app.services.auth_service import verify_password, create_access_token, decode_access_token
from app.config import get_settings

import logging
router = APIRouter()
settings = get_settings()
logger = logging.getLogger("reminote.auth")


# --- Dependency: Get current user from JWT ---
async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    """Extract and validate JWT from Authorization header or cookie."""
    token = None

    # Check Authorization header first
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]

    # Fallback to cookie
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency: requires admin privileges."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# --- Internal Login ---
@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    """Internal username/password login."""
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()

    if not user:
        logger.warning(f"--- [AUTH] LOGIN FAILED: User '{data.username}' not found in database ---")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.password_hash:
        logger.warning(f"--- [AUTH] LOGIN FAILED: User '{data.username}' has no password hash (SSO only?) ---")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, user.password_hash):
        logger.warning(f"--- [AUTH] LOGIN FAILED: Incorrect password for user '{data.username}' ---")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    logger.info(f"--- [AUTH] LOGIN SUCCESS: User '{data.username}' authenticated successfully ---")

    token = create_access_token(user.id, user.username, user.is_admin)

    # Set cookie for SPA
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get current authenticated user info with linked telegram handle."""
    # Find linked telegram username
    tg_username = None
    if user.telegram_chat_id:
        from app.models.user import TelegramConnection
        res = await db.execute(select(TelegramConnection.username).where(TelegramConnection.chat_id == user.telegram_chat_id))
        tg_username = res.scalar_one_or_none()
    
    # We create a dict to inject the extra field before validation
    user_data = UserResponse.model_validate(user).model_dump()
    user_data["telegram_username"] = tg_username
    return UserResponse(**user_data)


@router.post("/profile/unlink-telegram")
async def unlink_telegram(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disconnect Telegram account."""
    user.telegram_chat_id = None
    await db.commit()
    return {"status": "success"}


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookie."""
    response.delete_cookie("access_token")
    return {"message": "Logged out"}


@router.put("/profile/settings")
async def update_settings(
    data: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user notification settings."""
    if "push_interval_minutes" in data:
        user.push_interval_minutes = int(data["push_interval_minutes"])
    if "quiet_hour_start" in data:
        user.quiet_hour_start = int(data["quiet_hour_start"])
    if "quiet_hour_end" in data:
        user.quiet_hour_end = int(data["quiet_hour_end"])
    
    await db.commit()
    return {"status": "success"}


@router.post("/profile/link-telegram")
async def link_telegram_username(
    data: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Link user by Telegram username lookup."""
    if "telegram_username" not in data:
        raise HTTPException(status_code=400, detail="Username required")
    
    tg_username = data["telegram_username"].lower().lstrip('@')
    
    from app.models.user import TelegramConnection
    result = await db.execute(select(TelegramConnection).where(TelegramConnection.username == tg_username))
    conn = result.scalar_one_or_none()
    
    if not conn:
        raise HTTPException(status_code=404, detail="Username not found in bot cache. Please chat with the bot first!")
    
    user.telegram_chat_id = conn.chat_id
    await db.commit()
    
    return {"status": "success", "chat_id": conn.chat_id}

# --- Standardized SSO Protocol (Mindstack Ecosystem) ---

async def get_sso_config(db: AsyncSession):
    """Helper to fetch SSO settings from DB."""
    from app.models.setting import SystemSetting
    res = await db.execute(select(SystemSetting).where(SystemSetting.category == "sso"))
    rows = res.scalars().all()
    config = {s.key: s.value for s in rows}
    return config

@router.get("/auth-center/login")
async def sso_login(db: AsyncSession = Depends(get_db)):
    """Redirect to CentralAuth for SSO login."""
    config = await get_sso_config(db)
    
    # Check if SSO is enabled
    if config.get("ENABLE_SSO", "true").lower() != "true":
        raise HTTPException(status_code=503, detail="SSO Integration is currently disabled by administrator.")

    server_url = config.get("CENTRAL_AUTH_URL", "http://localhost:5000")
    client_id = config.get("CENTRAL_AUTH_CLIENT_ID", "reminote-v1")
    
    # Construction of redirect_uri
    base_url = "http://127.0.0.1:5070" # Should be dynamic in prod
    redirect_uri = f"{base_url}/auth-center/callback"
    
    auth_url = (
        f"{server_url}/api/auth/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
    )
    return RedirectResponse(url=auth_url)


@router.get("/auth-center/callback")
async def sso_callback(code: str, response: Response, db: AsyncSession = Depends(get_db)):
    """Handle CentralAuth SSO callback — exchange code for token."""
    config = await get_sso_config(db)
    server_url = config.get("CENTRAL_AUTH_URL", "http://localhost:5000")
    client_id = config.get("CENTRAL_AUTH_CLIENT_ID", "reminote-v1")
    client_secret = config.get("CENTRAL_AUTH_CLIENT_SECRET", "reminote_secret_xxx")
    base_url = "http://127.0.0.1:5070"
    redirect_uri = f"{base_url}/auth-center/callback"

    try:
        async with httpx.AsyncClient() as client:
            # Exchange authorization code for access token
            token_resp = await client.post(
                f"{server_url}/api/auth/token",
                json={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                },
            )
            if token_resp.status_code != 200:
                raise HTTPException(status_code=401, detail=f"SSO token exchange failed: {token_resp.text}")

            token_data = token_resp.json()
            sso_token = token_data.get("access_token")

            # Get user info from CentralAuth
            user_resp = await client.get(
                f"{server_url}/api/auth/me",
                headers={"Authorization": f"Bearer {sso_token}"},
            )
            if user_resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Failed to get SSO user info")

            sso_user = user_resp.json()

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"CentralAuth unavailable: {e}")

    # Find or create local user
    sso_user_id = sso_user.get("id")
    result = await db.execute(select(User).where(User.sso_user_id == sso_user_id))
    user = result.scalar_one_or_none()

    if not user:
        # Check if username exists (collision handling)
        sso_username = sso_user.get("username", f"sso_{sso_user_id}")
        result = await db.execute(select(User).where(User.username == sso_username))
        existing = result.scalar_one_or_none()

        if existing:
            # Link existing account to SSO
            existing.sso_user_id = sso_user_id
            user = existing
        else:
            # Create new user
            user = User(
                username=sso_username,
                email=sso_user.get("email"),
                sso_user_id=sso_user_id,
                is_admin=False,
            )
            db.add(user)

        await db.commit()
        await db.refresh(user)

    # Create local JWT and redirect to app
    token = create_access_token(user.id, user.username, user.is_admin)
    
    # We redirect to the frontend with the cookie set
    # Using a simple HTML or directly setting cookie in redirect
    redirect = RedirectResponse(url="/", status_code=302)
    redirect.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
    )
    return redirect

@router.post("/auth-center/webhook/backchannel-log")
async def backchannel_logout(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Global Logout from CentralAuth."""
    data = await request.json()
    sso_user_id = data.get("sso_user_id")
    
    if not sso_user_id:
        return {"status": "ignored"}
    
    # In a cookie-based system, we can't 'force' logout a browser from a webhook
    # unless we use a blacklist or session table.
    # For now, we log it. In a production app, we would invalidate the user's sessions in Redis/DB.
    print(f"[SSO] Backchannel logout request for SSO User ID: {sso_user_id}")
    return {"status": "success"}

@router.get("/vapid-public-key")
async def get_vapid_public_key(db: AsyncSession = Depends(get_db)):
    """Provide the VAPID public key for the frontend with on-the-fly generation."""
    from app.models.setting import SystemSetting
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == "VAPID_PUBLIC_KEY"))
    setting = result.scalar_one_or_none()
    
    if not setting or not setting.value:
        try:
            from pyvapid import Vapid
            v = Vapid()
            v.generate_keys()
            
            # Save both keys
            for k, v_val in [("VAPID_PUBLIC_KEY", v.public_key), ("VAPID_PRIVATE_KEY", v.private_key)]:
                res = await db.execute(select(SystemSetting).where(SystemSetting.key == k))
                s = res.scalar_one_or_none()
                if not s:
                    db.add(SystemSetting(key=k, value=v_val, description="Auto-generated VAPID Key", category="security"))
                else:
                    s.value = v_val
            
            await db.commit()
            return {"publicKey": v.public_key}
        except ImportError:
            raise HTTPException(status_code=503, detail="Web push not configured: 'py-vapid' library missing.")
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Failed to generate keys on-the-fly: {e}")
            
    return {"publicKey": setting.value}

@router.post("/profile/web-push")
async def register_web_push(
    data: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Register a browser push subscription."""
    from app.models.user import WebPushSubscription
    
    endpoint = data.get("endpoint")
    keys = data.get("keys", {})
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")
    
    if not endpoint or not p256dh or not auth:
        raise HTTPException(status_code=400, detail="Invalid subscription data")
        
    # Check if exists
    result = await db.execute(select(WebPushSubscription).where(WebPushSubscription.endpoint == endpoint))
    existing = result.scalar_one_or_none()
    
    if existing:
        existing.user_id = user.id # Re-assign to current user
        existing.p256dh = p256dh
        existing.auth = auth
    else:
        new_sub = WebPushSubscription(
            user_id=user.id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth
        )
        db.add(new_sub)
        
    await db.commit()
    return {"status": "success"}
