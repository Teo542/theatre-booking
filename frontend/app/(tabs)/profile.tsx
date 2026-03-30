import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../lib/api';
import { clearToken, getUser } from '../../lib/auth';

type ReservationItem = { category_name: string; quantity: number; unit_price: number };
type Reservation = {
  reservation_id: number;
  status: 'confirmed' | 'cancelled';
  date: string;
  time: string;
  hall: string;
  show_title: string;
  theatre_name: string;
  items: ReservationItem[];
};

export default function ProfileScreen() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    setLoading(true);
    const user = await getUser();
    if (user) setUserName(user.name);
    try {
      const { data } = await api.get('/user/reservations');
      setReservations(data);
    } catch (err) {
      Alert.alert('Σφάλμα', 'Αδυναμία φόρτωσης κρατήσεων');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await clearToken();
    router.replace('/(auth)/login');
  }

  async function handleCancel(id: number) {
    Alert.alert('Ακύρωση κράτησης', 'Είσαι σίγουρος;', [
      { text: 'Όχι' },
      {
        text: 'Ναι, ακύρωση',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/reservations/${id}`);
            Alert.alert('Επιτυχία', 'Η κράτηση ακυρώθηκε');
            loadProfile();
          } catch (err: any) {
            Alert.alert('Σφάλμα', err.response?.data?.error || 'Αποτυχία ακύρωσης');
          }
        },
      },
    ]);
  }

  function isFuture(date: string, time: string) {
    return new Date(`${date}T${time}`) > new Date();
  }

  function calcTotal(items: ReservationItem[]) {
    return items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0).toFixed(2);
  }

  function renderReservation({ item }: { item: Reservation }) {
    const future = isFuture(item.date, item.time);
    return (
      <View style={[styles.card, item.status === 'cancelled' && styles.cardCancelled]}>
        <Text style={styles.showTitle}>{item.show_title}</Text>
        <Text style={styles.theatre}>🏛 {item.theatre_name}</Text>
        <Text style={styles.datetime}>📅 {item.date}  ⏰ {item.time.slice(0, 5)}  🏠 {item.hall}</Text>
        {item.items.map((it, idx) => (
          <Text key={idx} style={styles.itemText}>
            {it.category_name}: {it.quantity}x €{it.unit_price}
          </Text>
        ))}
        <Text style={styles.total}>Σύνολο: €{calcTotal(item.items)}</Text>
        <View style={styles.footer}>
          <Text style={[styles.status, item.status === 'cancelled' && styles.statusCancelled]}>
            {item.status === 'confirmed' ? '✅ Επιβεβαιωμένη' : '❌ Ακυρωμένη'}
          </Text>
          {item.status === 'confirmed' && future && (
            <TouchableOpacity onPress={() => handleCancel(item.reservation_id)}>
              <Text style={styles.cancelBtn}>Ακύρωση</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>👤 {userName}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Αποσύνδεση</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Κρατήσεις μου</Text>

      {loading ? (
        <ActivityIndicator color="#e94560" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => String(item.reservation_id)}
          renderItem={renderReservation}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Δεν υπάρχουν κρατήσεις</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#16213e',
  },
  welcome: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#e94560', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: '#fff', fontSize: 13 },
  sectionTitle: { color: '#a8a8b3', fontSize: 13, padding: 16, paddingBottom: 4 },
  list: { padding: 12, paddingTop: 4 },
  card: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardCancelled: { opacity: 0.55 },
  showTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  theatre: { color: '#e94560', fontSize: 13, marginBottom: 2 },
  datetime: { color: '#a8a8b3', fontSize: 12, marginBottom: 8 },
  itemText: { color: '#a8a8b3', fontSize: 12, marginBottom: 2 },
  total: { color: '#fff', fontWeight: 'bold', marginTop: 6, marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { color: '#4ade80', fontSize: 13 },
  statusCancelled: { color: '#f87171' },
  cancelBtn: { color: '#e94560', fontSize: 13, fontWeight: 'bold' },
  empty: { color: '#a8a8b3', textAlign: 'center', marginTop: 40, fontSize: 16 },
});
