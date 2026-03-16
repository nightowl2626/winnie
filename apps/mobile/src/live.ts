import { GoogleGenAI, Modality } from "@google/genai";

export type LiveClientHandle = {
  sendText: (text: string) => Promise<void>;
  sendRealtimeAudio: (input: { data: string; mimeType?: string }) => Promise<void>;
  sendRealtimeMedia: (input: { data: string; mimeType?: string }) => Promise<void>;
  endAudioStream: () => Promise<void>;
  close: () => Promise<void>;
};

type CreateLiveClientInput = {
  ephemeralToken: string;
  model: string;
  onEvent: (event: string) => void;
  onText?: (text: string) => void;
  onAudioChunk?: (data: string, mimeType?: string) => void;
  onGrounding?: (payload: {
    webSearchQueries: string[];
    webResults: Array<{ title: string; url: string; domain?: string }>;
  }) => void;
  onToolCall?: (
    functionName: string,
    args: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  systemInstruction?: string;
  responseModalities?: string[];
  voiceName?: string;
};

function normalizeBase64Payload(inputData: string): { data: string; mimeTypeFromDataUri?: string } {
  const trimmed = inputData.trim();
  const match = trimmed.match(/^data:([^;,]+)(?:;[^,]*)?,(.*)$/i);
  if (!match) {
    return { data: trimmed.replace(/\s+/g, "") };
  }
  const mimeTypeFromDataUri = match[1]?.trim().toLowerCase() || undefined;
  const body = (match[2] ?? "").trim();
  return { data: body.replace(/\s+/g, ""), mimeTypeFromDataUri };
}

function stringifySafe(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeToolArgs(args: unknown): Record<string, unknown> {
  if (args && typeof args === "object" && !Array.isArray(args)) {
    return args as Record<string, unknown>;
  }
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function sanitizeToolResultForLive(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return "[truncated-depth]";
  }
  if (value === undefined) {
    return null;
  }
  if (value == null) {
    return value;
  }
  if (typeof value === "string") {
    const max = 1500;
    if (value.length <= max) {
      return value;
    }
    return `${value.slice(0, max)}...[truncated ${value.length - max} chars]`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 30).map((entry) => sanitizeToolResultForLive(entry, depth + 1));
  }
  if (typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    const entries = Object.entries(input).slice(0, 40);
    for (const [key, entry] of entries) {
      output[key] = sanitizeToolResultForLive(entry, depth + 1);
    }
    return output;
  }
  return String(value);
}

function collectTextValues(payload: unknown, buffer: string[]): void {
  if (!payload) {
    return;
  }
  if (Array.isArray(payload)) {
    for (const value of payload) {
      collectTextValues(value, buffer);
    }
    return;
  }
  if (typeof payload !== "object") {
    return;
  }

  const record = payload as Record<string, unknown>;
  if (record.thought === true) {
    return;
  }
  const maybeText = record.text;
  if (typeof maybeText === "string") {
    const clean = maybeText.trim();
    if (clean) {
      buffer.push(clean);
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase().includes("thought")) {
      continue;
    }
    collectTextValues(value, buffer);
  }
}

function extractMessageText(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const modelTurn = record.modelTurn;
    if (modelTurn && typeof modelTurn === "object") {
      const parts = (modelTurn as Record<string, unknown>).parts;
      if (Array.isArray(parts)) {
        const directPartsText: string[] = [];
        for (const part of parts) {
          if (!part || typeof part !== "object") {
            continue;
          }
          const partRecord = part as Record<string, unknown>;
          if (partRecord.thought === true) {
            continue;
          }
          const maybeText = partRecord.text;
          if (typeof maybeText === "string" && maybeText.trim()) {
            directPartsText.push(maybeText.trim());
          }
        }
        if (directPartsText.length) {
          return directPartsText.join(" ").trim();
        }
      }
    }
  }

  const texts: string[] = [];
  collectTextValues(payload, texts);
  if (!texts.length) {
    return "";
  }

  const deduped: string[] = [];
  for (const value of texts) {
    if (!deduped.includes(value)) {
      deduped.push(value);
    }
  }
  return deduped.join(" ").trim();
}

function collectAudioChunks(
  payload: unknown,
  buffer: Array<{ data: string; mimeType?: string }>
): void {
  if (!payload) {
    return;
  }
  if (Array.isArray(payload)) {
    for (const value of payload) {
      collectAudioChunks(value, buffer);
    }
    return;
  }
  if (typeof payload !== "object") {
    return;
  }

  const record = payload as Record<string, unknown>;
  const maybeData = record.data;
  const maybeMime = record.mimeType;
  if (typeof maybeData === "string") {
    const normalizedMime = typeof maybeMime === "string" ? maybeMime.toLowerCase() : "";
    if (normalizedMime.startsWith("audio/")) {
      buffer.push({
        data: maybeData,
        mimeType: typeof maybeMime === "string" ? maybeMime : undefined
      });
    }
  }

  for (const value of Object.values(record)) {
    collectAudioChunks(value, buffer);
  }
}

function extractAudioChunks(payload: unknown): Array<{ data: string; mimeType?: string }> {
  const chunks: Array<{ data: string; mimeType?: string }> = [];
  collectAudioChunks(payload, chunks);
  return chunks;
}

function extractGroundingPayload(payload: unknown): {
  webSearchQueries: string[];
  webResults: Array<{ title: string; url: string; domain?: string }>;
} | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const groundingMetadata =
    record.groundingMetadata && typeof record.groundingMetadata === "object"
      ? (record.groundingMetadata as Record<string, unknown>)
      : null;
  if (!groundingMetadata) {
    return null;
  }

  const webSearchQueries = Array.isArray(groundingMetadata.webSearchQueries)
    ? groundingMetadata.webSearchQueries
        .map((value) => String(value).trim())
        .filter((value) => Boolean(value))
    : [];

  const seenUrls = new Set<string>();
  const webResults = Array.isArray(groundingMetadata.groundingChunks)
    ? groundingMetadata.groundingChunks
        .flatMap((chunk) => {
          if (!chunk || typeof chunk !== "object") {
            return [];
          }
          const web = (chunk as Record<string, unknown>).web;
          if (!web || typeof web !== "object") {
            return [];
          }
          const webRecord = web as Record<string, unknown>;
          const url = String(webRecord.uri || "").trim();
          if (!url || seenUrls.has(url)) {
            return [];
          }
          seenUrls.add(url);
          return [
            {
              title: String(webRecord.title || "").trim() || url,
              url,
              domain:
                typeof webRecord.domain === "string" && webRecord.domain.trim()
                  ? webRecord.domain.trim()
                  : undefined
            }
          ];
        })
        .slice(0, 6)
    : [];

  if (!webSearchQueries.length && !webResults.length) {
    return null;
  }
  return { webSearchQueries, webResults };
}

export async function createLiveTextClient(
  input: CreateLiveClientInput
): Promise<LiveClientHandle> {
  const ai = new GoogleGenAI({
    apiKey: input.ephemeralToken,
    apiVersion: "v1alpha"
  });
  let isClosed = false;

  const session = await ai.live.connect({
    model: input.model,
    config: {
      responseModalities: input.responseModalities ?? [Modality.AUDIO],
      mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: input.voiceName ?? "Zephyr"
          }
        }
      },
      contextWindowCompression: {
        triggerTokens: 104857,
        slidingWindow: {
          targetTokens: 52428
        }
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: input.systemInstruction
    },
    callbacks: {
      onopen: () => input.onEvent("[live] session open"),
      onclose: (event: { code?: number; reason?: string }) => {
        isClosed = true;
        input.onEvent(`[live] session closed code=${event.code} reason=${event.reason}`);
      },
      onerror: (event: unknown) => input.onEvent(`[live] error ${stringifySafe(event)}`),
      onmessage: (message: unknown) => {
        const maybeMessage = message as {
          serverContent?: { turnComplete?: boolean } & Record<string, unknown>;
          toolCall?: {
            functionCalls?: Array<{
              id?: string;
              name?: string;
              args?: unknown;
            }>;
          };
          toolCallCancellation?: { ids?: string[] };
        };
        const messagePayload = maybeMessage.serverContent ?? maybeMessage;

        const functionCalls = maybeMessage.toolCall?.functionCalls ?? [];
        if (functionCalls.length) {
          input.onEvent(`[live] tool_call ${stringifySafe(functionCalls)}`);
          void (async () => {
            if (!session.sendToolResponse) {
              input.onEvent("[live] tool_call ignored: sendToolResponse unavailable");
              return;
            }
            const functionResponses: Array<{
              id?: string;
              name?: string;
              response: Record<string, unknown>;
            }> = [];

            for (const call of functionCalls) {
              const functionName = (call.name || "").trim();
              const args = normalizeToolArgs(call.args);
              if (!functionName) {
                functionResponses.push({
                  id: call.id,
                  name: call.name,
                  response: { error: "Missing function name" }
                });
                continue;
              }

              try {
                if (!input.onToolCall) {
                  throw new Error("No frontend tool dispatcher configured");
                }
                const toolResult = await input.onToolCall(functionName, args);
                const safeToolResult = sanitizeToolResultForLive(toolResult);
                const responsePayload =
                  safeToolResult && typeof safeToolResult === "object" && !Array.isArray(safeToolResult)
                    ? (safeToolResult as Record<string, unknown>)
                    : { result: safeToolResult };
                functionResponses.push({
                  id: call.id,
                  name: functionName,
                  response: responsePayload
                });
              } catch (error) {
                const messageText = error instanceof Error ? error.message : String(error);
                functionResponses.push({
                  id: call.id,
                  name: functionName,
                  response: { error: messageText }
                });
              }
            }

            try {
              if (isClosed) {
                return;
              }
              await Promise.resolve(session.sendToolResponse?.({ functionResponses }));
              input.onEvent(`[live] tool_response ${stringifySafe(functionResponses)}`);
            } catch (error) {
              input.onEvent(`[live] tool_response_error ${stringifySafe(error)}`);
            }
          })();
        }
        if (maybeMessage.toolCallCancellation?.ids?.length) {
          input.onEvent(
            `[live] tool_call_cancellation ${stringifySafe(maybeMessage.toolCallCancellation.ids)}`
          );
        }

        const audioChunks = extractAudioChunks(messagePayload);
        for (const chunk of audioChunks) {
          input.onAudioChunk?.(chunk.data, chunk.mimeType);
        }

        const grounding = extractGroundingPayload(messagePayload);
        if (grounding) {
          input.onGrounding?.(grounding);
        }

        const extractedText = extractMessageText(messagePayload);
        if (extractedText) {
          input.onText?.(extractedText);
        }
        input.onEvent(
          `[live] message ${stringifySafe(messagePayload)}`
        );
      }
    }
  });

  async function sendRealtimeInput(inputPayload: {
    media?: { data?: string; mimeType?: string };
    audio?: { data?: string; mimeType?: string };
    audioStreamEnd?: boolean;
  }): Promise<void> {
    if (isClosed) {
      return;
    }
    if (!session.sendRealtimeInput) {
      throw new Error("Live realtime input is not available in this SDK session");
    }
    try {
      await Promise.resolve(session.sendRealtimeInput(inputPayload));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("closing or closed state")) {
        isClosed = true;
        return;
      }
      throw error;
    }
  }

  return {
    async sendText(text: string) {
      if (isClosed) {
        return;
      }
      try {
        await Promise.resolve(session.sendClientContent({
          turns: [
            {
              role: "user",
              parts: [{ text }]
            }
          ],
          turnComplete: true
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes("closing or closed state")) {
          isClosed = true;
          return;
        }
        throw error;
      }
    },
    async sendRealtimeAudio(audioInput: { data: string; mimeType?: string }) {
      const normalized = normalizeBase64Payload(audioInput.data);
      await sendRealtimeInput({
        audio: {
          data: normalized.data,
          mimeType: audioInput.mimeType ?? "audio/pcm;rate=16000"
        }
      });
    },
    async sendRealtimeMedia(mediaInput: { data: string; mimeType?: string }) {
      const normalized = normalizeBase64Payload(mediaInput.data);
      await sendRealtimeInput({
        media: {
          data: normalized.data,
          mimeType: mediaInput.mimeType ?? normalized.mimeTypeFromDataUri ?? "image/jpeg"
        }
      });
    },
    async endAudioStream() {
      await sendRealtimeInput({ audioStreamEnd: true });
    },
    async close() {
      isClosed = true;
      await Promise.resolve(session.close());
    }
  };
}
