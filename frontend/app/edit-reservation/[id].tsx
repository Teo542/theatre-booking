import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

type Category = {
  category_id: number;
  name: string;
  price: string;
  available_seats: number;
  total_seats: number;
};

type CurrentItem = {
  category_name: string;
  quantity: number;
  unit_price: number;
};

export default function EditReservationScreen() {
  const { id, showtimeId } = useLocalSearchParams<{ id: string; showtimeId: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentItems, setCurrentItems] = useState<CurrentItem[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [catsRes, resRes] = await Promise.all([
        api.get('/seats', { params: { showtimeId } }),
        api.get('/user/reservations'),
      ]);

      const cats: Category[] = catsRes.data.categories;
      const reservation = resRes.data.find((r: any) => String(r.reservation_id) === String(id));
      const items: CurrentItem[] = reservation?.items || [];

      // Build initial quantities from existing booking
      const initial: Record<number, number> = {};
      for (const cat of cats) {
        const existing = items.find(i => i.category_name === cat.name);
        initial[cat.category_id] = existing?.quantity || 0;
      }

      setCategories(cats);
      setCurrentItems(items);
      setQuantities(initial);
    } catch {
      Alert.alert('Σφάλμα', 'Αδυναμία φόρτωσης δεδομένων');
    } finally {
      setLoading(false);
    }
  }

  function maxForCategory(cat: Category): number {
    // Available seats + what the user already has booked in this category
    const existing = currentItems.find(i => i.category_name === cat.name);
    return cat.available_seats + (existing?.quantity || 0);
  }

  function adjust(categoryId: number, delta: number, max: number) {
    setQuantities(prev => {
      const next = Math.max(0, Math.min(max, (prev[categoryId] || 0) + delta));
      return { ...prev, [categoryId]: next };
    });
  }

  function totalSeats() {
    return Object.values(quantities).reduce((s, q) => s + q, 0);
  }

  function totalPrice() {
    return categories.reduce((sum, cat) => {
      return sum + (quantities[cat.category_id] || 0) * parseFloat(cat.price);
    }, 0).toFixed(2);
  }

  async function handleSave() {
    if (totalSeats() === 0) {
      Alert.alert('Σφάλμα', 'Επίλεξε τουλάχιστον μία θέση');
      return;
    }

    const items = categories
      .filter(cat => (quantities[cat.category_id] || 0) > 0)
      .map(cat => ({ category_id: cat.category_id, quantity: quantities[cat.category_id] }));

    setSaving(true);
    try {
      await api.put(`/reservations/${id}`, { items });
      Alert.alert('Επιτυχία', 'Η κράτησή σου ενημερώθηκε', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Σφάλμα', err.response?.data?.error || 'Αποτυχία ενημέρωσης');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#E5534B" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>Άλλαξε τον αριθμό θέσεων ανά κατηγορία</Text>

        {categories.map(cat => {
          const qty = quantities[cat.category_id] || 0;
          const max = maxForCategory(cat);
          const catColor = cat.name.toLowerCase().includes('vip')
            ? '#F59E0B'
            : cat.name.toLowerCase().includes('φοιτ') || cat.name.toLowerCase().includes('student')
            ? '#10B981'
            : '#E5534B';

          return (
            <View key={cat.category_id} style={styles.categoryCard}>
              <View style={[styles.categoryAccent, { backgroundColor: catColor }]} />
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Text style={styles.categoryPrice}>€{parseFloat(cat.price).toFixed(2)} / θέση</Text>
                <Text style={styles.categoryAvail}>{max} διαθέσιμες θέσεις</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[styles.stepBtn, qty === 0 && styles.stepBtnDisabled]}
                  onPress={() => adjust(cat.category_id, -1, max)}
                  disabled={qty === 0}
                >
                  <Ionicons name="remove" size={18} color={qty === 0 ? '#2D2D3E' : '#fff'} />
                </TouchableOpacity>
                <Text style={styles.stepQty}>{qty}</Text>
                <TouchableOpacity
                  style={[styles.stepBtn, qty >= max && styles.stepBtnDisabled]}
                  onPress={() => adjust(cat.category_id, +1, max)}
                  disabled={qty >= max}
                >
                  <Ionicons name="add" size={18} color={qty >= max ? '#2D2D3E' : '#fff'} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>{totalSeats()} θέσεις</Text>
          <Text style={styles.bottomTotal}>€{totalPrice()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, (saving || totalSeats() === 0) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || totalSeats() === 0}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Αποθήκευση</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  centered: { flex: 1, backgroundColor: '#0A0A1A', justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 8 },
  hint: { color: '#4B5563', fontSize: 13, marginBottom: 16 },
  categoryCard: {
    backgroundColor: '#1C1C2E', borderRadius: 14, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  categoryAccent: { width: 4, alignSelf: 'stretch' },
  categoryInfo: { flex: 1, padding: 14 },
  categoryName: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  categoryPrice: { color: '#9CA3AF', fontSize: 13, marginBottom: 2 },
  categoryAvail: { color: '#4B5563', fontSize: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', paddingRight: 14, gap: 12 },
  stepBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#2D2D3E', justifyContent: 'center', alignItems: 'center',
  },
  stepBtnDisabled: { backgroundColor: '#1C1C2E' },
  stepQty: { color: '#fff', fontSize: 18, fontWeight: 'bold', minWidth: 24, textAlign: 'center' },
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1C1C2E', padding: 16,
    borderTopWidth: 1, borderTopColor: '#2D2D3E',
  },
  bottomLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 2 },
  bottomTotal: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  saveBtn: {
    backgroundColor: '#E5534B', borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  saveBtnDisabled: { backgroundColor: '#4B5563' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
