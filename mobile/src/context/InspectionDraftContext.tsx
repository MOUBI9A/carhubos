import React, { createContext, useContext, useState, useEffect } from 'react';
import { InspectionDraft } from '../types';
import { getDrafts, saveDraft, removeDraft as removeStorageDraft } from '../storage/draft';
import api from '../api/client';

interface InspectionDraftContextType {
  drafts: InspectionDraft[];
  activeDraft: InspectionDraft | null;
  pendingCount: number;
  isSyncing: boolean;
  startDraft: (carId: string, type: 'PRE_RENTAL' | 'POST_RENTAL', bookingId?: string) => InspectionDraft;
  updateActiveDraft: (updates: Partial<InspectionDraft>) => void;
  saveCurrentDraft: () => Promise<void>;
  syncDraftToServer: (draft: InspectionDraft) => Promise<{ success: boolean; error?: string }>;
  syncPendingDrafts: () => Promise<void>;
  discardDraft: (localId: string) => Promise<void>;
  removeDraft: (localId: string) => Promise<void>;
}

const InspectionDraftContext = createContext<InspectionDraftContextType | undefined>(undefined);

export const InspectionDraftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drafts, setDrafts] = useState<InspectionDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<InspectionDraft | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    async function load() {
      const list = await getDrafts();
      setDrafts(list);
    }
    load();
  }, []);

  const startDraft = (
    carId: string,
    type: 'PRE_RENTAL' | 'POST_RENTAL',
    bookingId?: string,
  ): InspectionDraft => {
    const draft: InspectionDraft = {
      localId: `draft_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      bookingId,
      carId,
      type,
      mileage: 0,
      fuelLevel: 4, // 1/2 tank default
      damages: [],
      photos: [],
      createdAt: new Date().toISOString(),
      synced: false,
    };
    setActiveDraft(draft);
    return draft;
  };

  const updateActiveDraft = (updates: Partial<InspectionDraft>) => {
    if (!activeDraft) return;
    const updated = { ...activeDraft, ...updates };
    setActiveDraft(updated);
  };

  const saveCurrentDraft = async () => {
    if (!activeDraft) return;
    await saveDraft(activeDraft);
    const refreshed = await getDrafts();
    setDrafts(refreshed);
  };

  const syncDraftToServer = async (
    draft: InspectionDraft,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload = {
        carId: draft.carId,
        bookingId: draft.bookingId,
        type: draft.type === 'CHECK_OUT' || draft.type === 'PRE_RENTAL' ? 'PRE_RENTAL' : 'POST_RENTAL',
        mileage: Number(draft.mileage),
        fuelLevel: Number(draft.fuelLevel),
        damages: draft.damages && draft.damages.length > 0 ? JSON.stringify(draft.damages) : undefined,
        photos: draft.photos && draft.photos.length > 0 ? JSON.stringify(draft.photos) : undefined,
        notes: draft.notes || (draft.signatureSvg ? 'Certifié avec émargement électronique' : undefined),
      };

      await api.post('/inspections', payload);

      // On successful sync, clean up the local draft
      await removeStorageDraft(draft.localId);
      const refreshed = await getDrafts();
      setDrafts(refreshed);

      if (activeDraft?.localId === draft.localId) {
        setActiveDraft(null);
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Sync failed, draft remains safely in local storage:', err);
      return {
        success: false,
        error: err.response?.data?.message || 'Impossible de synchroniser avec le serveur.',
      };
    }
  };

  const syncPendingDrafts = async () => {
    setIsSyncing(true);
    try {
      for (const draft of drafts) {
        await syncDraftToServer(draft);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const discardDraft = async (localId: string) => {
    await removeStorageDraft(localId);
    const refreshed = await getDrafts();
    setDrafts(refreshed);
    if (activeDraft?.localId === localId) {
      setActiveDraft(null);
    }
  };

  return (
    <InspectionDraftContext.Provider
      value={{
        drafts,
        activeDraft,
        pendingCount: drafts.length,
        isSyncing,
        startDraft,
        updateActiveDraft,
        saveCurrentDraft,
        syncDraftToServer,
        syncPendingDrafts,
        discardDraft,
        removeDraft: discardDraft,
      }}
    >
      {children}
    </InspectionDraftContext.Provider>
  );
};

export const useInspectionDraft = () => {
  const context = useContext(InspectionDraftContext);
  if (!context) {
    throw new Error('useInspectionDraft must be used within an InspectionDraftProvider');
  }
  return context;
};

export const useInspectionDrafts = useInspectionDraft;
export default InspectionDraftContext;
