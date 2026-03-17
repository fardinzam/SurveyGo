import { vi } from 'vitest'

// Stub user object matching Firebase Auth User shape
export const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  photoURL: null,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: vi.fn(),
  getIdToken: vi.fn().mockResolvedValue('mock-token'),
  getIdTokenResult: vi.fn(),
  reload: vi.fn(),
  toJSON: vi.fn(),
  phoneNumber: null,
  providerId: 'firebase',
}

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: mockUser })),
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: typeof mockUser) => void) => {
    cb(mockUser)
    return vi.fn()
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: class { addScope = vi.fn() },
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  updatePassword: vi.fn(),
  deleteUser: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  setPersistence: vi.fn(),
  indexedDBLocalPersistence: {},
  browserSessionPersistence: {},
}))

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: { now: vi.fn() },
}))

// Mock firebase/storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}))

// Mock firebase/functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}))

// Mock the app's firebase module
vi.mock('../../lib/firebase', () => ({
  app: {},
  auth: { currentUser: mockUser },
  db: {},
  storage: {},
}))
