from __future__ import annotations

import json
import logging
import os
from collections import defaultdict
from datetime import datetime, timezone

from google.cloud import firestore
from google.oauth2 import service_account

from app.config import Settings
from app.models import (
    CachedShopStore,
    FavoriteStore,
    GlobalStoreDirectoryEntry,
    StyleIntentLog,
    WardrobeItem,
    WardrobeItemInput,
    WardrobeItemUpdate,
    WearLog,
    WishlistItem,
    WishlistItemInput,
)

logger = logging.getLogger(__name__)


class InMemoryGateway:
    def __init__(self) -> None:
        self._wishlists: dict[str, dict[str, WishlistItem]] = defaultdict(dict)
        self._favorite_stores: dict[str, dict[str, FavoriteStore]] = defaultdict(dict)
        self._cached_shops: dict[str, dict[str, CachedShopStore]] = defaultdict(dict)
        self._directory_stores: dict[str, dict[str, GlobalStoreDirectoryEntry]] = defaultdict(dict)
        self._wardrobe: dict[str, dict[str, WardrobeItem]] = defaultdict(dict)
        self._style_profiles: dict[str, dict] = {}
        self._wear_logs: dict[str, dict[str, WearLog]] = defaultdict(dict)
        self._style_intent_logs: dict[str, dict[str, StyleIntentLog]] = defaultdict(dict)

    def list_wishlist(self, user_id: str) -> list[WishlistItem]:
        return list(self._wishlists[user_id].values())

    def upsert_wishlist_item(self, user_id: str, payload: WishlistItemInput) -> WishlistItem:
        item = WishlistItem.from_input(payload)
        self._wishlists[user_id][item.id] = item
        return item

    def delete_wishlist_item(self, user_id: str, item_id: str) -> bool:
        if item_id not in self._wishlists[user_id]:
            return False
        del self._wishlists[user_id][item_id]
        return True

    def list_favorite_stores(self, user_id: str) -> list[FavoriteStore]:
        return list(self._favorite_stores[user_id].values())

    def list_cached_shops(self, user_id: str) -> list[CachedShopStore]:
        return list(self._cached_shops[user_id].values())

    def upsert_cached_shops(self, user_id: str, shops: list[CachedShopStore]) -> None:
        for shop in shops:
            self._cached_shops[user_id][shop.id] = shop

    def list_directory_stores(self, city_key: str) -> list[GlobalStoreDirectoryEntry]:
        return list(self._directory_stores[city_key].values())

    def upsert_directory_stores(self, city_key: str, shops: list[GlobalStoreDirectoryEntry]) -> None:
        for shop in shops:
            self._directory_stores[city_key][shop.id] = shop

    def upsert_favorite_store(
        self,
        user_id: str,
        store_id: str,
        *,
        name: str | None = None,
        category: str | None = None,
    ) -> FavoriteStore:
        existing = self._favorite_stores[user_id].get(store_id)
        record = FavoriteStore(
            store_id=store_id,
            name=name or (existing.name if existing else None),
            category=category or (existing.category if existing else None),
            created_at=existing.created_at if existing else datetime.now(tz=timezone.utc).isoformat(),
        )
        self._favorite_stores[user_id][store_id] = record
        return record

    def delete_favorite_store(self, user_id: str, store_id: str) -> bool:
        if store_id not in self._favorite_stores[user_id]:
            return False
        del self._favorite_stores[user_id][store_id]
        return True

    def get_user_style_profile(self, user_id: str) -> dict:
        profile = self._style_profiles.get(user_id, {})
        return {
            "user_id": user_id,
            "model_photo_base64": profile.get("model_photo_base64"),
            "model_photo_updated_at": profile.get("model_photo_updated_at"),
            "last_tryon_image_base64": profile.get("last_tryon_image_base64"),
            "last_tryon_updated_at": profile.get("last_tryon_updated_at"),
        }

    def upsert_user_style_photo(self, user_id: str, image_base64: str) -> dict:
        profile = dict(self._style_profiles.get(user_id, {}))
        profile["model_photo_base64"] = image_base64
        profile["model_photo_updated_at"] = datetime.now(tz=timezone.utc).isoformat()
        self._style_profiles[user_id] = profile
        return self.get_user_style_profile(user_id)

    def set_user_tryon_result(self, user_id: str, image_base64: str) -> dict:
        profile = dict(self._style_profiles.get(user_id, {}))
        profile["last_tryon_image_base64"] = image_base64
        profile["last_tryon_updated_at"] = datetime.now(tz=timezone.utc).isoformat()
        self._style_profiles[user_id] = profile
        return self.get_user_style_profile(user_id)

    def create_wardrobe_item(self, user_id: str, payload: WardrobeItemInput) -> WardrobeItem:
        item_kwargs = {
            "phase": payload.phase.strip().lower(),
            "category": payload.category.strip().lower(),
            "title": payload.title,
            "color": payload.color,
            "style": payload.style,
            "fabric_type": payload.fabric_type,
            "condition": payload.condition,
            "estimated_fit": payload.estimated_fit,
            "note": payload.note,
            "image_url": payload.image_url,
            "image_base64": payload.image_base64,
            "item_snippet_base64": payload.item_snippet_base64,
            "wear_count": payload.wear_count if payload.wear_count is not None else 0,
            "last_worn_date": payload.last_worn_date,
            "flagged_for_donation": (
                payload.flagged_for_donation if payload.flagged_for_donation is not None else False
            ),
            "marketplace_listing": payload.marketplace_listing,
        }
        if payload.id:
            item_kwargs["id"] = payload.id
        item = WardrobeItem(**item_kwargs)
        self._wardrobe[user_id][item.id] = item
        return item

    def update_wardrobe_item(
        self, user_id: str, item_id: str, updates: WardrobeItemUpdate
    ) -> WardrobeItem | None:
        existing = self._wardrobe[user_id].get(item_id)
        if existing is None:
            return None
        update_dict = updates.model_dump(exclude_none=True)
        if not update_dict:
            return existing
        updated = existing.model_copy(update=update_dict)
        self._wardrobe[user_id][item_id] = updated
        return updated

    def list_wardrobe_items(self, user_id: str) -> list[WardrobeItem]:
        items = list(self._wardrobe[user_id].values())
        return sorted(items, key=lambda row: row.created_at, reverse=True)

    def delete_wardrobe_item(self, user_id: str, item_id: str) -> bool:
        if item_id not in self._wardrobe[user_id]:
            return False
        del self._wardrobe[user_id][item_id]
        return True

    def create_wear_log(self, user_id: str, date: str, item_ids: list[str]) -> WearLog:
        deduped_ids = [item_id.strip() for item_id in item_ids if str(item_id).strip()]
        seen: set[str] = set()
        normalized_ids: list[str] = []
        for item_id in deduped_ids:
            if item_id in seen:
                continue
            seen.add(item_id)
            normalized_ids.append(item_id)
        log = WearLog(user_id=user_id, date=date, item_ids=normalized_ids)
        self._wear_logs[user_id][log.id] = log
        return log

    def list_wear_logs(self, user_id: str, limit: int | None = None) -> list[WearLog]:
        logs = list(self._wear_logs[user_id].values())
        logs = sorted(logs, key=lambda row: row.created_at, reverse=True)
        if limit is not None:
            return logs[: max(0, limit)]
        return logs

    def create_style_intent_log(self, user_id: str, intent_description: str, date: str) -> StyleIntentLog:
        description = intent_description.strip()
        log = StyleIntentLog(user_id=user_id, intent_description=description, date=date)
        self._style_intent_logs[user_id][log.id] = log
        return log

    def list_style_intent_logs(self, user_id: str, limit: int | None = None) -> list[StyleIntentLog]:
        logs = list(self._style_intent_logs[user_id].values())
        logs = sorted(logs, key=lambda row: row.created_at, reverse=True)
        if limit is not None:
            return logs[: max(0, limit)]
        return logs


class FirestoreGateway:
    def __init__(self, settings: Settings):
        project_id = settings.firestore_project_id
        credentials = None
        if settings.firebase_credentials_json:
            try:
                creds_info = json.loads(settings.firebase_credentials_json)
                credentials = service_account.Credentials.from_service_account_info(creds_info)
                if not project_id:
                    project_id = creds_info.get("project_id")
            except Exception:
                logger.exception("Failed to parse firebase_credentials_json")

        self.client = firestore.Client(
            project=project_id,
            credentials=credentials,
            database=settings.firestore_database_name,
        )

    def list_wishlist(self, user_id: str) -> list[WishlistItem]:
        wishlist_ref = self.client.collection("users").document(user_id).collection("wishlist")
        items = [WishlistItem.model_validate(doc.to_dict()) for doc in wishlist_ref.stream()]
        return sorted(items, key=lambda item: item.created_at, reverse=True)

    def upsert_wishlist_item(self, user_id: str, payload: WishlistItemInput) -> WishlistItem:
        item = WishlistItem.from_input(payload)
        wishlist_doc = self.client.collection("users").document(user_id).collection("wishlist").document(item.id)
        wishlist_doc.set(item.model_dump())
        return item

    def delete_wishlist_item(self, user_id: str, item_id: str) -> bool:
        wishlist_doc = self.client.collection("users").document(user_id).collection("wishlist").document(item_id)
        existing = wishlist_doc.get()
        if not existing.exists:
            return False
        wishlist_doc.delete()
        return True

    def list_favorite_stores(self, user_id: str) -> list[FavoriteStore]:
        favorites_ref = self.client.collection("users").document(user_id).collection("favorite_stores")
        items = [FavoriteStore.model_validate(doc.to_dict()) for doc in favorites_ref.stream()]
        return sorted(items, key=lambda item: item.created_at, reverse=True)

    def list_cached_shops(self, user_id: str) -> list[CachedShopStore]:
        cache_ref = self.client.collection("users").document(user_id).collection("shop_cache")
        items = [CachedShopStore.model_validate(doc.to_dict()) for doc in cache_ref.stream()]
        return sorted(items, key=lambda item: item.cached_at, reverse=True)

    def upsert_cached_shops(self, user_id: str, shops: list[CachedShopStore]) -> None:
        cache_ref = self.client.collection("users").document(user_id).collection("shop_cache")
        batch = self.client.batch()
        for shop in shops:
            batch.set(cache_ref.document(shop.id), shop.model_dump())
        batch.commit()

    def list_directory_stores(self, city_key: str) -> list[GlobalStoreDirectoryEntry]:
        stores_ref = self.client.collection("city_directories").document(city_key).collection("stores")
        items = [GlobalStoreDirectoryEntry.model_validate(doc.to_dict()) for doc in stores_ref.stream()]
        return sorted(items, key=lambda item: item.last_updated, reverse=True)

    def upsert_directory_stores(self, city_key: str, shops: list[GlobalStoreDirectoryEntry]) -> None:
        stores_ref = self.client.collection("city_directories").document(city_key).collection("stores")
        batch = self.client.batch()
        for shop in shops:
            batch.set(stores_ref.document(shop.id), shop.model_dump())
        batch.commit()

    def upsert_favorite_store(
        self,
        user_id: str,
        store_id: str,
        *,
        name: str | None = None,
        category: str | None = None,
    ) -> FavoriteStore:
        favorites_doc = (
            self.client.collection("users")
            .document(user_id)
            .collection("favorite_stores")
            .document(store_id)
        )
        existing = favorites_doc.get()
        existing_payload = existing.to_dict() or {}
        record = FavoriteStore(
            store_id=store_id,
            name=name or existing_payload.get("name"),
            category=category or existing_payload.get("category"),
            created_at=existing_payload.get("created_at") or datetime.now(tz=timezone.utc).isoformat(),
        )
        favorites_doc.set(record.model_dump())
        return record

    def delete_favorite_store(self, user_id: str, store_id: str) -> bool:
        favorites_doc = (
            self.client.collection("users")
            .document(user_id)
            .collection("favorite_stores")
            .document(store_id)
        )
        existing = favorites_doc.get()
        if not existing.exists:
            return False
        favorites_doc.delete()
        return True

    def get_user_style_profile(self, user_id: str) -> dict:
        user_doc = self.client.collection("users").document(user_id).get()
        payload = user_doc.to_dict() or {}
        return {
            "user_id": user_id,
            "model_photo_base64": payload.get("model_photo_base64"),
            "model_photo_updated_at": payload.get("model_photo_updated_at"),
            "last_tryon_image_base64": payload.get("last_tryon_image_base64"),
            "last_tryon_updated_at": payload.get("last_tryon_updated_at"),
        }

    def upsert_user_style_photo(self, user_id: str, image_base64: str) -> dict:
        now = datetime.now(tz=timezone.utc).isoformat()
        user_doc = self.client.collection("users").document(user_id)
        user_doc.set(
            {
                "model_photo_base64": image_base64,
                "model_photo_updated_at": now,
            },
            merge=True,
        )
        return self.get_user_style_profile(user_id)

    def set_user_tryon_result(self, user_id: str, image_base64: str) -> dict:
        now = datetime.now(tz=timezone.utc).isoformat()
        user_doc = self.client.collection("users").document(user_id)
        user_doc.set(
            {
                "last_tryon_image_base64": image_base64,
                "last_tryon_updated_at": now,
            },
            merge=True,
        )
        return self.get_user_style_profile(user_id)

    def create_wardrobe_item(self, user_id: str, payload: WardrobeItemInput) -> WardrobeItem:
        item_kwargs = {
            "phase": payload.phase.strip().lower(),
            "category": payload.category.strip().lower(),
            "title": payload.title,
            "color": payload.color,
            "style": payload.style,
            "fabric_type": payload.fabric_type,
            "condition": payload.condition,
            "estimated_fit": payload.estimated_fit,
            "note": payload.note,
            "image_url": payload.image_url,
            "image_base64": payload.image_base64,
            "item_snippet_base64": payload.item_snippet_base64,
            "wear_count": payload.wear_count if payload.wear_count is not None else 0,
            "last_worn_date": payload.last_worn_date,
            "flagged_for_donation": (
                payload.flagged_for_donation if payload.flagged_for_donation is not None else False
            ),
            "marketplace_listing": payload.marketplace_listing,
        }
        if payload.id:
            item_kwargs["id"] = payload.id
        item = WardrobeItem(**item_kwargs)
        wardrobe_doc = self.client.collection("users").document(user_id).collection("wardrobe").document(item.id)
        wardrobe_doc.set(item.model_dump())
        return item

    def update_wardrobe_item(
        self, user_id: str, item_id: str, updates: WardrobeItemUpdate
    ) -> WardrobeItem | None:
        wardrobe_doc = (
            self.client.collection("users")
            .document(user_id)
            .collection("wardrobe")
            .document(item_id)
        )
        existing = wardrobe_doc.get()
        if not existing.exists:
            return None
        update_dict = updates.model_dump(exclude_none=True)
        if not update_dict:
            return WardrobeItem.model_validate(existing.to_dict())
        wardrobe_doc.set(update_dict, merge=True)
        merged = wardrobe_doc.get().to_dict() or {}
        return WardrobeItem.model_validate(merged)

    def list_wardrobe_items(self, user_id: str) -> list[WardrobeItem]:
        wardrobe_ref = self.client.collection("users").document(user_id).collection("wardrobe")
        items = [WardrobeItem.model_validate(doc.to_dict()) for doc in wardrobe_ref.stream()]
        return sorted(items, key=lambda row: row.created_at, reverse=True)

    def delete_wardrobe_item(self, user_id: str, item_id: str) -> bool:
        wardrobe_doc = (
            self.client.collection("users")
            .document(user_id)
            .collection("wardrobe")
            .document(item_id)
        )
        existing = wardrobe_doc.get()
        if not existing.exists:
            return False
        wardrobe_doc.delete()
        return True

    def create_wear_log(self, user_id: str, date: str, item_ids: list[str]) -> WearLog:
        deduped_ids = [str(item_id).strip() for item_id in item_ids if str(item_id).strip()]
        seen: set[str] = set()
        normalized_ids: list[str] = []
        for item_id in deduped_ids:
            if item_id in seen:
                continue
            seen.add(item_id)
            normalized_ids.append(item_id)

        log = WearLog(user_id=user_id, date=date, item_ids=normalized_ids)
        log_doc = self.client.collection("users").document(user_id).collection("wear_logs").document(log.id)
        log_doc.set(log.model_dump())
        return log

    def list_wear_logs(self, user_id: str, limit: int | None = None) -> list[WearLog]:
        logs_ref = self.client.collection("users").document(user_id).collection("wear_logs")
        logs = [WearLog.model_validate(doc.to_dict()) for doc in logs_ref.stream()]
        logs = sorted(logs, key=lambda row: row.created_at, reverse=True)
        if limit is not None:
            return logs[: max(0, limit)]
        return logs

    def create_style_intent_log(self, user_id: str, intent_description: str, date: str) -> StyleIntentLog:
        description = intent_description.strip()
        log = StyleIntentLog(user_id=user_id, intent_description=description, date=date)
        log_doc = (
            self.client.collection("users")
            .document(user_id)
            .collection("style_intent_logs")
            .document(log.id)
        )
        log_doc.set(log.model_dump())
        return log

    def list_style_intent_logs(self, user_id: str, limit: int | None = None) -> list[StyleIntentLog]:
        logs_ref = self.client.collection("users").document(user_id).collection("style_intent_logs")
        logs = [StyleIntentLog.model_validate(doc.to_dict()) for doc in logs_ref.stream()]
        logs = sorted(logs, key=lambda row: row.created_at, reverse=True)
        if limit is not None:
            return logs[: max(0, limit)]
        return logs


def build_gateway(settings: Settings):
    if settings.use_in_memory_store:
        logger.info("Using in-memory data gateway (USE_IN_MEMORY_STORE=true).")
        return InMemoryGateway()

    try:
        settings.apply_runtime_environment()
        if settings.firestore_credentials_path and not os.path.exists(settings.firestore_credentials_path):
            logger.warning(
                "GOOGLE_APPLICATION_CREDENTIALS points to a missing file after normalization: %s",
                settings.firestore_credentials_path,
            )
        if settings.firebase_credentials_json:
            credentials_info = json.loads(settings.firebase_credentials_json)
            logger.info(
                "Firebase credentials detected for project: %s",
                credentials_info.get("project_id", "unknown"),
            )
        return FirestoreGateway(settings)
    except Exception as exc:  # pragma: no cover - fallback path
        logger.warning("Firestore init failed, falling back to in-memory gateway: %s", exc)
        return InMemoryGateway()
