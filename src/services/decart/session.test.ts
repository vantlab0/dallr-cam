import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildVideoConstraints,
  LucySessionService,
  mapCameraError,
  mapSessionEndReason,
  resolveMirrorOption,
  type LucySessionStartOptions,
} from '@/services/decart/session';
import { SessionCredentialError } from '@/services/decart/credentials';

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, Set<(data: unknown) => void>>();

  const realtime = {
    set: vi.fn(async () => undefined),
    disconnect: vi.fn(),
    on: vi.fn((event: string, listener: (data: unknown) => void) => {
      const handlers = listeners.get(event) ?? new Set<(data: unknown) => void>();
      handlers.add(listener);
      listeners.set(event, handlers);
    }),
    off: vi.fn((event: string, listener: (data: unknown) => void) => {
      listeners.get(event)?.delete(listener);
    }),
    isConnected: vi.fn(() => true),
    sessionId: 'ses_test' as string | null,
  };

  const connect = vi.fn();
  const upload = vi.fn();
  const deleteFile = vi.fn();
  const createDecartClient = vi.fn();
  const realtimeModel = vi.fn(() => ({
    name: 'lucy-2.5',
    width: 1280,
    height: 720,
    fps: { ideal: 30, max: 30 },
    urlPath: '/v1/stream',
  }));

  const emit = (event: string, data: unknown) => {
    listeners.get(event)?.forEach((listener) => listener(data));
  };

  return {
    listeners,
    realtime,
    connect,
    upload,
    deleteFile,
    createDecartClient,
    realtimeModel,
    emit,
  };
});

vi.mock('@decartai/sdk', () => ({
  createDecartClient: mocks.createDecartClient,
  models: { realtime: mocks.realtimeModel },
}));

const getUserMedia = vi.fn();
let lastClientOptions: { apiKeyProvider?: () => Promise<string> } | null = null;

function createStream(label = 'Test Camera', facingMode?: string) {
  const track = {
    label,
    readyState: 'live',
    enabled: true,
    muted: false,
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getSettings: () => ({ deviceId: 'cam-1', facingMode }),
  };
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;

  return { stream, track };
}

function credentials(
  overrides: Partial<{ endpoint: string | null; getToken: () => Promise<string> }> = {},
) {
  return {
    endpoint: '/api/realtime-token',
    getToken: vi.fn(async () => 'client-token'),
    ...overrides,
  };
}

function startSession(
  service: LucySessionService,
  overrides: Partial<LucySessionStartOptions> = {},
) {
  const onSnapshot = vi.fn();
  const onLocalStream = vi.fn();
  const onRemoteStream = vi.fn();
  const onEnded = vi.fn();

  const promise = service.start({
    prompt: 'Make it cinematic',
    referenceFile: null,
    deviceId: 'cam-1',
    mirror: true,
    credentials: credentials(),
    onSnapshot,
    onLocalStream,
    onRemoteStream,
    onEnded,
    ...overrides,
  });

  return { promise, onSnapshot, onLocalStream, onRemoteStream, onEnded };
}

beforeEach(() => {
  mocks.listeners.clear();
  mocks.connect.mockReset();
  mocks.upload.mockReset().mockResolvedValue({ id: 'file_123' });
  mocks.deleteFile.mockReset().mockResolvedValue(undefined);
  mocks.createDecartClient.mockReset().mockImplementation((options) => {
    lastClientOptions = options as { apiKeyProvider?: () => Promise<string> };
    return {
      realtime: { connect: mocks.connect },
      files: { upload: mocks.upload, delete: mocks.deleteFile },
    };
  });
  mocks.realtime.set.mockReset().mockResolvedValue(undefined);
  mocks.realtime.disconnect.mockReset();
  mocks.realtime.on.mockClear();
  mocks.realtime.off.mockClear();
  mocks.realtime.isConnected.mockReset().mockReturnValue(true);
  mocks.realtime.sessionId = 'ses_test';
  lastClientOptions = null;
  getUserMedia.mockReset();

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia,
      enumerateDevices: vi.fn(async () => []),
    },
  });
});

describe('LucySessionService', () => {
  it('starts a session, connects both streams and tears down cleanly', async () => {
    const service = new LucySessionService();
    const local = createStream('Logitech BRIO');
    const remote = createStream('Lucy remote');
    getUserMedia.mockResolvedValue(local.stream);
    mocks.connect.mockImplementation(async (_stream, options) => {
      options.onRemoteStream(remote.stream);
      return mocks.realtime;
    });

    const callbacks = startSession(service);
    await callbacks.promise;

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: true,
      video: expect.objectContaining({
        deviceId: { ideal: 'cam-1' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 },
      }),
    });
    expect(mocks.connect).toHaveBeenCalledWith(
      local.stream,
      expect.objectContaining({
        mirror: false,
        preferredVideoCodec: 'vp8',
        initialState: {
          prompt: { text: 'Make it cinematic', enhance: true },
        },
      }),
    );
    expect(callbacks.onLocalStream).toHaveBeenCalledWith(local.stream);
    expect(callbacks.onRemoteStream).toHaveBeenCalledWith(remote.stream);
    expect(callbacks.onSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'connected',
        sessionId: 'ses_test',
        cameraLabel: 'Logitech BRIO',
        mirror: true,
      }),
    );

    service.stop('user');

    expect(mocks.realtime.disconnect).toHaveBeenCalledTimes(1);
    expect(local.track.stop).toHaveBeenCalledTimes(1);
    expect(remote.track.stop).toHaveBeenCalledTimes(1);
    expect(callbacks.onLocalStream).toHaveBeenLastCalledWith(null);
    expect(callbacks.onRemoteStream).toHaveBeenLastCalledWith(null);
    expect(callbacks.onEnded).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'stopped',
        cameraLabel: 'Logitech BRIO',
        prompt: 'Make it cinematic',
      }),
    );
  });

  it('applies a reference image to the realtime session and updates live', async () => {
    const service = new LucySessionService();
    const local = createStream();
    const remote = createStream('Lucy remote');
    const reference = new File(['image'], 'reference.png', { type: 'image/png' });
    getUserMedia.mockResolvedValue(local.stream);
    mocks.connect.mockImplementation(async (_stream, options) => {
      options.onRemoteStream(remote.stream);
      return mocks.realtime;
    });

    const callbacks = startSession(service, { referenceFile: reference });
    await callbacks.promise;

    expect(mocks.connect).toHaveBeenCalledWith(
      local.stream,
      expect.objectContaining({
        initialState: expect.objectContaining({
          prompt: { text: 'Make it cinematic', enhance: true },
        }),
      }),
    );
    expect(mocks.realtime.set).toHaveBeenCalledWith({
      prompt: 'Make it cinematic',
      image: reference,
      enhance: true,
    });

    await service.setPrompt('Noir portrait');
    expect(mocks.realtime.set).toHaveBeenLastCalledWith({
      prompt: 'Noir portrait',
      enhance: true,
      image: reference,
    });

    await service.setReference(null);
    expect(mocks.realtime.set).toHaveBeenLastCalledWith({
      prompt: 'Noir portrait',
      enhance: true,
      image: null,
    });

    service.stop('user');
  });

  it('reports a denied camera without calling Decart', async () => {
    const service = new LucySessionService();
    getUserMedia.mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));

    const callbacks = startSession(service);
    await callbacks.promise;

    expect(mocks.connect).not.toHaveBeenCalled();
    expect(callbacks.onSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({ code: 'camera-denied', fatal: true }),
      }),
    );
    expect(callbacks.onEnded).not.toHaveBeenCalled();
  });

  it('fails before requesting the camera when no token endpoint exists', async () => {
    const service = new LucySessionService();
    const token = vi.fn(async () => 'unused');

    const callbacks = startSession(service, {
      credentials: { endpoint: null, getToken: token },
    });
    await callbacks.promise;

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(token).not.toHaveBeenCalled();
    expect(callbacks.onSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({ code: 'credential-not-configured' }),
      }),
    );
  });

  it('releases the camera when the token service rejects the credential', async () => {
    const service = new LucySessionService();
    const local = createStream();
    getUserMedia.mockResolvedValue(local.stream);
    mocks.connect.mockImplementation(async () => {
      await lastClientOptions?.apiKeyProvider?.();
      return mocks.realtime;
    });

    const callbacks = startSession(service, {
      credentials: credentials({
        getToken: vi.fn(async () => {
          throw new SessionCredentialError('unauthorized', 'Rejected');
        }),
      }),
    });
    await callbacks.promise;

    expect(callbacks.onSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({ code: 'credential-unauthorized' }),
      }),
    );
    expect(local.track.stop).toHaveBeenCalled();
    expect(callbacks.onLocalStream).toHaveBeenLastCalledWith(null);
    expect(callbacks.onEnded).not.toHaveBeenCalled();
  });

  it('surfaces reconnecting and terminal provider states', async () => {
    const service = new LucySessionService();
    const local = createStream();
    const remote = createStream('Lucy remote');
    getUserMedia.mockResolvedValue(local.stream);
    mocks.connect.mockImplementation(async (_stream, options) => {
      options.onRemoteStream(remote.stream);
      return mocks.realtime;
    });

    const callbacks = startSession(service);
    await callbacks.promise;

    mocks.emit('connectionChange', 'reconnecting');
    expect(callbacks.onSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'reconnecting' }),
    );

    mocks.emit('connectionChange', 'connected');
    expect(callbacks.onSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'connected' }),
    );

    mocks.emit('sessionEnded', { reason: 'insufficient_credits' });
    expect(callbacks.onSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({ code: 'insufficient-credits' }),
      }),
    );
    expect(mocks.realtime.disconnect).toHaveBeenCalled();
    expect(callbacks.onEnded).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });
});

describe('Lucy session helpers', () => {
  it('uses the model dimensions and frame rate', () => {
    const model = { width: 1280, height: 720, fps: { ideal: 30, max: 30 } };
    expect(buildVideoConstraints(null, model)).toEqual({
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
      facingMode: 'user',
    });
    expect(buildVideoConstraints('cam-9', model)).toEqual({
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
      deviceId: { ideal: 'cam-9' },
    });
  });

  it('uses auto mirroring when a facing mode exists', () => {
    expect(resolveMirrorOption(true, undefined)).toBe(true);
    expect(resolveMirrorOption(true, 'user')).toBe('auto');
    expect(resolveMirrorOption(false, 'user')).toBe(false);
  });

  it('maps camera permission failures', () => {
    expect(mapCameraError(new DOMException('blocked', 'NotAllowedError'))).toMatchObject({
      code: 'camera-denied',
      fatal: true,
    });
    expect(mapCameraError(new DOMException('missing', 'NotFoundError'))).toMatchObject({
      code: 'camera-unavailable',
    });
  });

  it('maps provider session endings to actionable errors', () => {
    expect(mapSessionEndReason('insufficient_credits')).toMatchObject({
      code: 'insufficient-credits',
      fatal: true,
    });
    expect(mapSessionEndReason('moderation_violation')).toMatchObject({
      code: 'moderation',
    });
    expect(mapSessionEndReason('session_limit')).toMatchObject({
      code: 'session-limit',
    });
  });
});
