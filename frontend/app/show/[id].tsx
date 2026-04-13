import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

type Show = {
  show_id: number;
  title: string;
  description: string;
  duration: number;
  age_rating: string;
  theatre_name: string;
  location: string;
};

type Showtime = {
  showtime_id: number;
  date: string;
  time: string;
  hall: string;
  available_seats: number;
  total_seats: number;
};

function groupByDate(showtimes: Showtime[]): Record<string, Showtime[]> {
  return showtimes.reduce((acc, st) => {
    if (!acc[st.date]) acc[st.date] = [];
    acc[st.date].push(st);
    return acc;
  }, {} as Record<string, Showtime[]>);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'];
  const months = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];
  return { day: days[d.getDay()], date: d.getDate(), month: months[d.getMonth()] };
}

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [show, setShow] = useState<Show | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [id]);

  async function loadData(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      const [showRes, stRes] = await Promise.all([
        api.get(`/shows/${id}`),
        api.get('/showtimes', { params: { showId: id } }),
      ]);
      setShow(showRes.data);
      setShowtimes(stRes.data);
      setSelectedDate(stRes.data[0]?.date || null);
    } catch {
      Alert.alert('Σφάλμα', 'Αδυναμία φόρτωσης δεδομένων');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#E5534B" size="large" /></View>;
  if (!show) return <View style={styles.centered}><Text style={styles.errorText}>Δεν βρέθηκε</Text></View>;

  const grouped = groupByDate(showtimes);
  const dates = Object.keys(grouped).sort();
  const visibleShowtimes = selectedDate ? (grouped[selectedDate] || []) : [];

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
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroGradient} />
        <Text style={styles.heroEmoji}>🎭</Text>
        <View style={styles.heroOverlay}>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{show.age_rating}</Text>
          </View>
          <Text style={styles.heroTitle}>{show.title}</Text>
          <View style={styles.heroMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaText}> {show.theatre_name}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaText}> {show.duration} λεπτά</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}> {show.location}</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Περιγραφή</Text>
        <Text style={styles.description}>{show.description}</Text>
      </View>

      {/* Date Strip */}
      {dates.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Επιλογή Ημερομηνίας</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dateStrip}>
              {dates.map((d) => {
                const { day, date, month } = formatDate(d);
                const active = selectedDate === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dateCard, active && styles.dateCardActive]}
                    onPress={() => setSelectedDate(d)}
                  >
                    <Text style={[styles.dateDayName, active && styles.dateTextActive]}>{day}</Text>
                    <Text style={[styles.dateNum, active && styles.dateTextActive]}>{date}</Text>
                    <Text style={[styles.dateMonth, active && styles.dateTextActive]}>{month}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Showtimes */}
      {visibleShowtimes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ώρες Παράστασης</Text>
          <View style={styles.showtimeGrid}>
            {visibleShowtimes.map((st) => {
              const pct = Math.round(((st.total_seats - st.available_seats) / st.total_seats) * 100);
              const almostFull = pct >= 70;
              const soldOut = st.available_seats === 0;
              return (
                <TouchableOpacity
                  key={st.showtime_id}
                  style={[styles.showtimePill, soldOut && styles.showtimePillSoldOut]}
                  onPress={() => !soldOut && router.push(`/booking/${st.showtime_id}`)}
                  disabled={soldOut}
                >
                  <Text style={[styles.showtimeTime, soldOut && styles.showtimeTimeSoldOut]}>
                    {st.time.slice(0, 5)}
                  </Text>
                  <Text style={styles.showtimeHall}>{st.hall}</Text>
                  {soldOut ? (
                    <Text style={styles.soldOutLabel}>ΕΞΑΝΤΛ.</Text>
                  ) : almostFull ? (
                    <Text style={styles.almostFullLabel}>ΛΙΓΕΣ ΘΕΣΕΙΣ</Text>
                  ) : (
                    <Text style={styles.availLabel}>{st.available_seats} θέσεις</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  centered: { flex: 1, backgroundColor: '#0A0A1A', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#f87171' },
  hero: {
    height: 240, backgroundColor: '#1C1C2E',
    justifyContent: 'flex-end', alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#7C3AED', opacity: 0.3,
  },
  heroEmoji: {
    position: 'absolute', top: 30, fontSize: 80, opacity: 0.25,
  },
  heroOverlay: {
    width: '100%', padding: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  ratingBadge: {
    backgroundColor: '#E5534B', alignSelf: 'flex-start',
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6,
  },
  ratingText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  heroMeta: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { color: '#9CA3AF', fontSize: 13 },
  section: { padding: 16, paddingBottom: 8 },
  sectionLabel: { color: '#E5534B', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  description: { color: '#9CA3AF', fontSize: 14, lineHeight: 22 },
  dateStrip: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  dateCard: {
    width: 58, alignItems: 'center', paddingVertical: 10,
    backgroundColor: '#1C1C2E', borderRadius: 12, borderWidth: 1, borderColor: '#2D2D3E',
  },
  dateCardActive: { backgroundColor: '#E5534B', borderColor: '#E5534B' },
  dateDayName: { color: '#9CA3AF', fontSize: 11, marginBottom: 4 },
  dateNum: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  dateMonth: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  dateTextActive: { color: '#fff' },
  showtimeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  showtimePill: {
    minWidth: 100, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: '#1C1C2E', borderRadius: 12, borderWidth: 1, borderColor: '#E5534B',
  },
  showtimePillSoldOut: { borderColor: '#2D2D3E', opacity: 0.45 },
  showtimeTime: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  showtimeTimeSoldOut: { color: '#4B5563' },
  showtimeHall: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  availLabel: { color: '#10B981', fontSize: 10, marginTop: 4 },
  almostFullLabel: { color: '#F59E0B', fontSize: 10, marginTop: 4 },
  soldOutLabel: { color: '#4B5563', fontSize: 10, marginTop: 4 },
});
