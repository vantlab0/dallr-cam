import { useCallback, useEffect, useState } from 'react';
import type { CameraDevice } from '@/types';

const CAMERA_STORAGE_KEY = 'dallr:camera:v1';

function readStoredCamera(): string | null {
  try {
    return window.localStorage.getItem(CAMERA_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeCamera(deviceId: string | null): void {
  try {
    if (deviceId) window.localStorage.setItem(CAMERA_STORAGE_KEY, deviceId);
    else window.localStorage.removeItem(CAMERA_STORAGE_KEY);
  } catch {
    // Camera preference is best-effort only.
  }
}

async function listDevices(): Promise<CameraDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === 'videoinput')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${index + 1}`,
    }));
}

/**
 * Enumerates cameras without requesting permission. Labels become available
 * only after the user starts a session and grants camera access.
 */
export function useCameraDevices(rememberDevice: boolean) {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    rememberDevice ? readStoredCamera() : null,
  );
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await listDevices();
      setDevices(next);
      setError(null);
      setSelectedId((current) => {
        if (current && next.some((device) => device.deviceId === current)) {
          return current;
        }
        const stored = rememberDevice ? readStoredCamera() : null;
        if (stored && next.some((device) => device.deviceId === stored)) {
          return stored;
        }
        return next[0]?.deviceId ?? null;
      });
    } catch {
      setError('The camera list could not be read. Check system camera permissions.');
    }
  }, [rememberDevice]);

  useEffect(() => {
    void refresh();

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) return;
    const handleDeviceChange = () => void refresh();
    mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, [refresh]);

  const selectDevice = useCallback(
    (deviceId: string) => {
      setSelectedId(deviceId);
      if (rememberDevice) storeCamera(deviceId);
    },
    [rememberDevice],
  );

  useEffect(() => {
    if (rememberDevice && selectedId) storeCamera(selectedId);
  }, [rememberDevice, selectedId]);

  return {
    devices,
    selectedId,
    selectDevice,
    refresh,
    error,
  };
}
