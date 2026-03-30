import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

type ReservationItem = { category_name: string; quantity: number; unit_price: number };
type Reservation = {
  reservation_id: number;
  showtime_id: number;
  status: 'confirmed' | 'cancelled';
  date: string;
  time: string;
  hall: string;
  show_title: string;
  theatre_name: string;
  items: ReservationItem[];
};

export default function TicketsScreen() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/user/reservations');
      setReservations(data);
    } catch {
      Alert.alert('Σφάλμα', 'Αδυναμία φόρτωσης κρατήσεων');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: number) {
    Alert.alert('Ακύρωση κράτησης', 'Θες να ακυρώσεις αυτή την κράτηση;', [
      { text: 'Όχι' },
      {
        text: 'Ακύρωση',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/reservations/${id}`);
            load();
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

  const upcoming = reservations.filter(r => r.status === 'confirmed' && isFuture(r.date, r.time));
  const past = reservations.filter(r => r.status === 'cancelled' || !isFuture(r.date, r.time));
  const displayed = activeTab === 'upcoming' ? upcoming : past;

  function renderTicket({ item }: { item: Reservation }) {
    const future = isFuture(item.date, item.time);
    const cancelled = item.status === 'cancelled';
    return (
      <View style={[styles.ticket, cancelled && styles.ticketCancelled]}>
        <View style={styles.ticketTop}>
          <View style={styles.ticketAccent} />
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketTitle} numberOfLines={1}>{item.show_title}</Text>
            <View style={[styles.statusBadge, cancelled ? styles.statusCancelled : styles.statusConfirmed]}>
              <Text style={styles.statusText}>{cancelled ? 'ΑΚΥΡΩΘΗΚΕ' : 'ΕΠΙΒΕΒΑΙΩΜΕΝΗ'}</Text>
            </View>
          </View>
          <Text style={styles.ticketTheatre}>
            <Ionicons name="business-outline" size={12} color="#9CA3AF" /> {item.theatre_name}
          </Text>
        </View>

        <View style={styles.ticketDivider}>
          <View style={styles.ticketNubLeft} />
          <View style={styles.ticketDash} />
          <View style={styles.ticketNubRight} />
        </View>

        <View style={styles.ticketBottom}>
          <View style={styles.ticketInfoGrid}>
            <View style={styles.ticketInfoCell}>
              <Text style={styles.ticketInfoLabel}>ΗΜΕΡΟΜΗΝΙΑ</Text>
              <Text style={styles.ticketInfoValue}>{item.date}</Text>
            </View>
            <View style={styles.ticketInfoCell}>
              <Text style={styles.ticketInfoLabel}>ΩΡΑ</Text>
              <Text style={styles.ticketInfoValue}>{item.time.slice(0, 5)}</Text>
            </View>
            <View style={styles.ticketInfoCell}>
              <Text style={styles.ticketInfoLabel}>ΑΙΘΟΥΣΑ</Text>
              <Text style={styles.ticketInfoValue} numberOfLines={1}>{item.hall}</Text>
            </View>
          </View>

          <View style={styles.ticketItems}>
            {item.items.map((it, idx) => (
              <Text key={idx} style={styles.ticketItem}>
                {it.category_name}: {it.quantity}x €{it.unit_price}
              </Text>
            ))}
          </View>

          <View style={styles.ticketFooter}>
            <Text style={styles.ticketTotal}>Σύνολο: €{calcTotal(item.items)}</Text>
            {!cancelled && future && (
              <View style={styles.ticketActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => router.push(`/edit-reservation/${item.reservation_id}?showtimeId=${item.showtime_id}`)}
                >
                  <Ionicons name="create-outline" size={14} color="#0EA5E9" />
                  <Text style={styles.editBtnText}>Επεξεργασία</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.reservation_id)}>
                  <Ionicons name="close-circle-outline" size={14} color="#E5534B" />
                  <Text style={styles.cancelBtnText}>Ακύρωση</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Επερχόμενες ({upcoming.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Ιστορικό ({past.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#E5534B" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => String(item.reservation_id)}
          renderItem={renderTicket}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🎟</Text>
              <Text style={styles.emptyText}>Δεν υπάρχουν κρατήσεις</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  tabRow: {
    flexDirection: 'row', backgroundColor: '#1C1C2E',
    borderBottomWidth: 1, borderBottomColor: '#2D2D3E',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#E5534B' },
  tabText: { color: '#4B5563', fontSize: 13 },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 16, gap: 16 },
  ticket: { backgroundColor: '#1C1C2E', borderRadius: 16, overflow: 'hidden' },
  ticketCancelled: { opacity: 0.5 },
  ticketTop: { padding: 16, position: 'relative' },
  ticketAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#E5534B' },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  ticketTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusConfirmed: { backgroundColor: '#10B98120' },
  statusCancelled: { backgroundColor: '#E5534B20' },
  statusText: { fontSize: 9, fontWeight: 'bold', color: '#fff' },
  ticketTheatre: { color: '#9CA3AF', fontSize: 13 },
  ticketDivider: {
    height: 16, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0A0A1A',
  },
  ticketNubLeft: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0A0A1A', marginLeft: -8 },
  ticketNubRight: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0A0A1A', marginRight: -8 },
  ticketDash: { flex: 1, height: 1, borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#2D2D3E' },
  ticketBottom: { padding: 16 },
  ticketInfoGrid: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  ticketInfoCell: { flex: 1 },
  ticketInfoLabel: { color: '#4B5563', fontSize: 9, letterSpacing: 1, marginBottom: 3 },
  ticketInfoValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  ticketItems: { marginBottom: 10 },
  ticketItem: { color: '#9CA3AF', fontSize: 12, marginBottom: 2 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketTotal: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  ticketActions: { flexDirection: 'row', gap: 12 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { color: '#0EA5E9', fontSize: 12 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cancelBtnText: { color: '#E5534B', fontSize: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#4B5563', fontSize: 15 },
});
