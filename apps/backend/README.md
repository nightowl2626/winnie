# Backend Service

FastAPI service scaffold for:
- Wishlist management
- Store inventory drop creation
- Server-side inventory-to-wishlist matching
- Notification record creation + FCM send hook
- ADK/Gemini integration points

## Run Local
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8080
```

## Health Check
`GET /health`

## Main Endpoints
- `GET /v1/wishlist/{user_id}`
- `POST /v1/wishlist/{user_id}`
- `PUT /v1/wishlist/{user_id}/{item_id}`
- `DELETE /v1/wishlist/{user_id}/{item_id}`
- `GET /v1/wardrobe/{user_id}`
- `POST /v1/inventory/{store_id}/drop`
- `GET /v1/notifications/{user_id}`
- `POST /v1/users/{user_id}/device-token`
- `GET /v1/users/{user_id}/device-token`
- `POST /v1/live/ephemeral-token/{user_id}`
- `POST /v1/agents/wardrobe/guide`
- `POST /v1/agents/wardrobe/analyze-frame/{user_id}`
- `POST /v1/agents/wardrobe/analyze-and-save/{user_id}`
- `POST /v1/demo/run-flow/{user_id}/{store_id}`

## Auth Mode
- Set `REQUIRE_AUTH=true` to enforce Firebase ID token auth.
- Send bearer token header:
  - `Authorization: Bearer <firebase-id-token>`
- User routes enforce `token.uid == {user_id}`.

## Gemini Live Token Endpoint
For Live API client sessions, mint short-lived ephemeral tokens server-side:

```bash
curl -X POST http://localhost:8080/v1/live/ephemeral-token/<user_id> \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"gemini-2.5-flash-native-audio-preview-12-2025\",
    \"uses\": 1,
    \"session_ttl_seconds\": 1800,
    \"new_session_ttl_seconds\": 300,
    \"enable_session_resumption\": false
  }"
```

Requires backend env:
- `GEMINI_API_KEY=...`
- `GEMINI_LIVE_MODEL=...`

## One-Call Demo Flow
Run the full MVP flow in one request:
1. Wardrobe notes analysis
2. Gap-based wishlist generation and save
3. Store inventory drop creation
4. Wishlist matching and notification creation

Example:
```bash
curl -X POST http://localhost:8080/v1/demo/run-flow/demo-user/demo-store \
  -H "Content-Type: application/json" \
  -d "{
    \"frame_notes\": [\"white shirt\", \"blue jeans\", \"black dress\"],
    \"store_item\": {
      \"title\": \"Camel Wool Coat\",
      \"category\": \"outerwear\",
      \"color\": \"camel\",
      \"size\": \"m\",
      \"price\": 69
    }
  }"
```

PowerShell alternative:
```powershell
.\scripts\run_demo_flow.ps1
```
