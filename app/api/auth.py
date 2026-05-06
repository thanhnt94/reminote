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

router = APIRouter()
settings = get_settings()


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
@router.post("/api/auth/login", response_model=TokenResponse)
async def login(data: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    """Internal username/password login."""
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

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


@router.get("/api/auth/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    return UserResponse.model_validate(user)


@router.post("/api/auth/logout")
async def logout(response: Response):
    """Clear auth cookie."""
    response.delete_cookie("access_token")
    return {"message": "Logged out"}


# --- CentralAuth SSO ---
@router.get("/auth/sso/login")
async def sso_login():
    """Redirect to CentralAuth for SSO login."""
    auth_url = (
        f"{settings.CENTRAL_AUTH_URL}/api/auth/authorize"
        f"?client_id={settings.CENTRAL_AUTH_CLIENT_ID}"
        f"&redirect_uri={settings.SSO_REDIRECT_URI}"
        f"&response_type=code"
    )
    return RedirectResponse(url=auth_url)


@router.get("/auth/sso/callback")
async def sso_callback(code: str, response: Response, db: AsyncSession = Depends(get_db)):
    """Handle CentralAuth SSO callback — exchange code for token."""
    try:
        async with httpx.AsyncClient() as client:
            # Exchange authorization code for access token
            token_resp = await client.post(
                f"{settings.CENTRAL_AUTH_URL}/api/auth/token",
                json={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.CENTRAL_AUTH_CLIENT_ID,
                    "client_secret": settings.CENTRAL_AUTH_CLIENT_SECRET,
                    "redirect_uri": settings.SSO_REDIRECT_URI,
                },
            )
            if token_resp.status_code != 200:
                raise HTTPException(status_code=401, detail="SSO token exchange failed")

            token_data = token_resp.json()
            sso_token = token_data.get("access_token")

            # Get user info from CentralAuth
            user_resp = await client.get(
                f"{settings.CENTRAL_AUTH_URL}/api/auth/me",
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
    redirect = RedirectResponse(url="/", status_code=302)
    redirect.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
    )
    return redirect
