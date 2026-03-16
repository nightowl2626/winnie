from fastapi import HTTPException

from app.runtime import settings
from app.services.auth import AuthContext


def enforce_admin_access(auth_ctx: AuthContext) -> None:
    admin_ids = {value.strip() for value in settings.admin_user_ids_list if value.strip()}
    if not admin_ids:
        if settings.require_auth and not auth_ctx.authenticated:
            raise HTTPException(status_code=401, detail="Authentication required")
        return
    if not auth_ctx.authenticated or not auth_ctx.user_id:
        raise HTTPException(status_code=401, detail="Admin authentication required")
    if auth_ctx.user_id not in admin_ids:
        raise HTTPException(status_code=403, detail="Admin access required")


def enforce_optional_user_access(auth_ctx: AuthContext, user_id: str | None) -> str | None:
    resolved_user_id = (user_id or auth_ctx.user_id or "").strip() or None
    if user_id:
        from app.services.auth import enforce_user_access

        enforce_user_access(auth_ctx, user_id)
    elif settings.require_auth and not auth_ctx.authenticated:
        raise HTTPException(status_code=401, detail="Authentication required")
    return resolved_user_id
