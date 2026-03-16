import { Platform } from "react-native";

/**
 * Web font loading: injects Google Fonts link tag into document head.
 * Called once at app initialization on web only.
 */
export function loadWebFonts(): void {
  if (Platform.OS !== "web") return;

  const doc = globalThis.document;
  if (!doc) return;

  // Check if already loaded
  if (doc.getElementById("winnie-fonts")) return;

  const link = doc.createElement("link");
  link.id = "winnie-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@400;700;800;900&display=swap";
  doc.head.appendChild(link);
}

/**
 * For native, expo-font loading config.
 * Import and use with `Font.loadAsync(nativeFonts)` in app initialization.
 */
export const nativeFonts: Record<string, any> = {};

// These will be populated if @expo-google-fonts packages are installed:
// import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
// import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
// nativeFonts.PlayfairDisplay_700Bold = PlayfairDisplay_700Bold;
// nativeFonts.Inter_400Regular = Inter_400Regular;
// etc.
