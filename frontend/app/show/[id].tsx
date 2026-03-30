import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
};

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [show, setShow] = useState<Show | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [showRes, stRes] = await Promise.all([
        api.get(`/shows/${id}`),
        api.get('/showtimes', { params: { showId: id } }),
      ]);
      setShow(showRes.data);
      setShowtimes(stRes.data);
    } catch (err) {
      Alert.alert('Σφάλμα', 'Αδυναμία φόρτωσης δεδομένων');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#e94560" size="large" />
      </View>
    );
  }

  if (!show) {
    return <View style={styles.centered}><Text style={styles.errorText}>Παράσταση δεν βρέθηκε</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>{show.title}</Text>
        <Text style={styles.theatre}>🏛 {show.theatre_name}</Text>
        <Text style={styles.location}>📍 {show.location}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>⏱ {show.duration} λεπτά</Text>
          <Text style={styles.metaText}>🔞 {show.age_rating}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Περιγραφή</Text>
        <Text style={styles.description}>{show.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Διαθέσιμες Παραστάσεις</Text>
        {showtimes.length === 0 ? (
          <Text style={styles.empty}>Δεν υπάρχουν διαθέσιμες παραστάσεις</Text>
        ) : (
          showtimes.map((st) => (
            <TouchableOpacity
              key={st.showtime_id}
              style={[styles.showtimeCard, st.available_seats === 0 && styles.soldOut]}
              onPress={() => st.available_seats > 0 && router.push(`/booking/${st.showtime_id}`)}
              disabled={st.available_seats === 0}
            >
              <View>
                <Text style={styles.showtimeDate}>📅 {st.date}</Text>
                <Text style={styles.showtimeTime}>⏰ {st.time.slice(0, 5)}  •  🏠 {st.hall}</Text>
              </View>
              <View style={styles.seatsRight}>
                <Text style={[styles.seats, st.available_seats === 0 && styles.soldOutText]}>
                  {st.available_seats === 0 ? 'Εξαντλήθηκε' : `${st.available_seats} θέσεις`}
                </Text>
                {st.available_seats > 0 && (
                  <Text style={styles.bookBtn}>Κράτηση →</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  centered: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  hero: { backgroundColor: '#16213e', padding: 20 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  theatre: { color: '#e94560', fontSize: 14, marginBottom: 2 },
  location: { color: '#a8a8b3', fontSize: 13, marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 20 },
  metaText: { color: '#a8a8b3', fontSize: 13 },
  section: { padding: 16 },
  sectionTitle: { color: '#e94560', fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
  description: { color: '#a8a8b3', fontSize: 14, lineHeight: 22 },
  showtimeCard: {
    backgroundColor: '#16213e', borderRadius: 10, padding: 14,
    marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  soldOut: { opacity: 0.45 },
  showtimeDate: { color: '#fff', fontSize: 14, marginBottom: 4 },
  showtimeTime: { color: '#a8a8b3', fontSize: 13 },
  seatsRight: { alignItems: 'flex-end' },
  seats: { color: '#4ade80', fontSize: 13, marginBottom: 4 },
  soldOutText: { color: '#f87171' },
  bookBtn: { color: '#e94560', fontWeight: 'bold', fontSize: 14 },
  empty: { color: '#a8a8b3', fontSize: 14 },
  errorText: { color: '#f87171', fontSize: 16 },
});
