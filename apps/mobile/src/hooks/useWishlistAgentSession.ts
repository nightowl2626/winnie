import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { createLiveEphemeralToken, dispatchWardrobeTool, getWishlist } from "../api";
import type { ConciergeSessionState } from "../concierge/types";
import { startLiveMicStreaming, stopLiveMicStreaming, playWebPcmAudioChunk, closeLiveAudioSession } from "../live/audio";
import type { LiveClientHandle } from "../live";
import { createLiveTextClient } from "../live";
import type { LiveLine, LiveStatus } from "../live/types";
import type { WishlistItem } from "../types";

type PatchConciergeSession = (
  updater:
    | Partial<Omit<ConciergeSessionState, "transcriptThread">>
    | ((
        current: ConciergeSessionState
      ) => Partial<Omit<ConciergeSessionState, "transcriptThread">>)
) => void;

type RouteHandlerRef = MutableRefObject<
  | ((
      sourceMode: "concierge" | "scan" | "stylist" | "wishlist" | "shop",
      args: Record<string, unknown>
    ) => Promise<Record<string, unknown>>)
  | null
>;

type UseWishlistAgentSessionParams = {
  userId: string;
  idToken?: string;
  liveModel: string;
  appendTranscript: (role: LiveLine["role"], text: string) => void;
  patchConciergeSession: PatchConciergeSession;
  routeHandlerRef: RouteHandlerRef;
  deliverPendingHandoff: (
    client: LiveClientHandle,
    appendLine: (role: LiveLine["role"], text: string) => void
  ) => Promise<void>;
  setWishlistItems: Dispatch<SetStateAction<WishlistItem[]>>;
};

export function useWishlistAgentSession(params: UseWishlistAgentSessionParams) {
  const {
    userId,
    idToken,
    liveModel,
    appendTranscript,
    patchConciergeSession,
    routeHandlerRef,
    deliverPendingHandoff,
    setWishlistItems,
  } = params;
  const clientRef = useRef<LiveClientHandle | null>(null);
  const inputAudioContextRef = useRef<any>(null);
  const inputMediaStreamRef = useRef<any>(null);
  const inputProcessorRef = useRef<any>(null);
  const inputSourceRef = useRef<any>(null);
  const inputSilentGainRef = useRef<any>(null);
  const outputAudioContextRef = useRef<any>(null);
  const outputPlaybackCursorRef = useRef(0);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [status, setStatus] = useState<LiveStatus>("offline");
  const [modelName, setModelName] = useState("");
  const [micStreaming, setMicStreaming] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [lines, setLines] = useState<LiveLine[]>([]);

  const appendLine = useCallback(
    (role: LiveLine["role"], text: string) => {
      const clean = text.trim();
      if (!clean) {
        return;
      }
      appendTranscript(role, clean);
      setLines((existing) => {
        const next: LiveLine = {
          id: `${Date.now()}-${Math.random()}`,
          role,
          text: clean,
        };
        return [next, ...existing].slice(0, 16);
      });
    },
    [appendTranscript]
  );

  const markSpeaking = useCallback(() => {
    setSpeaking(true);
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
    }
    speakingTimeoutRef.current = setTimeout(() => {
      setSpeaking(false);
      speakingTimeoutRef.current = null;
    }, 640);
  }, []);

  const playAudioChunk = useCallback(
    async (base64Data: string, mimeType?: string) => {
      markSpeaking();
      await playWebPcmAudioChunk({
        enabled: speakerEnabled,
        outputRefs: {
          audioContextRef: outputAudioContextRef,
          playbackCursorRef: outputPlaybackCursorRef,
        },
        base64Data,
        mimeType,
        onError: () => appendLine("system", "Could not play wishlist agent audio chunk."),
      });
    },
    [appendLine, markSpeaking, speakerEnabled]
  );

  const startMic = useCallback(
    async (silent = false) => {
      await startLiveMicStreaming({
        micStreaming,
        inputRefs: {
          audioContextRef: inputAudioContextRef,
          mediaStreamRef: inputMediaStreamRef,
          processorRef: inputProcessorRef,
          sourceRef: inputSourceRef,
          silentGainRef: inputSilentGainRef,
        },
        silent,
        sessionLabel: "Wishlist session",
        missingSessionMessage: "Connect wishlist assistant before enabling mic.",
        onMicStreamingChange: setMicStreaming,
        sendAudioChunk: (payload) => clientRef.current?.sendRealtimeAudio(payload),
      });
    },
    [micStreaming]
  );

  const stopMic = useCallback(async () => {
    await stopLiveMicStreaming({
      inputRefs: {
        audioContextRef: inputAudioContextRef,
        mediaStreamRef: inputMediaStreamRef,
        processorRef: inputProcessorRef,
        sourceRef: inputSourceRef,
        silentGainRef: inputSilentGainRef,
      },
      onMicStreamingChange: setMicStreaming,
      onAudioStreamEnd: () => clientRef.current?.endAudioStream(),
    });
  }, []);

  const closeSession = useCallback(async () => {
    await closeLiveAudioSession({
      inputRefs: {
        audioContextRef: inputAudioContextRef,
        mediaStreamRef: inputMediaStreamRef,
        processorRef: inputProcessorRef,
        sourceRef: inputSourceRef,
        silentGainRef: inputSilentGainRef,
      },
      outputRefs: {
        audioContextRef: outputAudioContextRef,
        playbackCursorRef: outputPlaybackCursorRef,
      },
      onMicStreamingChange: setMicStreaming,
      closeClient: async () => {
        const client = clientRef.current;
        clientRef.current = null;
        if (client) {
          await client.close();
        }
      },
      onCloseWarning: () => appendLine("system", "Wishlist session closed with a warning."),
    });
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    setSpeaking(false);
    setStatus("offline");
    setModelName("");
  }, [appendLine]);

  const startSession = useCallback(async () => {
    await closeSession();
    setStatus("connecting");
    appendLine("system", "Connecting wishlist assistant...");
    appendLine("system", `Trying Live model ${liveModel}...`);

    try {
      const token = await createLiveEphemeralToken(userId, idToken, {
        model: liveModel,
        mode: "wishlist",
        uses: 1,
        session_ttl_seconds: 1800,
        new_session_ttl_seconds: 300,
        enable_session_resumption: false,
      });
      const connectedModel = token.model || liveModel;
      const wishlistClient = await createLiveTextClient({
        ephemeralToken: token.token,
        model: connectedModel,
        voiceName: "Zephyr",
        systemInstruction:
          "You are a live wishlist assistant. " +
          "This is NOT wardrobe scan and NOT outfit styling. " +
          "Help the user quickly add wishlist items from conversation. " +
          "Use fetch_wishlist to check existing items first. " +
          "Use add_wishlist_item to save new entries. " +
          "If the user wants outfit advice, garment scanning, or in-store shopping help instead, call route_to_specialist. Include a short summary of what they want next and any obvious item context. " +
          "Keep responses short and natural. " +
          "Never ask for or mention budget or price.",
        onEvent: (event) => {
          if (event.includes("session open")) {
            setStatus("connected");
          }
          if (event.includes("session closed")) {
            setStatus("offline");
            clientRef.current = null;
            void stopMic();
            appendLine("system", event);
          }
          if (event.includes("error")) {
            setStatus("error");
            appendLine("system", event);
          }
        },
        onText: () => {
          markSpeaking();
        },
        onAudioChunk: (data, mimeType) => {
          void playAudioChunk(data, mimeType);
        },
        onToolCall: async (functionName, args) => {
          if (functionName === "route_to_specialist") {
            appendLine("system", `[route] ${JSON.stringify(args)}`);
            if (!routeHandlerRef.current) {
              return { error: "Route handler unavailable" };
            }
            return routeHandlerRef.current("wishlist", args);
          }
          const allowedTool = functionName === "fetch_wishlist" || functionName === "add_wishlist_item";
          if (!allowedTool) {
            appendLine("system", `[tool] blocked ${functionName}`);
            return { error: "Unsupported tool in wishlist mode" };
          }
          appendLine("system", `[tool] call ${functionName} ${JSON.stringify(args)}`);
          const response = await dispatchWardrobeTool(
            userId,
            {
              function_name: functionName,
              args,
            },
            idToken
          );
          const result = response.result as Record<string, unknown>;
          if (functionName === "add_wishlist_item") {
            const itemRaw = result.item;
            if (itemRaw && typeof itemRaw === "object") {
              const row = itemRaw as Record<string, unknown>;
              const normalized: WishlistItem = {
                id: String(row.id || `${Date.now()}`),
                category: String(row.category || "").trim(),
                color: typeof row.color === "string" ? row.color : undefined,
                size: typeof row.size === "string" ? row.size : undefined,
                notes: typeof row.notes === "string" ? row.notes : undefined,
              };
              patchConciergeSession((current) => ({
                recentWishlistItemIds: [normalized.id, ...current.recentWishlistItemIds].slice(0, 8),
                handoffReason: "Saved that item into wishlist memory.",
              }));
              setWishlistItems((current) => {
                const existingIndex = current.findIndex((item) => item.id === normalized.id);
                if (existingIndex >= 0) {
                  const next = [...current];
                  next[existingIndex] = normalized;
                  return next;
                }
                return [normalized, ...current];
              });
            } else {
              try {
                const next = await getWishlist(userId, idToken);
                setWishlistItems(next);
              } catch {
                // keep current local wishlist if refresh fails
              }
            }
          }
          if (functionName === "fetch_wishlist") {
            const compactItems = Array.isArray(result.items)
              ? result.items.slice(0, 25).map((raw) => {
                  const row = raw as Record<string, unknown>;
                  return {
                    id: String(row.id || ""),
                    category: String(row.category || ""),
                    color: typeof row.color === "string" ? row.color : null,
                    size: typeof row.size === "string" ? row.size : null,
                    notes: typeof row.notes === "string" ? row.notes : null,
                  };
                })
              : [];
            appendLine("system", `[tool] result ${functionName}`);
            return {
              status: String(result.status ?? "ok"),
              count: Number(result.count ?? compactItems.length) || compactItems.length,
              items: compactItems,
            };
          }
          appendLine("system", `[tool] result ${functionName}`);
          return result;
        },
      });
      clientRef.current = wishlistClient;
      setStatus("connected");
      setModelName(connectedModel);
      appendLine("system", `Wishlist assistant connected on ${connectedModel}.`);
      await deliverPendingHandoff(wishlistClient, appendLine);
      void startMic(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("error");
      appendLine("system", `Wishlist assistant unavailable. ${message}`);
    }
  }, [
    appendLine,
    closeSession,
    deliverPendingHandoff,
    idToken,
    liveModel,
    markSpeaking,
    playAudioChunk,
    patchConciergeSession,
    routeHandlerRef,
    setWishlistItems,
    startMic,
    stopMic,
    userId,
  ]);

  const ensureSession = useCallback(
    async (reset = false) => {
      if (reset) {
        setLines([]);
      }
      if (clientRef.current || status === "connecting") {
        return;
      }
      await startSession();
    },
    [startSession, status]
  );

  const prepareSession = useCallback(async () => {
    await ensureSession(true);
  }, [ensureSession]);

  const openAgent = useCallback(async () => {
    setModalVisible(true);
    await prepareSession();
  }, [prepareSession]);

  const closeAgent = useCallback(async () => {
    setModalVisible(false);
    await closeSession();
  }, [closeSession]);

  useEffect(() => {
    return () => {
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
        speakingTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    modalVisible,
    setModalVisible,
    status,
    modelName,
    micStreaming,
    speakerEnabled,
    setSpeakerEnabled,
    speaking,
    lines,
    startSession,
    closeSession,
    startMicStreaming: startMic,
    stopMicStreaming: stopMic,
    ensureSession,
    prepareSession,
    openAgent,
    closeAgent,
  };
}
