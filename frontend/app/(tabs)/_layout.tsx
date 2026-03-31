import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0D0D1A',
          borderTopColor: '#1C1C2E',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#E5534B',
        tabBarInactiveTintColor: '#4B5563',
        headerStyle: { backgroundColor: '#0A0A1A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Παραστάσεις',
          tabBarLabel: 'Αρχική',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="film-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Εισιτήρια',
          tabBarLabel: 'Εισιτήρια',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Προφίλ',
          tabBarLabel: 'Προφίλ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={{ marginRight: 16 }}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}
