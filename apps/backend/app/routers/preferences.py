from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.models import FavoriteStore, FavoriteStoreUpsertRequest, WishlistItem, WishlistItemInput
from app.runtime import gateway
from app.services.auth import AuthContext, enforce_user_access, get_auth_context

router = APIRouter()


@router.get("/v1/wishlist/{user_id}", response_model=list[WishlistItem])
def get_wishlist(
    user_id: str,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> list[WishlistItem]:
    enforce_user_access(auth_ctx, user_id)
    return gateway.list_wishlist(user_id)


@router.post("/v1/wishlist/{user_id}", response_model=WishlistItem)
def create_or_update_wishlist_item(
    user_id: str,
    payload: WishlistItemInput,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> WishlistItem:
    enforce_user_access(auth_ctx, user_id)
    if not payload.category.strip():
        raise HTTPException(status_code=400, detail="category is required")
    return gateway.upsert_wishlist_item(user_id, payload)


@router.delete("/v1/wishlist/{user_id}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wishlist_item(
    user_id: str,
    item_id: str,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> Response:
    enforce_user_access(auth_ctx, user_id)
    if not gateway.delete_wishlist_item(user_id, item_id):
        raise HTTPException(status_code=404, detail="wishlist item not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/v1/users/{user_id}/favorite-stores", response_model=list[FavoriteStore])
def get_favorite_stores(
    user_id: str,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> list[FavoriteStore]:
    enforce_user_access(auth_ctx, user_id)
    return gateway.list_favorite_stores(user_id)


@router.post("/v1/users/{user_id}/favorite-stores", response_model=FavoriteStore)
def upsert_favorite_store(
    user_id: str,
    payload: FavoriteStoreUpsertRequest,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> FavoriteStore:
    enforce_user_access(auth_ctx, user_id)
    return gateway.upsert_favorite_store(
        user_id,
        payload.store_id.strip(),
        name=(payload.name or "").strip() or None,
        category=(payload.category or "").strip() or None,
    )


@router.delete("/v1/users/{user_id}/favorite-stores/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_favorite_store(
    user_id: str,
    store_id: str,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> Response:
    enforce_user_access(auth_ctx, user_id)
    if not gateway.delete_favorite_store(user_id, store_id):
        raise HTTPException(status_code=404, detail="favorite store not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
