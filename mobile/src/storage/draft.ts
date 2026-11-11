import * as SecureStore from 'expo-secure-store';
import { InspectionDraft } from '../types';

const INSPECTION_DRAFTS_KEY = 'fider_inspection_drafts_queue';

/**
 * Reads all stored inspection drafts.
 */
export async function getDrafts(): Promise<InspectionDraft[]> {
  try {
    const raw = await SecureStore.getItemAsync(INSPECTION_DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to load inspection drafts:', err);
    return [];
  }
}

/**
 * Saves or updates an inspection draft in local storage.
 */
export async function saveDraft(draft: InspectionDraft): Promise<void> {
  try {
    const current = await getDrafts();
    const index = current.findIndex((d) => d.localId === draft.localId);
    if (index >= 0) {
      current[index] = draft;
    } else {
      current.push(draft);
    }
    await SecureStore.setItemAsync(INSPECTION_DRAFTS_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to save inspection draft:', err);
  }
}

/**
 * Removes a synced or discarded inspection draft from local storage.
 */
export async function removeDraft(localId: string): Promise<void> {
  try {
    const current = await getDrafts();
    const filtered = current.filter((d) => d.localId !== localId);
    await SecureStore.setItemAsync(INSPECTION_DRAFTS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Failed to delete inspection draft:', err);
  }
}

/**
 * Clears all drafts from local storage (useful for tests and hard reset).
 */
export async function clearAllDrafts(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(INSPECTION_DRAFTS_KEY);
  } catch (err) {
    console.warn('Failed to clear inspection drafts:', err);
  }
}
