import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, getFirebaseAuthErrorMessage } from './src/config/firebase';
import { fetchUserRole } from './src/services/firestoreService';
import { getBuiltInRoleByEmail, LOCAL_SESSION_STORAGE_KEY } from './src/constants/authAccounts';
import type { UserRole } from './src/types/appData';
import LoadingScreen from './src/screens/LoadingScreen';
import LoginScreen from './src/screens/LoginScreen';
import OwnerDashboard from './src/screens/OwnerDashboard';
import CustomerDashboard from './src/screens/CustomerDashboard';

interface AuthenticatedUser {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
}

export default function App() {
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const explicitRoleRef = useRef<{ uid: string; role: UserRole } | null>(null);
  const authHoldRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        if (authHoldRef.current) return;
        const restoreLocalSession = async () => {
          try {
            const raw = await AsyncStorage.getItem(LOCAL_SESSION_STORAGE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw) as AuthenticatedUser;
              if (parsed?.uid && parsed?.email && (parsed.role === 'owner' || parsed.role === 'customer')) {
                setCurrentUser(parsed);
                setIsAuthReady(true);
                return;
              }
            }
          } catch {
            // Ignore cache read error
          }
          explicitRoleRef.current = null;
          setCurrentUser(null);
          setIsAuthReady(true);
        };
        void restoreLocalSession();
        return;
      }

      if (authHoldRef.current) {
        return;
      }

      const uid = firebaseUser.uid;
      const resolveUserRole = async () => {
        const builtInRole = getBuiltInRoleByEmail(firebaseUser.email);
        let resolvedRole: UserRole = builtInRole ?? 'owner';
        if (!builtInRole) {
          try {
            const remoteRole = await fetchUserRole(uid);
            if (remoteRole) {
              resolvedRole = remoteRole;
              await AsyncStorage.setItem(`@luvora_role_${uid}`, remoteRole);
            } else {
              const cached = await AsyncStorage.getItem(`@luvora_role_${uid}`);
              if (cached === 'customer' || cached === 'owner') {
                resolvedRole = cached;
              }
            }
          } catch {
            try {
              const cached = await AsyncStorage.getItem(`@luvora_role_${uid}`);
              if (cached === 'customer' || cached === 'owner') {
                resolvedRole = cached;
              }
            } catch {
              // Default to owner when offline and uncached
            }
          }
        }

        if (authHoldRef.current) return;

        const override = explicitRoleRef.current;
        const finalRole =
          builtInRole ?? (override && override.uid === uid ? override.role : resolvedRole);

        setCurrentUser({
          uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? undefined,
          role: finalRole,
        });
        setIsAuthReady(true);
      };

      void resolveUserRole();
    });

    return unsubscribe;
  }, []);

  const handleSplashFinish = useCallback(() => {
    setIsSplashDone(true);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      explicitRoleRef.current = null;
      authHoldRef.current = false;
      await AsyncStorage.removeItem(LOCAL_SESSION_STORAGE_KEY).catch(() => {});
      if (auth.currentUser) {
        await signOut(auth);
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      Alert.alert(
        'Logout Failed',
        getFirebaseAuthErrorMessage(error, 'Could not sign out. Please try again.')
      );
    }
  }, []);

  if (!isSplashDone || !isAuthReady) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LoadingScreen onFinish={handleSplashFinish} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {currentUser ? (
        currentUser.role === 'customer' ? (
          <CustomerDashboard
            key={`customer-${currentUser.uid}`}
            uid={currentUser.uid}
            userEmail={currentUser.email}
            userName={currentUser.displayName}
            onLogout={handleLogout}
          />
        ) : (
          <OwnerDashboard
            key={`owner-${currentUser.uid}`}
            uid={currentUser.uid}
            userEmail={currentUser.email}
            userName={currentUser.displayName}
            onLogout={handleLogout}
          />
        )
      ) : (
        <LoginScreen
          onAuthHoldChange={(holding) => {
            authHoldRef.current = holding;
          }}
          onLoginSuccess={(user) => {
            explicitRoleRef.current = { uid: user.uid, role: user.role };
            setCurrentUser({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              role: user.role,
            });
          }}
        />
      )}
    </SafeAreaProvider>
  );
}
