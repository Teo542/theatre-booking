import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../lib/api';

type Category = {
  category_id: number;
  name: string;
  price: string;
  available_seats: number;
};

type Selection = { [categoryId: number]: number };

export default function BookingScreen() {
  const { showtimeId } = useLocalSearchParams<{ showtimeId: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selection, setSelection] = useState<Selection>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [showtimeId]);

  async function loadCategories() {
    try {
      const { data } = await api.get('/seats', { params: { showtimeId } });
      setCategories(data);
    } catch (err) {
      Alert.alert('Σφάλμα', 'Αδυναμία φόρτωσης θέσεων');
    } finally {
      setLoading(false);
    }
  }

  function changeQty(categoryId: number, delta: number, max: number) {
    setSelection((prev) => {
      const current = prev[categoryId] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [categoryId]: next };
    });
  }

  function calcTotal() {
    return categories.reduce((sum, cat) => {
      const qty = selection[cat.category_id] || 0;
      return sum + qty * parseFloat(cat.price);
    }, 0).toFixed(2);
  }

  function hasSelection() {
    return Object.values(selection).some((q) => q > 0);
  }

  async function handleBook() {
    if (!hasSelection()) {
      Alert.alert('Προσοχή', 'Επίλεξε τουλάχιστον μία θέση');
      return;
    }
    const items = Object.entries(selection)
      .filter(([, qty]) => qty > 0)
      .map(([catId, qty]) => ({ category_id: Number(catId), quantity: qty }));

    setSubmitting(true);
    try {
      await api.post('/reservations', { showtime_id: Number(showtimeId), items });
      Alert.alert('Επιτυχία! 🎭', 'Η κράτησή σου ολοκληρώθηκε!', [
        { text: 'ΟΚ', onPress: () => router.replace('/(tabs)/profile') },
      ]);
    } catch (err: any) {
      Alert.alert('Σφάλμα', err.response?.data?.error || 'Αποτυχία κράτησης');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#e94560" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Επιλογή Θέσεων</Text>

        {categories.map((cat) => {
          const qty = selection[cat.category_id] || 0;
          return (
            <View key={cat.category_id} style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catPrice}>€{parseFloat(cat.price).toFixed(2)} / θέση</Text>
                <Text style={styles.catAvail}>{cat.available_seats} διαθέσιμες</Text>
              </View>
              <View style={styles.counter}>
                <TouchableOpacity style={styles.counterBtn} onPress={() => changeQty(cat.category_id, -1, cat.available_seats)}>
                  <Text style={styles.counterBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterQty}>{qty}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => changeQty(cat.category_id, +1, cat.available_seats)}>
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.total}>Σύνολο: €{calcTotal()}</Text>
        <TouchableOpacity
          style={[styles.bookBtn, !hasSelection() && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={submitting || !hasSelection()}
        >
          <Text style={styles.bookBtnText}>{submitting ? 'Κράτηση...' : '🎟 Κράτηση'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  centered: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  heading: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  card: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 16,
    marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardLeft: { flex: 1 },
  catName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  catPrice: { color: '#e94560', fontSize: 14, marginBottom: 2 },
  catAvail: { color: '#a8a8b3', fontSize: 12 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: {
    backgroundColor: '#0f3460', width: 36, height: 36,
    borderRadius: 18, justifyContent: 'center', alignItems: 'center',
  },
  counterBtnText: { color: '#fff', fontSize: 20, lineHeight: 22 },
  counterQty: { color: '#fff', fontSize: 18, fontWeight: 'bold', minWidth: 24, textAlign: 'center' },
  footer: {
    backgroundColor: '#16213e', padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  total: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  bookBtn: { backgroundColor: '#e94560', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  bookBtnDisabled: { opacity: 0.4 },
  bookBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
