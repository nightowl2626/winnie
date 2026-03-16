from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import ALL_ROUTERS
from app.runtime import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="Secondhand Agent Backend",
        version="0.1.0",
        description="Backend for wardrobe, wishlist, shop discovery, live sessions, and try-on flows.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=settings.cors_methods_list,
        allow_headers=settings.cors_headers_list,
    )
    for router in ALL_ROUTERS:
        app.include_router(router)
    return app


app = create_app()
