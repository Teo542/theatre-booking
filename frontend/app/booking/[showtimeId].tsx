import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { keepRefreshVisible } from '../../lib/refresh';
import RefreshSpinner from '../../components/RefreshSpinner';

type Category = {
  category_id: number;
  name: string;
  price: string;
  available_seats: number;
  total_seats: number;
};

type SeatState = 'available' | 'selected' | 'taken';

type Seat = {
  id: string;
  row: string;
  col: number;
  state: SeatState;
  categoryId: number;
};

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const COLS = 12;
const AISLE_AFTER = 5;

function buildSeatMap(categories: Category[], reserved: string[] = []): Seat[][] {
  const reservedSet = new Set(reserved);
  const rowsPerCat: Record<number, string[]> = {};
  let rowIdx = 0;
  for (const cat of categories) {
    const needed = Math.ceil(cat.total_seats / COLS);
    rowsPerCat[cat.category_id] = ROWS.slice(rowIdx, rowIdx + needed);
    rowIdx += needed;
  }

  return categories.flatMap((cat) =>
    (rowsPerCat[cat.category_id] || []).map((row) =>
      Array.from({ length: COLS }, (_, col) => {
        const id = `${row}${col + 1}`;
        return {
          id,
          row,
          col: col + 1,
          state: reservedSet.has(id) ? 'taken' : 'available',
          categoryId: cat.category_id,
        } as Seat;
      })
    )
  );
}

export default function BookingScreen() {
  const { showtimeId } = useLocalSearchParams<{ showtimeId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [seatMap, setSeatMap] = useState<Seat[][]>([]);
  const [selected, setSelected] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadCategories(); }, [showtimeId]);

  async function loadCategories(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      const { data } = await api.get('/seats', { params: { showtimeId } });
      const { categories: cats, reserved } = data;
      setCategories(cats);
      setSeatMap(buildSeatMap(cats, reserved));
      setSelected([]);
    } catch {
      Alert.alert('Σφάλμα', 'Αδυναμία φόρτωσης θέσεων');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await keepRefreshVisible(() => loadCategories(false));
    } finally {
      setRefreshing(false);
    }
  }

  function toggleSeat(seat: Seat) {
    if (seat.state === 'taken') return;
    setSeatMap((prev) =>
      prev.map((row) =>
        row.map((s) => {
          if (s.id !== seat.id) return s;
          return { ...s, state: s.state === 'selected' ? 'available' : 'selected' };
        })
      )
    );
    setSelected((prev) => {
      const exists = prev.find((s) => s.id === seat.id);
      return exists ? prev.filter((s) => s.id !== seat.id) : [...prev, seat];
    });
  }

  function calcTotal() {
    return selected.reduce((sum, s) => {
      const cat = categories.find((c) => c.category_id === s.categoryId);
      return sum + (cat ? parseFloat(cat.price) : 0);
    }, 0).toFixed(2);
  }

  function getCategoryForRow(row: string): Category | undefined {
    let rowIdx = 0;
    for (const cat of categories) {
      const needed = Math.ceil(cat.total_seats / COLS);
      const catRows = ROWS.slice(rowIdx, rowIdx + needed);
      if (catRows.includes(row)) return cat;
      rowIdx += needed;
    }
  }

  async function handleBook() {
    if (selected.length === 0) {
      Alert.alert('Προσοχή', 'Επίλεξε τουλάχιστον μία θέση');
      return;
    }
    setSubmitting(true);
    try {
      const seat_ids = selected.map(s => s.id);
      await api.post('/reservations', { showtime_id: Number(showtimeId), seat_ids });
      Alert.alert('Επιτυχία! 🎭', `Κράτηση ${selected.length} θέσεων ολοκληρώθηκε!`, [
        { text: 'Εντάξει', onPress: () => router.replace('/(tabs)/profile') },
      ]);
    } catch (err: any) {
      Alert.alert('Σφάλμα', err.response?.data?.error || 'Αποτυχία κράτησης');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#E5534B" size="large" /></View>;

  const currentRows = seatMap.map((row) => row[0]?.row).filter(Boolean);

  return (
    <View style={styles.container}>
      <RefreshSpinner visible={refreshing} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
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

        {/* Screen indicator */}
        <View style={styles.screenWrap}>
          <View style={styles.screenBar} />
          <Text style={styles.screenLabel}>ΣΚΗΝΗ</Text>
        </View>

        {/* Category Legend */}
        <View style={styles.legend}>
          {categories.map((cat) => (
            <View key={cat.category_id} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getCatColor(cat.name) }]} />
              <Text style={styles.legendText}>{cat.name} €{parseFloat(cat.price).toFixed(0)}</Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2D2D3E' }]} />
            <Text style={styles.legendText}>Κρατημένη</Text>
          </View>
        </View>

        {/* Seat Map */}
        <View style={styles.seatMapWrap}>
          {seatMap.map((row, rowIdx) => {
            const cat = getCategoryForRow(row[0]?.row);
            const showLabel = rowIdx === 0 || row[0]?.row !== seatMap[rowIdx - 1]?.[0]?.row;
            return (
              <View key={row[0]?.row || rowIdx}>
                {cat && (rowIdx === 0 || getCategoryForRow(seatMap[rowIdx - 1]?.[0]?.row)?.category_id !== cat.category_id) && (
                  <Text style={styles.catLabel}>{cat.name.toUpperCase()}</Text>
                )}
                <View style={styles.seatRow}>
                  <Text style={styles.rowLabel}>{row[0]?.row}</Text>
                  {row.map((seat, colIdx) => (
                    <View key={seat.id} style={colIdx === AISLE_AFTER ? styles.aisleGap : undefined}>
                      <TouchableOpacity
                        style={[
                          styles.seat,
                          seat.state === 'available' && { backgroundColor: getCatColor(cat?.name || '') + '33', borderColor: getCatColor(cat?.name || '') },
                          seat.state === 'selected' && { backgroundColor: getCatColor(cat?.name || ''), borderColor: getCatColor(cat?.name || '') },
                          seat.state === 'taken' && styles.seatTaken,
                        ]}
                        onPress={() => toggleSeat(seat)}
                        disabled={seat.state === 'taken'}
                      >
                        {seat.state === 'selected' && (
                          <Ionicons name="checkmark" size={9} color="#fff" />
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                  <Text style={styles.rowLabel}>{row[0]?.row}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Seat state legend */}
        <View style={styles.stateLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.seatMini, { borderColor: '#E5534B', backgroundColor: '#E5534B33' }]} />
            <Text style={styles.legendText}>Διαθέσιμη</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.seatMini, { backgroundColor: '#E5534B', borderColor: '#E5534B' }]} />
            <Text style={styles.legendText}>Επιλεγμένη</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.seatMini, { backgroundColor: '#2D2D3E', borderColor: '#2D2D3E' }]} />
            <Text style={styles.legendText}>Κρατημένη</Text>
          </View>
        </View>

      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
        <View>
          <Text style={styles.selectedCount}>{selected.length} θέσεις επιλεγμένες</Text>
          <Text style={styles.total}>€{calcTotal()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.bookBtn, selected.length === 0 && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={submitting || selected.length === 0}
        >
          <Ionicons name="ticket-outline" size={18} color="#fff" />
          <Text style={styles.bookBtnText}>{submitting ? 'Κράτηση...' : 'Κράτηση'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getCatColor(name: string): string {
  const n = name?.toLowerCase() || '';
  if (n.includes('vip')) return '#F59E0B';
  if (n.includes('φοιτ')) return '#10B981';
  return '#E5534B';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  centered: { flex: 1, backgroundColor: '#0A0A1A', justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 20 },
  screenWrap: { alignItems: 'center', marginTop: 20, marginBottom: 10 },
  screenBar: {
    width: '70%', height: 6, borderRadius: 3,
    backgroundColor: '#E5534B', opacity: 0.8,
    shadowColor: '#E5534B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 12,
    elevation: 8,
  },
  screenLabel: { color: '#4B5563', fontSize: 11, letterSpacing: 4, marginTop: 6 },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginVertical: 12, paddingHorizontal: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: '#9CA3AF', fontSize: 11 },
  seatMapWrap: { paddingHorizontal: 8, alignItems: 'center' },
  catLabel: { color: '#4B5563', fontSize: 10, letterSpacing: 2, textAlign: 'center', marginTop: 10, marginBottom: 4 },
  seatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  rowLabel: { color: '#4B5563', fontSize: 10, width: 14, textAlign: 'center' },
  seat: {
    width: 22, height: 22, borderRadius: 4, margin: 2,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
    borderColor: '#2D2D3E', backgroundColor: '#2D2D3E',
  },
  seatTaken: { backgroundColor: '#1C1C2E', borderColor: '#1C1C2E' },
  aisleGap: { marginLeft: 8 },
  stateLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 16 },
  seatMini: { width: 16, height: 16, borderRadius: 3, borderWidth: 1 },
  bottomBar: {
    backgroundColor: '#1C1C2E', padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#2D2D3E',
  },
  // paddingBottom applied inline via insets
  selectedCount: { color: '#9CA3AF', fontSize: 12, marginBottom: 2 },
  total: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  bookBtn: {
    backgroundColor: '#E5534B', borderRadius: 12,
    paddingHorizontal: 22, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  bookBtnDisabled: { opacity: 0.35 },
  bookBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
