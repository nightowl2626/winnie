from __future__ import annotations

from dataclasses import dataclass
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth

from app.config import get_settings
from app.services.firebase_app import ensure_firebase_app

bearer_scheme = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


@dataclass
class AuthContext:
    user_id: str | None
    authenticated: bool


def get_auth_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthContext:
    settings = get_settings()
    if credentials is None:
        if settings.require_auth:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing bearer token",
            )
        return AuthContext(user_id=None, authenticated=False)

    app = ensure_firebase_app(settings)
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase auth is not configured",
        )

    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials, app=app)
        user_id = str(decoded.get("uid", "")).strip()
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        return AuthContext(user_id=user_id, authenticated=True)
    except HTTPException:
        raise
    except Exception as exc:
        if not settings.require_auth:
            logger.warning(
                "Ignoring bearer token verification failure because REQUIRE_AUTH=false: %s",
                exc,
            )
            return AuthContext(user_id=None, authenticated=False)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {exc}",
        ) from exc


def enforce_user_access(auth_ctx: AuthContext, user_id: str) -> None:
    settings = get_settings()
    if settings.require_auth and not auth_ctx.authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    if auth_ctx.user_id and auth_ctx.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User token does not match requested user_id",
        )
