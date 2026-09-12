const sessionFallback = new Map<string, string>();

export function readLocalStorage(key: string): string | null {
  try {
    const persisted = globalThis.localStorage?.getItem(key) ?? null;
    if (persisted !== null) {
      sessionFallback.set(key, persisted);
      return persisted;
    }
  } catch {
    // Incognito and embedded browsers may deny access to localStorage.
  }
  return sessionFallback.get(key) ?? null;
}

export function writeLocalStorage(key: string, value: string): boolean {
  sessionFallback.set(key, value);
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // The in-memory value keeps the current session playable.
  }
  return true;
}

export function removeLocalStorage(key: string): boolean {
  sessionFallback.delete(key);
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // The in-memory value has still been removed.
  }
  return true;
}
