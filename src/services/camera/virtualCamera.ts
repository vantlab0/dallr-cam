/**
 * Virtual Camera Broadcast Service
 *
 * Exposes Decart Lucy 2.5 realtime output stream to external applications
 * (WhatsApp, Zoom, OBS Studio, Google Meet, Teams, Discord).
 */

let projectorWindow: Window | null = null;

export function isPictureInPictureSupported(): boolean {
  return typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;
}

/**
 * Toggles Picture-in-Picture mode on the Decart output video element.
 * Provides an always-on-top, clean window of the transformed stream that
 * conferencing and recording apps (WhatsApp, Zoom, OBS) can capture directly.
 */
export async function toggleVirtualCamPip(videoElement: HTMLVideoElement | null): Promise<boolean> {
  if (!videoElement || !isPictureInPictureSupported()) return false;

  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return false;
    }
    await videoElement.requestPictureInPicture();
    return true;
  } catch (err) {
    console.warn('[Dallr Virtual Cam] PiP request failed:', err);
    return false;
  }
}

/**
 * Opens a dedicated, borderless clean broadcast projector window containing ONLY
 * the live transformed Decart output stream at 720p 30fps.
 *
 * External apps (OBS Studio, Zoom, WhatsApp, Teams) can immediately select
 * "Window Capture → Dallr Virtual Camera Output" or route it to OBS Virtual Camera.
 */
export function openVirtualCamProjector(stream: MediaStream | null): Window | null {
  if (!stream || typeof window === 'undefined') return null;

  if (projectorWindow && !projectorWindow.closed) {
    projectorWindow.focus();
    return projectorWindow;
  }

  const width = 1280;
  const height = 720;
  const left = Math.max(0, (window.screen.width - width) / 2);
  const top = Math.max(0, (window.screen.height - height) / 2);

  const win = window.open(
    '',
    'dallr_virtual_cam_projector',
    `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`,
  );

  if (!win) return null;

  projectorWindow = win;

  win.document.title = 'Dallr Virtual Camera — Decart Output';
  win.document.body.style.margin = '0';
  win.document.body.style.backgroundColor = '#000';
  win.document.body.style.overflow = 'hidden';
  win.document.body.style.display = 'flex';
  win.document.body.style.alignItems = 'center';
  win.document.body.style.justifyContent = 'center';
  win.document.body.style.height = '100vh';

  const video = win.document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'contain';
  video.srcObject = stream;

  win.document.body.appendChild(video);

  win.addEventListener('beforeunload', () => {
    projectorWindow = null;
  });

  return win;
}

export function closeVirtualCamProjector(): void {
  if (projectorWindow && !projectorWindow.closed) {
    projectorWindow.close();
  }
  projectorWindow = null;
}
