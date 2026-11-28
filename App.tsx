import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase, getSupabaseAuthErrorMessage } from './src/config/supabase';
import { fetchUserRole, purgeLegacyMockStorage } from './src/services/supabaseService';
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

const SPLASH_MIN_MS = 900;

export default function App() {
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const explicitRoleRef = useRef<{ uid: string; role: UserRole } | null>(null);
  const authHoldRef = useRef(false);

  useEffect(() => {
    void purgeLegacyMockStorage();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isCancelled) return;
        const supabaseUser = session?.user;

        if (!supabaseUser) {
          if (authHoldRef.current) return;
          explicitRoleRef.current = null;
          setCurrentUser(null);
          setIsAuthReady(true);
          return;
        }

        if (authHoldRef.current) {
          return;
        }

        const uid = supabaseUser.id;
        const resolveUserRole = async () => {
          await purgeLegacyMockStorage();
          let resolvedRole: UserRole = 'owner';
          try {
            const remoteRole = await fetchUserRole(uid);
            if (remoteRole) {
              resolvedRole = remoteRole === 'admin' ? 'owner' : remoteRole;
            } else {
              const cached = await AsyncStorage.getItem(`@luvora_role_${uid}`);
              if (cached === 'customer' || cached === 'owner' || cached === 'admin') {
                resolvedRole = cached === 'admin' ? 'owner' : cached;
              }
            }
          } catch {
            try {
              const cached = await AsyncStorage.getItem(`@luvora_role_${uid}`);
              if (cached === 'customer' || cached === 'owner' || cached === 'admin') {
                resolvedRole = cached === 'admin' ? 'owner' : cached;
              }
            } catch {
              resolvedRole = 'owner';
            }
          }

          if (authHoldRef.current || isCancelled) return;

          const override = explicitRoleRef.current;
          const finalRole = override && override.uid === uid ? override.role : resolvedRole;

          const metadataName =
            (supabaseUser.user_metadata?.displayName as string | undefined) ||
            (supabaseUser.user_metadata?.full_name as string | undefined);

          setCurrentUser({
            uid,
            email: supabaseUser.email ?? '',
            displayName: metadataName,
            role: finalRole,
          });
          setIsAuthReady(true);
        };

        void resolveUserRole();
      }
    );

    return () => {
      isCancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const splashTimer = setTimeout(() => setIsSplashDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(splashTimer);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      explicitRoleRef.current = null;
      authHoldRef.current = false;
      await supabase.auth.signOut().catch(() => {});
      setCurrentUser(null);
    } catch (error) {
      Alert.alert(
        'Logout Failed',
        getSupabaseAuthErrorMessage(error, 'Could not sign out. Please try again.')
      );
    }
  }, []);

  if (!isSplashDone || !isAuthReady) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LoadingScreen />
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
