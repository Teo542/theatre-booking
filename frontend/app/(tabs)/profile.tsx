import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clearToken, getUser } from '../../lib/auth';
import api from '../../lib/api';
import { keepRefreshVisible } from '../../lib/refresh';

type User = { user_id: number; name: string; email: string };

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, cancelled: 0 });
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  async function loadProfile() {
    const u = await getUser();
    setUser(u);
    try {
      const { data } = await api.get('/user/reservations');
      const now = new Date();
      const upcoming = data.filter((r: any) =>
        r.status === 'confirmed' && new Date(`${String(r.date).slice(0, 10)}T${r.time}`) > now
      ).length;
      const cancelled = data.filter((r: any) => r.status === 'cancelled').length;
      setStats({ total: data.length, upcoming, cancelled });
    } catch {}
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await keepRefreshVisible(loadProfile);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Αποσύνδεση', 'Είσαι σίγουρος;', [
      { text: 'Ακύρωση' },
      {
        text: 'Αποσύνδεση',
        style: 'destructive',
        onPress: async () => { await clearToken(); router.replace('/(auth)/login'); },
      },
    ]);
  }

  const initial = user?.name?.charAt(0).toUpperCase() || '?';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#E5534B"
          colors={['#E5534B']}
          progressBackgroundColor="#1C1C2E"
        />
      }
    >

      {/* Avatar & Name */}
      <View style={styles.heroSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>Σύνολο</Text>
        </View>
        <View style={[styles.statCard, styles.statCardMiddle]}>
          <Text style={[styles.statNum, { color: '#10B981' }]}>{stats.upcoming}</Text>
          <Text style={styles.statLabel}>Επερχόμενες</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: '#E5534B' }]}>{stats.cancelled}</Text>
          <Text style={styles.statLabel}>Ακυρωμένες</Text>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ΛΟΓΑΡΙΑΣΜΟΣ</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#E5534B20' }]}>
                <Ionicons name="person-outline" size={18} color="#E5534B" />
              </View>
              <View>
                <Text style={styles.menuTitle}>Όνομα</Text>
                <Text style={styles.menuSub}>{user?.name}</Text>
              </View>
            </View>
          </View>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#0EA5E920' }]}>
                <Ionicons name="mail-outline" size={18} color="#0EA5E9" />
              </View>
              <View>
                <Text style={styles.menuTitle}>Email</Text>
                <Text style={styles.menuSub}>{user?.email}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* App Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ΕΦΑΡΜΟΓΗ</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/tickets')}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="ticket-outline" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.menuTitle}>Οι κρατήσεις μου</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4B5563" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)')}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#7C3AED20' }]}>
                <Ionicons name="film-outline" size={18} color="#7C3AED" />
              </View>
              <Text style={styles.menuTitle}>Αναζήτηση Παραστάσεων</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E5534B" />
          <Text style={styles.logoutText}>Αποσύνδεση</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  heroSection: { alignItems: 'center', paddingTop: 36, paddingBottom: 24, backgroundColor: '#1C1C2E' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E5534B', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  userName: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  userEmail: { color: '#4B5563', fontSize: 14 },
  statsRow: { flexDirection: 'row', margin: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#1C1C2E', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  statCardMiddle: { borderWidth: 1, borderColor: '#2D2D3E' },
  statNum: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: '#4B5563', fontSize: 11 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionLabel: { color: '#4B5563', fontSize: 11, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  menuCard: { backgroundColor: '#1C1C2E', borderRadius: 14, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuTitle: { color: '#fff', fontSize: 14 },
  menuSub: { color: '#4B5563', fontSize: 12, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: '#2D2D3E', marginLeft: 62 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#E5534B15', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#E5534B30',
  },
  logoutText: { color: '#E5534B', fontSize: 15, fontWeight: '600' },
});
