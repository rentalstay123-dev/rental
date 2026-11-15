import { initializeApp, getApps, getApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import type { Auth, Persistence } from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import { Analytics, getAnalytics, isSupported } from 'firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type ReactNativeAuthModule = typeof firebaseAuth & {
  getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
};

const firebaseConfig = {
  apiKey: 'AIzaSyCk37n9qhcYjwkFMj9ktmhHeNaEFgyRAAU',
  authDomain: 'luvora-4a9b5.firebaseapp.com',
  projectId: 'luvora-4a9b5',
  storageBucket: 'luvora-4a9b5.firebasestorage.app',
  messagingSenderId: '405711367948',
  appId: '1:405711367948:web:cb29fc28c9f29c3b412329',
  measurementId: 'G-DPKMXP2QC3',
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function createAuthInstance(): Auth {
  const { getReactNativePersistence } = firebaseAuth as ReactNativeAuthModule;

  if (Platform.OS !== 'web' && typeof getReactNativePersistence === 'function') {
    try {
      return firebaseAuth.initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'auth/already-initialized') {
        return firebaseAuth.getAuth(app);
      }
      throw error;
    }
  }

  return firebaseAuth.getAuth(app);
}

export const auth = createAuthInstance();

function createFirestoreInstance(): Firestore {
  if (Platform.OS === 'web') {
    return getFirestore(app);
  }
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
}

export const db = createFirestoreInstance();

// Firebase Analytics Web SDK only supports browser environments.
let analyticsInstance: Analytics | null = null;
if (Platform.OS === 'web') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(app);
      }
    })
    .catch(() => {
      analyticsInstance = null;
    });
}

export function getFirebaseAnalytics(): Analytics | null {
  return analyticsInstance;
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters long.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your internet connection and try again.',
  'auth/requires-recent-login': 'Please sign out and sign back in before changing your password.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase Console.',
};

/** Maps Firebase Auth error codes to user-friendly messages. */
export function getFirebaseAuthErrorMessage(
  error: unknown,
  fallback = 'Authentication failed. Please try again.'
): string {
  const code = (error as { code?: string })?.code;
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }
  const message = (error as { message?: string })?.message;
  return message || fallback;
}

