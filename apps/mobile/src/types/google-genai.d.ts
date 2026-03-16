declare module "@google/genai" {
  type LiveFunctionCall = {
    id?: string;
    name?: string;
    args?: Record<string, unknown>;
  };

  type LiveBlob = {
    data?: string;
    mimeType?: string;
  };

  type LivePart = {
    text?: string;
    inlineData?: LiveBlob;
  };

  export const Modality: {
    TEXT: string;
    AUDIO?: string;
    IMAGE?: string;
  };

  export class GoogleGenAI {
    constructor(config: { apiKey?: string; apiVersion?: string });
    live: {
      connect(input: {
        model: string;
        config?: Record<string, unknown>;
        callbacks?: {
          onopen?: () => void;
          onclose?: (event: { code?: number; reason?: string }) => void;
          onerror?: (event: unknown) => void;
          onmessage?: (message: {
            serverContent?: Record<string, unknown>;
            toolCall?: { functionCalls?: LiveFunctionCall[] };
            toolCallCancellation?: { ids?: string[] };
            data?: string;
            mimeType?: string;
          }) => void;
        };
      }): Promise<{
        sendClientContent: (input: {
          turns: Array<{
            role: string;
            parts: LivePart[];
          }>;
          turnComplete?: boolean;
        }) => Promise<void> | void;
        sendRealtimeInput?: (input: {
          media?: LiveBlob;
          audio?: LiveBlob;
          audioStreamEnd?: boolean;
        }) => Promise<void> | void;
        sendToolResponse?: (input: {
          functionResponses: Array<{
            id?: string;
            name?: string;
            response: Record<string, unknown>;
          }>;
        }) => Promise<void> | void;
        close: () => Promise<void>;
      }>;
    };
  }
}
