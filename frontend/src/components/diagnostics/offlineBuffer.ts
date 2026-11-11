'use client';

export interface BufferedDiagnosticDraft {
  vehicleId: string;
  vin?: string;
  symptoms: string;
  technicianNotes?: string;
  manualDtcCodes?: string[];
  lastSavedAt: string;
  isPendingSync: boolean;
}

export interface QueuedSyncAction {
  id: string;
  type: 'SAVE_SYMPTOMS' | 'ATTACH_NOTE' | 'SUBMIT_MANUAL_DTC' | 'CREATE_ESTIMATE';
  payload: any;
  queuedAt: string;
  retryCount: number;
}

const STORAGE_PREFIX = 'carhub_diag_buffer_';
const QUEUE_KEY = 'carhub_diag_sync_queue';

export class GarageOfflineBuffer {
  static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  static getBufferedDraft(vehicleId: string): BufferedDiagnosticDraft | null {
    if (!this.isBrowser()) return null;
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${vehicleId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static saveDraft(vehicleId: string, draft: Partial<BufferedDiagnosticDraft>): void {
    if (!this.isBrowser()) return;
    try {
      const existing = this.getBufferedDraft(vehicleId) || {
        vehicleId,
        symptoms: '',
        lastSavedAt: new Date().toISOString(),
        isPendingSync: false,
      };

      const updated: BufferedDiagnosticDraft = {
        ...existing,
        ...draft,
        vehicleId,
        lastSavedAt: new Date().toISOString(),
        isPendingSync: true,
      };

      localStorage.setItem(`${STORAGE_PREFIX}${vehicleId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save to garage offline buffer', e);
    }
  }

  static clearDraft(vehicleId: string): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${vehicleId}`);
    } catch {}
  }

  static getSyncQueue(): QueuedSyncAction[] {
    if (!this.isBrowser()) return [];
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static enqueueAction(action: Omit<QueuedSyncAction, 'id' | 'queuedAt' | 'retryCount'>): void {
    if (!this.isBrowser()) return;
    try {
      const queue = this.getSyncQueue();
      const newAction: QueuedSyncAction = {
        ...action,
        id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        queuedAt: new Date().toISOString(),
        retryCount: 0,
      };
      queue.push(newAction);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to enqueue sync action', e);
    }
  }

  static removeAction(id: string): void {
    if (!this.isBrowser()) return;
    try {
      const queue = this.getSyncQueue().filter((a) => a.id !== id);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {}
  }

  static clearQueue(): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.removeItem(QUEUE_KEY);
    } catch {}
  }
}
