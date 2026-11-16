/**
 * The only place that touches `localStorage`. Storage can be missing or throw (private
 * windows, blocked site data), so reads fall back to null and writes are best-effort: the
 * Shopper then simply is not remembered after a reload.
 */
export type StoredKey = "shopperId" | "cartId";

const prefix = "aigile.";

export function readStored(key: StoredKey): string | null {
  try {
    return localStorage.getItem(prefix + key);
  } catch {
    return null;
  }
}

export function writeStored(key: StoredKey, value: string): void {
  try {
    localStorage.setItem(prefix + key, value);
  } catch {
    // Not remembered across reloads; the current page keeps working.
  }
}

export function removeStored(key: StoredKey): void {
  try {
    localStorage.removeItem(prefix + key);
  } catch {
    // Nothing to forget if storage is unavailable.
  }
}
