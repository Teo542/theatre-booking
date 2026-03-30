import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getToken } from '../lib/auth';
import { useRouter, useSegments } from 'expo-router';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const inAuth = segments[0] === '(auth)';
    if (!isLoggedIn && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isLoggedIn && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, isReady, segments]);

  async function checkAuth() {
    const token = await getToken();
    setIsLoggedIn(!!token);
    setIsReady(true);
  }

  if (!isReady) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="show/[id]" options={{ headerShown: true, title: 'Παράσταση' }} />
        <Stack.Screen name="booking/[showtimeId]" options={{ headerShown: true, title: 'Κράτηση' }} />
      </Stack>
    </>
  );
}
