// Menangani prompt "Pasang aplikasi" (Add to Home Screen) di browser yang
// mendukung `beforeinstallprompt` (Chrome/Edge Android & desktop).

interface PromptPemasangan extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let tertunda: PromptPemasangan | null = null;
const pendengar = new Set<() => void>();

function beritahu() {
  pendengar.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    tertunda = e as PromptPemasangan;
    beritahu();
  });
  window.addEventListener('appinstalled', () => {
    tertunda = null;
    beritahu();
  });
}

export function bisaPasang(): boolean {
  return tertunda !== null;
}

export async function picuPasang(): Promise<boolean> {
  if (!tertunda) return false;
  await tertunda.prompt();
  const { outcome } = await tertunda.userChoice;
  tertunda = null;
  beritahu();
  return outcome === 'accepted';
}

export function langgananPasang(cb: () => void): () => void {
  pendengar.add(cb);
  return () => {
    pendengar.delete(cb);
  };
}
