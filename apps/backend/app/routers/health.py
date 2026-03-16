from fastapi import APIRouter

from app.models import HealthResponse
from app.runtime import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
    )
