import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
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

export default function HomeScreen() {
  const router = useRouter();
  const [shows, setShows] = useState<Show[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShows();
  }, []);

  async function fetchShows(query?: string) {
    setLoading(true);
    try {
      const params: any = {};
      if (query) params.title = query;
      const { data } = await api.get('/shows', { params });
      setShows(data);
    } catch (err: any) {
      Alert.alert('Σφάλμα', 'Αδυναμία φόρτωσης παραστάσεων');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    fetchShows(search);
  }

  function renderItem({ item }: { item: Show }) {
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/show/${item.show_id}`)}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardTheatre}>🏛 {item.theatre_name}</Text>
        <Text style={styles.cardLocation}>📍 {item.location}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>⏱ {item.duration} λεπτά</Text>
          <Text style={styles.metaText}>🔞 {item.age_rating}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Αναζήτηση παράστασης ή τοποθεσίας..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#e94560" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={shows}
          keyExtractor={(item) => String(item.show_id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Δεν βρέθηκαν παραστάσεις</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  searchRow: { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: '#16213e', color: '#fff',
    borderRadius: 10, padding: 12, fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#e94560', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14,
  },
  searchBtnText: { fontSize: 18 },
  list: { padding: 12, paddingTop: 4 },
  card: {
    backgroundColor: '#16213e', borderRadius: 12,
    padding: 16, marginBottom: 12,
  },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  cardTheatre: { color: '#e94560', fontSize: 13, marginBottom: 2 },
  cardLocation: { color: '#a8a8b3', fontSize: 13, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 16 },
  metaText: { color: '#a8a8b3', fontSize: 12 },
  empty: { color: '#a8a8b3', textAlign: 'center', marginTop: 40, fontSize: 16 },
});
