import { useSyncExternalStore } from 'react';
import { bisaPasang, langgananPasang } from '../lib/pwa';

export function useInstallPrompt(): boolean {
  return useSyncExternalStore(langgananPasang, bisaPasang, () => false);
}
