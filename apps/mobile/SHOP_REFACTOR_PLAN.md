# Plan: Extract & Refactor the Shop Map Module

## Context

The shop map module (~1,600 lines) lives entirely inside a 9,011-line monolithic `App.tsx`. It has 22 state variables, 34 refs, 7 memos, 15+ callbacks, 120+ styles — all inlined alongside unrelated features (closet scan, stylist, wishlist). The goal is to extract it into well-organized files with custom hooks and focused components, following standard React/RN best practices.

## File Structure

```
src/shop/
  index.ts                         barrel export
  ShopTab.tsx                      orchestrator: wires hooks to components
  ShopDashboard.tsx                map + top overlay + bottom HUD
  ShopAssistant.tsx                camera + AI assistant view
  ShopStoreCard.tsx                single carousel card (React.memo)
  ShopMapMarkers.tsx               overlay markers loop (React.memo)
  ShopTryOnModal.tsx               in-store try-on modal
  hooks/
    useShopGeolocation.ts          location permission + requestCoordinates
    useShopMapGestures.ts          map center/zoom, Animated, gesture callbacks
    useShopStores.ts               store data, favorites, search, filtering
    useShopAssistant.ts            live client, audio, frame streaming
  utils/
    geo.ts                         estimateDistanceMeters, projectShopMarkerToMap, shopSearchRadiusForZoom, formatMeters
    sustainability.ts              normalizeSustainabilityScore, isCircularShopCategory, sustainabilityBand
  constants.ts                     MAX_SHOP_MAP_MARKERS, SHOP_FRAME_STREAM_INTERVAL_MS
  styles.ts                        all shop* StyleSheet entries
  types.ts                         ShopGeoPermission
```

## Extraction Steps (in dependency order)

### Step 1 — Pure utilities & constants (no component changes)
- Create `src/shop/types.ts` — move `ShopGeoPermission` type
- Create `src/shop/constants.ts` — move `MAX_SHOP_MAP_MARKERS` (line 468), `SHOP_FRAME_STREAM_INTERVAL_MS` (line 69)
- Create `src/shop/utils/geo.ts` — move `estimateDistanceMeters` (303-317), `projectShopMarkerToMap` (319-336), `shopSearchRadiusForZoom` (446-466), `formatMeters` (237-246)
- Create `src/shop/utils/sustainability.ts` — move `normalizeSustainabilityScore` (248-254), `isCircularShopCategory` (256-276), `sustainabilityBand` (278-290)
- Create `src/shop/styles.ts` — move all `shop*` style entries (lines 7554-8262) into their own `StyleSheet.create`. Import `C`, `CARD_RADIUS`, `CARD_SHADOW_LIGHT` from App.tsx (keep those shared constants in App.tsx for now since all tabs use them)
- Update App.tsx imports to use the new modules. **Verify: app compiles and runs identically.**

### Step 2 — Custom hooks
- **`useShopGeolocation(onError)`** — owns `geoPermission` state; contains `requestShopCoordinates` logic (lines 2163-2240). Returns `{ geoPermission, requestCoordinates }`.
- **`useShopMapGestures(params)`** — owns `mapCenter`, `mapZoom`, `mapSize` state + all gesture refs (`dragAnim`, `zoomScaleAnim`, `pinch*`, `drag*`, `lastWheel`, `lastTap`). Contains all gesture callbacks (`onMapLayout`, `onDragStart/Move/End`, `onWheel`), `onCarouselMomentumEnd`, `openStoreInMaps`, and the derived memos (`mapRegion`, `staticMapUrl`, `overlayMarkers`). Includes ref-sync effects.
  - Params: `{ location, selectedStore, selectedStoreId, setSelectedStoreId, perimeterStores, debouncedRefresh, windowWidth }`
  - Returns: all map state, refs, Animated values, gesture handlers, memos
- **`useShopStores(params)`** — owns stores, favorites, search, loading/error state + `autoRefreshDoneRef`, `placesCooldownRef`, `refreshTimerRef`. Contains `refreshShopDashboard`, `toggleFavoriteShopStore`, `debouncedRefreshShops`, filtering memos (`scopedStores`, `visibleStores`, `perimeterStores`, `selectedStore`), and the perimeterStores selection-sync effect.
  - Params: `{ userId, idToken, requestCoordinates, mapCenterRef, mapZoomRef, mapCenter, mapZoom }`
  - Returns: all store state, derived stores, refresh functions
- **`useShopAssistant(params)`** — owns all assistant state (`status`, `micStreaming`, `speakerEnabled`, `suggestedItemIds`, `tryOnImage`, `assistantActive`) + all client/audio refs. Contains `startShopSession`, `closeShopSession`, mic streaming, frame capture, `appendShopLine`.
  - Params: `{ userId, idToken, cameraRef, captureLiveVideoFrameBase64, selectedStore }`
  - Returns: all assistant state and actions

Hook wiring in ShopTab (handles the circular dependency between map and stores):
```ts
const geo = useShopGeolocation(onGeoError);
const mapGestures = useShopMapGestures({ ..., perimeterStores: stores.perimeterStores, debouncedRefresh: stores.debouncedRefresh });
const stores = useShopStores({ ..., requestCoordinates: geo.requestCoordinates, mapCenterRef: mapGestures.mapCenterRef, ... });
```
This works because React re-renders when any state changes — on first render `perimeterStores` is `[]`, then stores load and memos recompute.

**Verify: replace shop code in App.tsx with hook calls, confirm identical behavior.**

### Step 3 — Leaf components
- **`ShopStoreCard`** — extract the ~80-line carousel card (lines 5942-6021) into a `React.memo` component. Props: `{ store, cardWidth, selected, favoriteBusy, onSelect, onToggleFavorite, onOpenInMaps }`.
- **`ShopMapMarkers`** — extract the overlay markers loop (lines 5789-5825) into a `React.memo` component. Props: `{ markers, selectedStoreId, onSelectStore }`.
- **`ShopTryOnModal`** — extract the try-on modal (lines 6462-6491). Props: `{ visible, imageBase64, onClose }`.

### Step 4 — Composite components
- **`ShopAssistant`** — extract the camera + assistant UI (lines 5636-5741). Props: `{ cameraRef, status, suggestedItems, micStreaming, speakerEnabled, selectedStore, onClose, onStartSession, onStartMic, onStopMic, onToggleSpeaker }`.
- **`ShopDashboard`** — extract the map dashboard (lines 5743-6027). Uses `ShopStoreCard`, `ShopMapMarkers`. Props: all map state + gesture handlers + store data + action callbacks.

### Step 5 — Orchestrator + cleanup
- **`ShopTab`** — compose all hooks, resolve `shopSuggestedItems` memo (cross-references `wardrobeItems` prop with `suggestedItemIds`), handle tab auto-refresh effect (lines 3895-3913), render `ShopAssistant | ShopDashboard` + `ShopTryOnModal`. Props from App.tsx: `{ userId, idToken, isActive, cameraRef, cameraPermission, requestCameraPermission, captureLiveVideoFrameBase64, wardrobeItems, windowWidth }`.
- **`index.ts`** — barrel export of `ShopTab`.
- **Update App.tsx** — remove all shop code (~1,600 lines), replace with `<ShopTab ... />`. Move `refreshFavoriteStores` call from auth bootstrap into ShopTab's auto-refresh effect (it's already called via `refreshShopDashboard`).

## Key decisions
- **No new dependencies** — keep the static map approach, no react-native-maps
- **No shared constants extraction** — `C`, `CARD_RADIUS`, etc. stay in App.tsx since all tabs use them; shop styles import them via relative path
- **Shared styles** (e.g. `editorBackdrop`, `statusDot`) referenced by ShopAssistant/ShopTryOnModal — pass as props or duplicate the ~8 entries in shop styles.ts (pragmatic for a hackathon)
- **refreshFavoriteStores in auth bootstrap** (line 3838) — after extraction, ShopTab handles its own favorite loading in the auto-refresh effect; remove the auth-bootstrap call

## Files modified
- `apps/mobile/App.tsx` — remove ~1,600 lines of shop code, add `<ShopTab>` render
- `apps/mobile/src/shop/*` — all new files listed above

## Verification
1. `npx tsc --noEmit` — TypeScript compiles with no errors
2. `npx expo export --platform web --dev` — web bundle succeeds
3. Manual test on web (`npx expo start --web`): shop tab loads, map renders, drag/pinch/zoom work, store cards carousel works, search/filter works, favorites toggle, assistant launches
4. Confirm no regressions on other tabs (home, closet, wishlist)
