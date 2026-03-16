from app.routers.health import router as health_router
from app.routers.live import router as live_router
from app.routers.preferences import router as preferences_router
from app.routers.shop import router as shop_router
from app.routers.user import router as user_router
from app.routers.wardrobe import router as wardrobe_router

ALL_ROUTERS = (
    health_router,
    shop_router,
    preferences_router,
    wardrobe_router,
    user_router,
    live_router,
)
