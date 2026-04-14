/**
 * Geveze CRM localStorage anahtarları — App dışı modüllerden erişim için.
 * Kalıcı state App.tsx içinde kalır; bu modül sadece paylaşılan sabitleri sunar.
 */
import { GEVEZE_STORAGE_KEYS } from '@/lib/gevezeStorageKeys';

export function clearGevezePersistedKeys(): void {
  if (typeof window === 'undefined') return;
  for (const key of GEVEZE_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export { GEVEZE_STORAGE_KEYS } from '@/lib/gevezeStorageKeys';
