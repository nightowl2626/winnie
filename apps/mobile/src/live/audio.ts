import type { MutableRefObject } from "react";
import { Alert, Platform } from "react-native";

type InputAudioRefs = {
  audioContextRef: MutableRefObject<any>;
  mediaStreamRef: MutableRefObject<any>;
  processorRef: MutableRefObject<any>;
  sourceRef: MutableRefObject<any>;
  silentGainRef: MutableRefObject<any>;
};

type OutputAudioRefs = {
  audioContextRef: MutableRefObject<any>;
  playbackCursorRef: MutableRefObject<number>;
};

function normalizeBinaryPayload(
  base64OrDataUri: string,
  fallbackMimeType = "application/octet-stream"
): { data: string; mimeType: string } {
  let current = (base64OrDataUri || "").trim();
  let mimeType = fallbackMimeType.toLowerCase();
  for (let i = 0; i < 3; i += 1) {
    const match = current.match(/^data:([^;,]+)(?:;[^,]*)?,([\s\S]*)$/i);
    if (!match) {
      break;
    }
    mimeType = (match[1] || mimeType).toLowerCase();
    current = (match[2] || "").trim();
  }
  return {
    data: current.replace(/\s+/g, ""),
    mimeType,
  };
}

function extractSampleRate(mimeType?: string): number {
  if (!mimeType) {
    return 24000;
  }
  const match = mimeType.match(/rate=([0-9]+)/i);
  if (!match?.[1]) {
    return 24000;
  }
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 24000;
  }
  return parsed;
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const anyGlobal = globalThis as { atob?: (value: string) => string };
  if (!anyGlobal.atob) {
    throw new Error("Base64 decode is unavailable in this runtime");
  }
  const binary = anyGlobal.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function encodeBytesToBase64(bytes: Uint8Array): string {
  const anyGlobal = globalThis as { btoa?: (value: string) => string };
  if (!anyGlobal.btoa) {
    throw new Error("Base64 encode is unavailable in this runtime");
  }
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return anyGlobal.btoa(binary);
}

function pcm16BytesToFloat32(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(Math.floor(bytes.byteLength / 2));
  for (let i = 0; i < samples.length; i += 1) {
    const value = view.getInt16(i * 2, true);
    samples[i] = value / 0x8000;
  }
  return samples;
}

function float32ToPcm16Bytes(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    const intValue = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
    view.setInt16(i * 2, intValue, true);
  }
  return bytes;
}

function downsampleFloat32(
  input: Float32Array,
  inputRate: number,
  outputRate: number
): Float32Array {
  if (outputRate >= inputRate) {
    return input;
  }
  const ratio = inputRate / outputRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);
  let outputIndex = 0;
  let inputIndex = 0;
  while (outputIndex < outputLength) {
    const nextInputIndex = Math.round((outputIndex + 1) * ratio);
    let total = 0;
    let count = 0;
    for (let i = inputIndex; i < nextInputIndex && i < input.length; i += 1) {
      total += input[i] ?? 0;
      count += 1;
    }
    output[outputIndex] = count > 0 ? total / count : 0;
    outputIndex += 1;
    inputIndex = nextInputIndex;
  }
  return output;
}

async function cleanupInputAudio(params: {
  inputRefs: InputAudioRefs;
  onMicStreamingChange: (next: boolean) => void;
  onAudioStreamEnd?: () => Promise<void> | void;
}): Promise<void> {
  const { inputRefs } = params;
  try {
    if (inputRefs.processorRef.current) {
      inputRefs.processorRef.current.disconnect();
    }
    if (inputRefs.sourceRef.current) {
      inputRefs.sourceRef.current.disconnect();
    }
    if (inputRefs.silentGainRef.current) {
      inputRefs.silentGainRef.current.disconnect();
    }
    if (inputRefs.mediaStreamRef.current?.getTracks) {
      const tracks = inputRefs.mediaStreamRef.current.getTracks();
      for (const track of tracks) {
        track.stop();
      }
    }
    if (inputRefs.audioContextRef.current?.close) {
      await inputRefs.audioContextRef.current.close();
    }
    if (params.onAudioStreamEnd) {
      await params.onAudioStreamEnd();
    }
  } catch {
    // ignore cleanup errors
  } finally {
    inputRefs.processorRef.current = null;
    inputRefs.sourceRef.current = null;
    inputRefs.silentGainRef.current = null;
    inputRefs.mediaStreamRef.current = null;
    inputRefs.audioContextRef.current = null;
    params.onMicStreamingChange(false);
  }
}

export async function playWebPcmAudioChunk(params: {
  enabled: boolean;
  outputRefs: OutputAudioRefs;
  base64Data: string;
  mimeType?: string;
  onError: () => void;
}): Promise<void> {
  if (!params.enabled || Platform.OS !== "web") {
    return;
  }
  try {
    const anyWindow = globalThis as any;
    if (!anyWindow.AudioContext && !anyWindow.webkitAudioContext) {
      return;
    }
    const normalized = normalizeBinaryPayload(params.base64Data, params.mimeType || "audio/pcm;rate=24000");
    if (!normalized.data) {
      return;
    }
    if (!params.outputRefs.audioContextRef.current) {
      const AudioContextClass = anyWindow.AudioContext || anyWindow.webkitAudioContext;
      params.outputRefs.audioContextRef.current = new AudioContextClass({
        sampleRate: extractSampleRate(normalized.mimeType || params.mimeType),
      });
      params.outputRefs.playbackCursorRef.current = params.outputRefs.audioContextRef.current.currentTime;
    }
    const outputContext = params.outputRefs.audioContextRef.current;
    if (outputContext.state === "suspended") {
      await outputContext.resume();
    }
    const bytes = decodeBase64ToBytes(normalized.data);
    const samples = pcm16BytesToFloat32(bytes);
    const sampleRate = extractSampleRate(normalized.mimeType || params.mimeType);
    const buffer = outputContext.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(outputContext.destination);
    const startAt = Math.max(outputContext.currentTime, params.outputRefs.playbackCursorRef.current);
    source.start(startAt);
    params.outputRefs.playbackCursorRef.current = startAt + buffer.duration;
  } catch {
    params.onError();
  }
}

export async function startLiveMicStreaming(params: {
  micStreaming: boolean;
  inputRefs: InputAudioRefs;
  silent?: boolean;
  sessionLabel: string;
  missingSessionMessage: string;
  onMicStreamingChange: (next: boolean) => void;
  sendAudioChunk?: (payload: { data: string; mimeType: string }) => Promise<void> | void;
}): Promise<void> {
  const silent = Boolean(params.silent);
  if (Platform.OS !== "web") {
    if (!silent) {
      Alert.alert("Voice mode", "Mic streaming is currently supported on web in this build.");
    }
    return;
  }
  if (params.micStreaming) {
    return;
  }
  if (!params.sendAudioChunk) {
    if (!silent) {
      Alert.alert(params.sessionLabel, params.missingSessionMessage);
    }
    return;
  }

  try {
    const anyWindow = globalThis as any;
    const mediaDevices = anyWindow.navigator?.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      throw new Error("getUserMedia unavailable");
    }
    const stream = await mediaDevices.getUserMedia({ audio: true });
    const AudioContextClass = anyWindow.AudioContext || anyWindow.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("AudioContext unavailable");
    }

    const context = new AudioContextClass();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const silentGain = context.createGain();
    silentGain.gain.value = 0;

    processor.onaudioprocess = (event: any) => {
      const channelData = event.inputBuffer?.getChannelData(0);
      if (!channelData) {
        return;
      }
      const downsampled = downsampleFloat32(channelData, context.sampleRate, 16000);
      const pcmBytes = float32ToPcm16Bytes(downsampled);
      const encoded = encodeBytesToBase64(pcmBytes);
      void Promise.resolve(
        params.sendAudioChunk?.({
          data: encoded,
          mimeType: "audio/pcm;rate=16000",
        })
      );
    };

    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(context.destination);

    params.inputRefs.audioContextRef.current = context;
    params.inputRefs.mediaStreamRef.current = stream;
    params.inputRefs.processorRef.current = processor;
    params.inputRefs.sourceRef.current = source;
    params.inputRefs.silentGainRef.current = silentGain;
    params.onMicStreamingChange(true);
  } catch {
    params.onMicStreamingChange(false);
    if (!silent) {
      Alert.alert(
        "Mic stream error",
        "Could not start microphone streaming. Check browser microphone permissions."
      );
    }
  }
}

export async function stopLiveMicStreaming(params: {
  inputRefs: InputAudioRefs;
  onMicStreamingChange: (next: boolean) => void;
  onAudioStreamEnd?: () => Promise<void> | void;
}): Promise<void> {
  await cleanupInputAudio(params);
}

export async function closeLiveAudioSession(params: {
  inputRefs: InputAudioRefs;
  outputRefs: OutputAudioRefs;
  onMicStreamingChange: (next: boolean) => void;
  closeClient?: () => Promise<void>;
  onCloseWarning?: () => void;
}): Promise<void> {
  await cleanupInputAudio({
    inputRefs: params.inputRefs,
    onMicStreamingChange: params.onMicStreamingChange,
  });

  if (params.closeClient) {
    try {
      await params.closeClient();
    } catch {
      params.onCloseWarning?.();
    }
  }

  try {
    if (params.outputRefs.audioContextRef.current?.close) {
      await params.outputRefs.audioContextRef.current.close();
    }
  } catch {
    // ignore
  } finally {
    params.outputRefs.audioContextRef.current = null;
    params.outputRefs.playbackCursorRef.current = 0;
  }
}
