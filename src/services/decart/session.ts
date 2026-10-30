import type {
  ConnectionState,
  DecartSDKError,
  RealTimeClient,
  RealTimeEvents,
  SetInput,
} from '@decartai/sdk';
import type {
  LucyMirrorMode,
  LucySessionError,
  LucySessionSnapshot,
  SessionStatus,
} from '@/types';
import {
  SessionCredentialError,
  type SessionCredentialProvider,
} from './credentials';

export const LUCY_MODEL_ID = 'lucy-2.5' as const;
export const LUCY_MODEL_LABEL = 'Dallr Cam 2.5';
export const LUCY_MODEL_SPEC = {
  width: 1280,
  height: 720,
  fps: 30,
} as const;

type DecartClient = ReturnType<(typeof import('@decartai/sdk'))['createDecartClient']>;
type SdkModule = typeof import('@decartai/sdk');

export interface LucySessionStartInput {
  prompt: string;
  referenceFile: File | null;
  deviceId: string | null;
  mirror: boolean;
}

export interface LucySessionStartOptions extends LucySessionStartInput {
  credentials: SessionCredentialProvider;
  onSnapshot: (snapshot: LucySessionSnapshot) => void;
  onLocalStream: (stream: MediaStream | null) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onEnded?: (summary: LucySessionSummary) => void;
}

export interface LucySessionSummary {
  status: SessionStatus;
  startedAt: number | null;
  endedAt: number;
  durationSec: number;
  cameraLabel: string;
  prompt: string;
  referenceName: string | null;
  providerSeconds: number | null;
}

export const INITIAL_SESSION_SNAPSHOT: LucySessionSnapshot = {
  status: 'idle',
  error: null,
  sessionId: null,
  startedAt: null,
  endedAt: null,
  providerSeconds: null,
  cameraLabel: null,
  mirror: null,
  updatePending: false,
};

interface SessionListeners {
  onSnapshot: ((snapshot: LucySessionSnapshot) => void) | null;
  onLocalStream: ((stream: MediaStream | null) => void) | null;
  onRemoteStream: ((stream: MediaStream | null) => void) | null;
  onEnded: ((summary: LucySessionSummary) => void) | null;
}

type ModelSpec = {
  width: number;
  height: number;
  fps: number | MediaTrackConstraints['frameRate'];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return 'Unknown error';
}

export function buildVideoConstraints(
  deviceId: string | null,
  model: ModelSpec,
): MediaTrackConstraints {
  const constraints: MediaTrackConstraints = {
    width: { ideal: model.width },
    height: { ideal: model.height },
    frameRate: model.fps,
  };

  if (deviceId) {
    return { ...constraints, deviceId: { ideal: deviceId } };
  }

  return { ...constraints, facingMode: 'user' };
}

/**
 * Verifies that a camera MediaStream is actively producing video frames before dialing Decart.
 * In browser environments, checks readyState, muted status, and verifies that at least one frame
 * renders via requestVideoFrameCallback/playing within the timeout window.
 */
export async function verifyStreamFrames(
  stream: MediaStream,
  timeoutMs = 2500,
): Promise<{ ok: boolean; reason?: string; hint?: string }> {
  const track = stream.getVideoTracks()[0];
  if (!track) {
    return {
      ok: false,
      reason: 'No video track found on the selected camera device.',
      hint: 'Ensure your camera is plugged in and recognized by your system.',
    };
  }

  if (track.readyState && track.readyState !== 'live') {
    return {
      ok: false,
      reason: `Camera track is not live (state: ${track.readyState}).`,
      hint: 'The camera may have been disconnected or stopped by the operating system.',
    };
  }

  if (track.enabled === false) {
    track.enabled = true;
  }

  if (
    typeof document === 'undefined' ||
    typeof HTMLVideoElement === 'undefined' ||
    (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) ||
    !('requestVideoFrameCallback' in HTMLVideoElement.prototype)
  ) {
    return { ok: !track.muted };
  }

  return new Promise((resolve) => {
    let finished = false;
    const video = document.createElement('video');
    video.muted = true;
    (video as unknown as { defaultMuted: boolean }).defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;

    const cleanup = () => {
      try {
        video.srcObject = null;
        video.remove();
      } catch {
        // cleanup best-effort
      }
    };

    const timer = window.setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();

      if (track.muted) {
        resolve({
          ok: false,
          reason: 'Your camera is active but muted by Windows or physical hardware.',
          hint: 'Open your webcam privacy shutter/slider, or check Windows Settings → Privacy & security → Camera.',
        });
      } else {
        resolve({
          ok: false,
          reason: 'Camera is not delivering video frames to the browser.',
          hint: 'Another application (such as OBS, Zoom, or Teams) may have an exclusive lock on this webcam, or the camera is in standby.',
        });
      }
    }, timeoutMs);

    const onFrame = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      cleanup();
      resolve({ ok: true });
    };

    try {
      video.srcObject = stream;
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }

      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        (video as HTMLVideoElement).requestVideoFrameCallback(() => onFrame());
      } else {
        video.addEventListener('playing', onFrame, { once: true });
        video.addEventListener('timeupdate', () => {
          if (video.currentTime > 0) onFrame();
        });
      }
    } catch {
      window.clearTimeout(timer);
      cleanup();
      resolve({ ok: !track.muted });
    }
  });
}

/**
 * `mirror: "auto"` only works when the browser reports a facing mode. Desktop
 * webcams usually omit it, so we assume a front-facing camera in that case.
 */
export function resolveMirrorOption(
  mirror: boolean,
  facingMode: string | undefined,
): LucyMirrorMode {
  if (!mirror) return false;
  return facingMode ? 'auto' : true;
}

/**
 * Resizes large image files to fit within Lucy 2.5's 720p envelope (max 1280px)
 * to prevent massive base64 payloads from overflowing WebSocket signaling frame limits.
 */
export async function prepareReferenceImage(file: File): Promise<Blob | File> {
  if (
    typeof Image === 'undefined' ||
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    file.size <= 600 * 1024
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1280;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          resolve(blob ?? file);
        },
        'image/jpeg',
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export function mapCameraError(error: unknown): LucySessionError {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return {
          code: 'camera-denied',
          title: 'Camera access blocked',
          message:
            'Dallr could not open your camera. Allow camera access for this app, then try again.',
          hint: 'On Windows, check Settings → Privacy & security → Camera. On macOS, check System Settings → Privacy & Security → Camera.',
          fatal: true,
        };
      case 'NotFoundError':
      case 'OverconstrainedError':
        return {
          code: 'camera-unavailable',
          title: 'No compatible camera',
          message:
            'The selected camera is unavailable or cannot provide 720p video. Choose another camera and retry.',
          fatal: true,
        };
      case 'NotReadableError':
      case 'AbortError':
        return {
          code: 'camera-busy',
          title: 'Camera is busy',
          message:
            'Another application may be using the camera. You can still broadcast a clean window for screensharing, or close the other app and retry.',
          hint: 'Use "Clean Broadcast Window" to screenshare from WhatsApp/Zoom without camera access.',
          fatal: false,
        };
      default:
        return {
          code: 'camera-unsupported',
          title: 'Camera could not start',
          message: `The camera failed with ${error.name}. Try a different device.`,
          fatal: true,
        };
    }
  }

  return {
    code: 'camera-unsupported',
    title: 'Camera could not start',
    message:
      'Camera capture is unavailable in this environment. Run the desktop app and grant camera permission.',
    fatal: true,
  };
}

export function mapCredentialError(error: SessionCredentialError): LucySessionError {
  switch (error.code) {
    case 'not-configured':
      return {
        code: 'credential-not-configured',
        title: 'Session service not configured',
        message:
          'The app needs a backend endpoint that mints short-lived Decart tokens before it can start a session.',
        hint: 'Local development: add DECART_API_KEY to .env.local and restart pnpm dev. Production: set VITE_DECART_TOKEN_ENDPOINT to your token service.',
        fatal: true,
      };
    case 'unauthorized':
      return {
        code: 'credential-unauthorized',
        title: 'Session authorization failed',
        message:
          'The token service could not authenticate with Decart. The server-side API key may be invalid or expired.',
        hint: 'Check DECART_API_KEY on the token service. Never expose it in the frontend.',
        fatal: true,
      };
    case 'network':
      return {
        code: 'credential-network',
        title: 'Session service unreachable',
        message:
          'Dallr could not reach the token service. Check your connection and try again.',
        fatal: true,
      };
    case 'invalid-response':
      return {
        code: 'credential-invalid',
        title: 'Invalid session credential',
        message:
          'The token service returned an unexpected response. It must return JSON containing a non-empty apiKey string.',
        fatal: true,
      };
    case 'server':
      return {
        code: 'credential-server',
        title: 'Session service unavailable',
        message:
          'The token service could not issue a session token. Try again in a moment.',
        fatal: true,
      };
  }
}

export function mapSessionEndReason(reason: string): LucySessionError {
  switch (reason) {
    case 'insufficient_credits':
      return {
        code: 'insufficient-credits',
        title: 'Decart credits exhausted',
        message:
          'The Decart account behind this workspace has no inference credits. No credits were deducted from your Dallr balance.',
        hint: 'Add credits to the Decart account used by the token service, then start a new session.',
        fatal: true,
      };
    case 'moderation_violation':
      return {
        code: 'moderation',
        title: 'Session ended by moderation',
        message:
          'Decart ended the session because the prompt or reference image violated its usage policy.',
        hint: 'Adjust the prompt or reference image before retrying.',
        fatal: true,
      };
    case 'policy_violation':
      return {
        code: 'moderation',
        title: 'Session blocked by policy',
        message:
          'The provider closed the session for a policy violation before a detailed reason arrived.',
        hint: 'Adjust the prompt or reference image before retrying.',
        fatal: true,
      };
    case 'video_input_timeout':
      return {
        code: 'camera-unavailable',
        title: 'Camera stream timed out',
        message:
          'Decart connected, but did not receive video frames from your camera. Check that your webcam is active and not covered or muted.',
        hint: 'Make sure your browser has permission to capture your webcam, and no other app (e.g. Zoom, OBS) is holding an exclusive lock.',
        fatal: true,
      };
    case 'session_limit':
      return {
        code: 'session-limit',
        title: 'Session limit reached',
        message:
          'Another Dallr Cam session is already in progress. Close it or wait for it to finish.',
        fatal: true,
      };
    default:
      return {
        code: 'disconnected',
        title: 'Session ended',
        message: `The provider ended the session${reason ? ` (${reason})` : ''}.`,
        fatal: true,
      };
  }
}

export function mapSdkError(error: unknown): LucySessionError {
  const code = isRecord(error) && typeof error.code === 'string' ? error.code : '';
  const technical = errorMessage(error);

  switch (code) {
    case 'INVALID_API_KEY':
    case 'TOKEN_INVALID':
    case 'TOKEN_EXPIRED':
      return {
        code: 'authentication-failed',
        title: 'Session authentication failed',
        message:
          'Decart rejected the session token. The token may be expired or minted for the wrong model.',
        hint: 'Check the token service and restart the session.',
        fatal: true,
      };
    case 'TOKEN_CREATE_ERROR':
      return {
        code: 'credential-server',
        title: 'Session authorization failed',
        message: 'The token service could not mint a Decart session token.',
        hint: 'Check the server-side Decart API key and token permissions.',
        fatal: true,
      };
    case 'FILES_UPLOAD_ERROR':
      return {
        code: 'reference-upload-failed',
        title: 'Reference image not uploaded',
        message:
          'Dallr could not upload the reference image to Decart. Remove it or try a smaller image.',
        fatal: true,
      };
    case 'LIVEKIT_INITIALIZATION_ERROR':
    case 'UNSUPPORTED_PLATFORM_FEATURE':
      return {
        code: 'connect-failed',
        title: 'WebRTC unavailable',
        message:
          'This webview could not initialize the WebRTC components Dallr Cam needs. Update the desktop app or try a different runtime.',
        fatal: true,
      };
    case 'WEBRTC_TIMEOUT_ERROR':
      return {
        code: 'connect-timeout',
        title: 'Connection timed out',
        message:
          'The Dallr Cam session did not connect in time. Check your network, firewall or VPN, then retry.',
        fatal: true,
      };
    case 'WEBRTC_SERVER_ERROR':
      if (technical?.toLowerCase().includes('video_input_timeout')) {
        return {
          code: 'camera-unavailable',
          title: 'Camera input timed out',
          message:
            'Dallr Cam connected, but did not receive video frames from your camera in time (video_input_timeout).',
          hint: 'Check that your webcam privacy shutter is open, close any apps locking the camera (such as OBS, Zoom, or Teams), or select a different camera in the dropdown.',
          fatal: true,
        };
      }
      return {
        code: 'server-error',
        title: 'Dallr Cam session ended by provider',
        message: technical || 'Dallr Cam encountered an error with the session.',
        hint: 'Check that your prompt or reference image complies with usage policies.',
        fatal: true,
      };
    case 'WEBRTC_WEBSOCKET_ERROR':
    case 'WEBRTC_ICE_ERROR':
    case 'WEBRTC_SIGNALING_ERROR':
      return {
        code: 'connect-failed',
        title: 'Could not reach Dallr Cam',
        message:
          'The real-time connection failed. Check your network and any firewall or VPN, then retry.',
        hint: technical,
        fatal: true,
      };
    case 'MODEL_NOT_FOUND':
      return {
        code: 'connect-failed',
        title: 'Dallr Cam 2.5 unavailable',
        message:
          'The token service or account does not have access to the Dallr Cam 2.5 model.',
        fatal: true,
      };
    case 'INVALID_INPUT':
    case 'INVALID_OPTIONS':
      return {
        code: 'connect-failed',
        title: 'Session settings rejected',
        message:
          'Rejected session settings. Check the prompt and reference image, then retry.',
        fatal: true,
      };
    default:
      return {
        code: 'connect-failed',
        title: 'Session could not start',
        message: technical || 'The Dallr Cam session could not be established. Try again.',
        hint: technical ? 'Check console logs or account for details.' : undefined,
        fatal: true,
      };
  }
}

export function mapAnyError(error: unknown): LucySessionError {
  if (error instanceof SessionCredentialError) return mapCredentialError(error);
  return mapSdkError(error);
}

export class LucySessionService {
  private snapshot: LucySessionSnapshot = INITIAL_SESSION_SNAPSHOT;
  private listeners: SessionListeners = {
    onSnapshot: null,
    onLocalStream: null,
    onRemoteStream: null,
    onEnded: null,
  };

  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private realtime: RealTimeClient | null = null;
  private client: DecartClient | null = null;
  private credentials: SessionCredentialProvider | null = null;
  private detachHandlers: Array<() => void> = [];

  private prompt = '';
  private referenceFile: File | null = null;
  private cameraLabel = '';
  private mirror: LucyMirrorMode | null = null;

  private startedAt: number | null = null;
  private providerSeconds: number | null = null;
  private transientError: LucySessionError | null = null;

  private generation = 0;
  private startPromise: Promise<void> | null = null;
  private stopRequested = false;
  private endNotified = false;
  private disposed = false;

  private applyRunning = false;
  private applyAgain = false;
  private applyReference = false;
  private applyPromise: Promise<void> | null = null;
  private disconnectTimer: number | null = null;

  private clearDisconnectTimer(): void {
    if (this.disconnectTimer !== null) {
      window.clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
  }

  private emit(patch: Partial<LucySessionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.onSnapshot?.(this.snapshot);
  }

  private isActive(): boolean {
    return (
      this.snapshot.status === 'requesting-camera' ||
      this.snapshot.status === 'connecting' ||
      this.snapshot.status === 'connected' ||
      this.snapshot.status === 'reconnecting'
    );
  }

  private isLive(): boolean {
    return (
      this.realtime !== null &&
      (this.snapshot.status === 'connected' || this.snapshot.status === 'reconnecting')
    );
  }

  private attach<K extends keyof RealTimeEvents>(
    event: K,
    listener: (data: RealTimeEvents[K]) => void,
  ): void {
    const realtime = this.realtime;
    if (!realtime) return;
    realtime.on(event, listener);
    this.detachHandlers.push(() => realtime.off(event, listener));
  }

  async start(input: LucySessionStartOptions): Promise<void> {
    if (this.disposed) return;
    if (this.startPromise) return this.startPromise;
    if (this.isActive()) return;

    const promise = this.runStart(input).finally(() => {
      if (this.startPromise === promise) this.startPromise = null;
    });
    this.startPromise = promise;
    return promise;
  }

  private async runStart(input: LucySessionStartOptions): Promise<void> {
    this.generation += 1;
    const generation = this.generation;
    this.stopRequested = false;
    this.endNotified = false;
    this.startedAt = null;
    this.providerSeconds = null;
    this.transientError = null;
    this.cameraLabel = '';
    this.mirror = null;
    this.prompt = input.prompt.trim();
    this.referenceFile = input.referenceFile;
    this.credentials = input.credentials;
    this.listeners = {
      onSnapshot: input.onSnapshot,
      onLocalStream: input.onLocalStream,
      onRemoteStream: input.onRemoteStream,
      onEnded: input.onEnded ?? null,
    };

    this.emit({
      ...INITIAL_SESSION_SNAPSHOT,
      status: 'requesting-camera',
    });

    if (!this.credentials.endpoint) {
      this.fail(
        mapCredentialError(
          new SessionCredentialError(
            'not-configured',
            'No session token endpoint is configured.',
          ),
        ),
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.fail({
        code: 'camera-unsupported',
        title: 'Camera capture unavailable',
        message:
          'This environment does not expose camera capture. Use the desktop app or a secure browser context.',
        fatal: true,
      });
      return;
    }

    let sdk: SdkModule;
    try {
      sdk = await import('@decartai/sdk');
    } catch (error) {
      if (generation !== this.generation) return;
      this.fail({
        code: 'sdk-load-failed',
        title: 'Could not load the video engine',
        message:
          'The Decart real-time SDK failed to load. Rebuild the app and try again.',
        hint: errorMessage(error),
        fatal: true,
      });
      return;
    }

    if (generation !== this.generation || this.stopRequested) return;

    let model: ReturnType<SdkModule['models']['realtime']>;
    try {
      model = sdk.models.realtime(LUCY_MODEL_ID);
    } catch (error) {
      if (generation !== this.generation) return;
      this.fail(mapAnyError(error));
      return;
    }

    let stream: MediaStream;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: buildVideoConstraints(input.deviceId, model),
        });
      } catch (audioErr) {
        console.warn('[Dallr] audio: true getUserMedia failed, falling back to video-only:', audioErr);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: buildVideoConstraints(input.deviceId, model),
        });
      }
    } catch (error) {
      if (generation !== this.generation) return;
      this.fail(mapCameraError(error));
      return;
    }

    if (generation !== this.generation || this.stopRequested) {
      stopStream(stream);
      return;
    }

    this.localStream = stream;
    const track = stream.getVideoTracks()[0];
    if (track) {
      console.log('[Dallr Camera Track Details]:', {
        label: track.label,
        muted: track.muted,
        enabled: track.enabled,
        readyState: track.readyState,
        settings: track.getSettings?.(),
      });
      if (track.muted) {
        console.warn(
          '[Dallr Camera Muted Warning]: Camera track is reported as MUTED by the browser/OS. Check if a physical privacy switch is active or another app is locking the camera.',
        );
      }
    }

    const frameCheck = await verifyStreamFrames(stream, 2000);
    if (!frameCheck.ok) {
      if (generation !== this.generation || this.stopRequested) {
        stopStream(stream);
        return;
      }
      stopStream(stream);
      this.fail({
        code: 'camera-unavailable',
        title: 'Camera not producing video frames',
        message: frameCheck.reason || 'Dallr could not receive video frames from your webcam.',
        hint: frameCheck.hint || 'Check your webcam privacy slider or select another camera device.',
        fatal: true,
      });
      return;
    }

    const settings = track?.getSettings();
    this.cameraLabel = track?.label?.trim() || 'Camera';
    this.mirror = resolveMirrorOption(input.mirror, settings?.facingMode);
    this.listeners.onLocalStream?.(stream);
    this.emit({
      status: 'connecting',
      error: null,
      cameraLabel: this.cameraLabel,
      mirror: this.mirror,
      updatePending: false,
    });

    let client: DecartClient;
    try {
      client = sdk.createDecartClient({
        apiKeyProvider: () => this.credentials!.getToken(),
      });
      this.client = client;
    } catch (error) {
      if (generation !== this.generation) return;
      this.fail(mapAnyError(error));
      return;
    }

    if (generation !== this.generation || this.stopRequested) return;

    let realtime: RealTimeClient;
    try {
      // Connect to Lucy 2.5 with prompt in initialState so first frame is transformed
      const initialState: {
        prompt?: { text: string; enhance: boolean };
      } = {};
      if (this.prompt) initialState.prompt = { text: this.prompt, enhance: true };

      realtime = await this.client.realtime.connect(stream, {
        model,
        preferredVideoCodec: 'vp8',
        queryParams: { livekit_server_codec: 'vp8' },
        mirror: false,
        initialState,
        onRemoteStream: (remote) => {
          if (generation !== this.generation || this.stopRequested) {
            stopStream(remote);
            return;
          }
          this.remoteStream = remote;
          this.listeners.onRemoteStream?.(remote);
          this.markConnected();
        },
      });

      if (this.referenceFile) {
        try {
          const imageInput = await prepareReferenceImage(this.referenceFile);
          await realtime.set({
            prompt: this.prompt,
            image: imageInput,
            enhance: true,
          });
        } catch (err) {
          console.warn('[Dallr] Initial reference image set warning:', err);
        }
      }
    } catch (error) {
      if (generation !== this.generation) return;
      this.fail(mapAnyError(error));
      return;
    }

    if (generation !== this.generation || this.stopRequested) {
      realtime.disconnect();
      return;
    }

    this.realtime = realtime;
    this.attach('connectionChange', (state) => this.handleConnectionChange(state, generation));
    this.attach('connectionQuality', (quality) => {
      console.log('[Dallr WebRTC Connection Quality]:', quality);
    });
    this.attach('diagnostic', (diag) => {
      console.log('[Dallr WebRTC Diagnostic]:', diag);
    });
    this.attach('stats', (stats) => {
      if (stats?.video?.framesReceived) {
        console.log('[Dallr WebRTC Video Inbound Stats]:', {
          fps: stats.video.framesPerSecond,
          framesReceived: stats.video.framesReceived,
          framesDropped: stats.video.framesDropped,
          bitrate: stats.video.bitrate,
        });
      }
    });
    this.attach('error', (error) => this.handleSdkError(error, generation));
    this.attach('generationTick', ({ seconds }) => {
      if (generation !== this.generation || this.stopRequested) return;
      this.providerSeconds = seconds;
      this.emit({ providerSeconds: seconds });
    });
    this.attach('sessionEnded', ({ reason }) => {
      if (generation !== this.generation || this.stopRequested) return;
      this.fail(mapSessionEndReason(reason));
    });

    this.emit({
      status: realtime.isConnected() ? 'connected' : 'connecting',
      sessionId: realtime.sessionId,
    });

    if (realtime.isConnected()) this.markConnected();
  }

  private handleConnectionChange(state: ConnectionState, generation: number): void {
    if (generation !== this.generation || this.stopRequested) return;

    switch (state) {
      case 'connecting':
        this.emit({ status: 'connecting', error: null });
        break;
      case 'connected':
      case 'generating':
        this.clearDisconnectTimer();
        this.markConnected();
        break;
      case 'reconnecting':
        this.emit({ status: 'reconnecting', error: null });
        break;
      case 'disconnected':
        // Decart SDK automatically schedules reconnect when signaling/livekit drops.
        // Transition to reconnecting status and give Decart SDK time to re-establish.
        this.emit({ status: 'reconnecting', error: null });
        this.clearDisconnectTimer();
        this.disconnectTimer = window.setTimeout(() => {
          if (generation !== this.generation || this.stopRequested) return;
          if (this.realtime?.isConnected()) return;
          this.fail(
            this.transientError
              ? { ...this.transientError, fatal: true }
              : {
                  code: 'disconnected',
                  title: 'Session disconnected',
                  message:
                    'The Lucy connection closed unexpectedly. Check your network and start a new session.',
                  fatal: true,
                },
          );
        }, 15_000);
        break;
    }
  }

  private handleSdkError(error: DecartSDKError, generation: number): void {
    if (generation !== this.generation || this.stopRequested) return;

    console.error(
      '[Dallr Lucy Realtime Error Details]:',
      error?.message,
      (error as Record<string, unknown>)?.errorType,
      error,
    );
    const mapped = mapAnyError(error);
    const transient =
      this.snapshot.status === 'reconnecting' &&
      (mapped.code === 'connect-failed' || mapped.code === 'connect-timeout');
    if (transient) {
      this.transientError = mapped;
      this.emit({ error: { ...mapped, fatal: false } });
      return;
    }
    this.fail(mapped);
  }

  private markConnected(): void {
    const now = Date.now();
    if (this.startedAt === null) this.startedAt = now;
    this.transientError = null;
    this.emit({
      status: 'connected',
      error: null,
      startedAt: this.startedAt,
      endedAt: null,
      sessionId: this.realtime?.sessionId ?? this.snapshot.sessionId,
      updatePending: this.applyRunning,
    });
  }

  private fail(error: LucySessionError): void {
    console.error('[Dallr Lucy Session Failed]:', error);
    if (this.stopRequested) return;
    if (this.snapshot.status === 'failed') return;

    const endedAt = Date.now();
    this.emit({
      status: 'failed',
      error,
      endedAt,
      updatePending: false,
    });
    this.notifyEnded('failed', endedAt);
    this.teardown();
  }

  stop(reason: 'user' | 'offline' = 'user'): void {
    if (this.disposed) return;

    this.generation += 1;
    this.stopRequested = true;
    this.startPromise = null;
    const endedAt = Date.now();
    const wasActive = this.isActive();

    if (!wasActive) {
      this.teardown();
      return;
    }

    const error: LucySessionError | null =
      reason === 'offline'
        ? {
            code: 'app-offline',
            title: 'Workspace disconnected',
            message:
              'The session ended because the workspace lost its connection. Reconnect and start a new session.',
            fatal: true,
          }
        : null;

    this.emit({
      status: reason === 'offline' ? 'failed' : 'stopped',
      error,
      endedAt,
      updatePending: false,
    });

    if (wasActive) {
      this.notifyEnded(reason === 'offline' ? 'failed' : 'stopped', endedAt);
    }

    this.teardown();
  }

  private notifyEnded(status: SessionStatus, endedAt: number): void {
    if (this.endNotified || this.startedAt === null) return;
    this.endNotified = true;

    this.listeners.onEnded?.({
      status,
      startedAt: this.startedAt,
      endedAt,
      durationSec: Math.max(1, Math.round((endedAt - this.startedAt) / 1_000)),
      cameraLabel: this.cameraLabel || 'Camera',
      prompt: this.prompt,
      referenceName: this.referenceFile?.name ?? null,
      providerSeconds: this.providerSeconds,
    });
  }

  private teardown(): void {
    this.clearDisconnectTimer();
    for (const detach of this.detachHandlers) detach();
    this.detachHandlers = [];

    const realtime = this.realtime;
    this.realtime = null;
    try {
      realtime?.disconnect();
    } catch (error) {
      console.warn('Decart session disconnect failed.', errorMessage(error));
    }

    stopStream(this.localStream);
    stopStream(this.remoteStream);
    this.localStream = null;
    this.remoteStream = null;
    this.listeners.onLocalStream?.(null);
    this.listeners.onRemoteStream?.(null);

    this.client = null;
    this.credentials = null;
    this.transientError = null;
    this.applyRunning = false;
    this.applyAgain = false;
    this.applyReference = false;
    this.applyPromise = null;
  }

  setPrompt(prompt: string): Promise<void> {
    const next = prompt.trim();
    if (!next) return Promise.resolve();
    this.prompt = next;
    if (!this.isLive()) return Promise.resolve();
    return this.scheduleApply(false);
  }

  setReference(file: File | null): Promise<void> {
    this.referenceFile = file;
    if (!this.isLive()) return Promise.resolve();
    return this.scheduleApply(true);
  }

  private scheduleApply(includeReference: boolean): Promise<void> {
    if (!this.realtime) return Promise.resolve();

    this.applyReference = this.applyReference || includeReference;
    if (this.applyRunning) {
      this.applyAgain = true;
      return this.applyPromise ?? Promise.resolve();
    }

    this.applyRunning = true;
    this.emit({
      updatePending: true,
      error: this.snapshot.error?.fatal ? this.snapshot.error : null,
    });

    const promise = (async () => {
      do {
        this.applyAgain = false;
        await this.pushState();
      } while (this.applyAgain);
    })()
      .catch((error: unknown) => {
        if (
          this.snapshot.status !== 'connected' &&
          this.snapshot.status !== 'reconnecting'
        ) {
          return;
        }
        const mapped = mapAnyError(error);
        this.emit({
          updatePending: false,
          error: {
            ...mapped,
            code: 'update-failed',
            title: 'Live update failed',
            message: 'The prompt or image change did not reach Lucy. Check the connection and edit again.',
            fatal: false,
          },
        });
      })
      .finally(() => {
        this.applyRunning = false;
      });

    this.applyPromise = promise;
    return promise;
  }

  private async pushState(): Promise<void> {
    const realtime = this.realtime;
    if (!realtime) return;

    let imageInput: File | Blob | null = this.referenceFile;
    if (this.referenceFile) {
      try {
        imageInput = await prepareReferenceImage(this.referenceFile);
      } catch (err) {
        console.warn('[Dallr] Image optimization fallback to raw file:', err);
      }
    }

    const input: SetInput = {
      prompt: this.prompt,
      enhance: true,
      image: imageInput,
    };
    await realtime.set(input);

    this.emit({
      updatePending: false,
      error: this.snapshot.error?.fatal ? this.snapshot.error : null,
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.stop('user');
    this.disposed = true;
    this.listeners = {
      onSnapshot: null,
      onLocalStream: null,
      onRemoteStream: null,
      onEnded: null,
    };
  }
}
