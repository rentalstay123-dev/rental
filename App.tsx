import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoadingScreen from './src/screens/LoadingScreen';
import LoginScreen from './src/screens/LoginScreen';
import OwnerDashboard from './src/screens/OwnerDashboard';

export default function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ email: string; role: string } | null>(null);

  if (isAppLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LoadingScreen onFinish={() => setIsAppLoading(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {currentUser ? (
        <OwnerDashboard
          userEmail={currentUser.email}
          onLogout={() => setCurrentUser(null)}
        />
      ) : (
        <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />
      )}
    </SafeAreaProvider>
  );
}
