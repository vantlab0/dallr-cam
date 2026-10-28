import { isTauri } from '@tauri-apps/api/core';

/** True only when the frontend is running inside the Tauri webview. */
export function isDesktopRuntime(): boolean {
  try {
    return isTauri();
  } catch {
    return false;
  }
}

/**
 * True only for production builds (hosted token service, real Supabase auth and
 * real payment provider keys). Development builds use the Vite dev server and the
 * local token middleware; production builds use hosted real auth and payments.
 */
export function isProductionRuntime(): boolean {
  try {
    return !import.meta.env.DEV;
  } catch {
    return false;
  }
}
