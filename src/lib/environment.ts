import { isTauri } from '@tauri-apps/api/core';

/** True only when the frontend is running inside the Tauri webview. */
export function isDesktopRuntime(): boolean {
  try {
    return isTauri();
  } catch {
    return false;
  }
}
