from app.agents.adk_runtime import AgentRuntime
from app.config import get_settings
from app.firestore_gateway import build_gateway
from app.services.gemini_live import GeminiLiveService
from app.services.optimizer_ai import WardrobeOptimizerService
from app.services.outfit_builder_ai import OutfitBuilderService
from app.services.shop_ai import ShopAIService
from app.services.wardrobe_ai import WardrobeAIService

settings = get_settings()
gateway = build_gateway(settings)
agent_runtime = AgentRuntime(settings)
gemini_live_service = GeminiLiveService(settings)
wardrobe_ai_service = WardrobeAIService(settings)
optimizer_service = WardrobeOptimizerService(settings, gateway)
outfit_builder_service = OutfitBuilderService(settings, gateway)
shop_ai_service = ShopAIService(settings, gateway)
