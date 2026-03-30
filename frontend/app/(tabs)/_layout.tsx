import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#16213e', borderTopColor: '#0f3460' },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#a8a8b3',
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Παραστάσεις', tabBarLabel: 'Αρχική' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Προφίλ', tabBarLabel: 'Προφίλ' }}
      />
    </Tabs>
  );
}
