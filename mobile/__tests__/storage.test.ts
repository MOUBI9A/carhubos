import {
  saveAuthToken,
  getAuthToken,
  removeAuthToken,
  saveUserData,
  getUserData,
  clearAuthSession,
} from '../src/storage/secure';
import {
  saveDraft,
  getDrafts,
  removeDraft,
  clearAllDrafts,
} from '../src/storage/draft';
import { InspectionDraft, User } from '../src/types';

// Mock expo-secure-store
const memoryStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    memoryStore[key] = value;
  }),
  getItemAsync: jest.fn(async (key: string) => {
    return memoryStore[key] || null;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete memoryStore[key];
  }),
}));

describe('Mobile Secure Storage Suite', () => {
  beforeEach(() => {
    for (const k of Object.keys(memoryStore)) {
      delete memoryStore[k];
    }
  });

  it('securely stores and retrieves JWT bearer token without plaintext leaks', async () => {
    const dummyJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyPayload';
    await saveAuthToken(dummyJwt);

    const retrieved = await getAuthToken();
    expect(retrieved).toBe(dummyJwt);

    await removeAuthToken();
    const afterDelete = await getAuthToken();
    expect(afterDelete).toBeNull();
  });

  it('stores and retrieves serialized authenticated User profile', async () => {
    const user: User = {
      id: 'usr-agent-01',
      email: 'agent@carhub.os',
      name: 'Yassine Agent',
      role: 'AGENT',
      agencyId: 'agency-atlas-01',
      agencyName: 'Atlas Mobility',
      isVerified: true,
    };

    await saveUserData(user);
    const loaded = await getUserData();
    expect(loaded).toEqual(user);
    expect(loaded?.role).toBe('AGENT');
  });

  it('completely cleanses session on clearAuthSession()', async () => {
    await saveAuthToken('token-abc');
    await saveUserData({
      id: 'u-1',
      email: 'test@carhub.os',
      name: 'Test',
      role: 'OWNER',
      agencyId: 'a-1',
      isVerified: true,
    });

    await clearAuthSession();

    expect(await getAuthToken()).toBeNull();
    expect(await getUserData()).toBeNull();
  });
});

describe('Offline Inspection Draft Storage Suite', () => {
  beforeEach(async () => {
    await clearAllDrafts();
  });

  it('persists pre-rental inspection drafts locally for offline garage operations', async () => {
    const draft: InspectionDraft = {
      localId: 'draft-offline-1',
      carId: 'car-dacia-01',
      bookingId: 'book-991',
      type: 'PRE_RENTAL',
      mileage: 48920,
      fuelLevel: 6,
      damages: [
        {
          id: 'dmg-1',
          zone: 'Aile gauche',
          severity: 'LIGHT',
          description: 'Légère éraflure vernis',
        },
      ],
      photos: ['file:///cache/photo1.jpg', 'file:///cache/photo2.jpg'],
      signatureSvg: 'M10,10 L20,20',
      createdAt: new Date().toISOString(),
      synced: false,
    };

    await saveDraft(draft);

    const allDrafts = await getDrafts();
    expect(allDrafts.length).toBe(1);
    expect(allDrafts[0].localId).toBe('draft-offline-1');
    expect(allDrafts[0].mileage).toBe(48920);
    expect(allDrafts[0].damages.length).toBe(1);
  });

  it('removes draft after server sync without affecting other drafts', async () => {
    const draftA: InspectionDraft = {
      localId: 'draft-A',
      carId: 'car-1',
      type: 'PRE_RENTAL',
      mileage: 10000,
      fuelLevel: 8,
      damages: [],
      photos: [],
      createdAt: new Date().toISOString(),
      synced: false,
    };
    const draftB: InspectionDraft = {
      localId: 'draft-B',
      carId: 'car-2',
      type: 'POST_RENTAL',
      mileage: 20000,
      fuelLevel: 4,
      damages: [],
      photos: [],
      createdAt: new Date().toISOString(),
      synced: false,
    };

    await saveDraft(draftA);
    await saveDraft(draftB);
    expect((await getDrafts()).length).toBe(2);

    await removeDraft('draft-A');
    const remaining = await getDrafts();
    expect(remaining.length).toBe(1);
    expect(remaining[0].localId).toBe('draft-B');
  });
});
