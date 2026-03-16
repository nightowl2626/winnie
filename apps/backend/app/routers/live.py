from fastapi import APIRouter, Depends

from app.models import LiveEphemeralTokenRequest, LiveEphemeralTokenResponse
from app.runtime import gemini_live_service
from app.services.auth import AuthContext, enforce_user_access, get_auth_context

router = APIRouter()


@router.post("/v1/live/ephemeral-token/{user_id}", response_model=LiveEphemeralTokenResponse)
def create_live_ephemeral_token(
    user_id: str,
    payload: LiveEphemeralTokenRequest,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> LiveEphemeralTokenResponse:
    enforce_user_access(auth_ctx, user_id)
    return gemini_live_service.create_ephemeral_token(payload)
