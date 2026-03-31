import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
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

const GENRE_FILTERS = ['Όλα', 'Τραγωδία', 'Κωμωδία', 'Σύγχρονο', 'Αρχαίο'];

const SHOW_COLORS = [
  ['#E5534B', '#7C3AED'],
  ['#F97316', '#DB2777'],
  ['#0EA5E9', '#7C3AED'],
  ['#10B981', '#0EA5E9'],
  ['#F59E0B', '#E5534B'],
];

export default function HomeScreen() {
  const router = useRouter();
  const [shows, setShows] = useState<Show[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Όλα');

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
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  function renderShowCard({ item, index }: { item: Show; index: number }) {
    const colors = SHOW_COLORS[index % SHOW_COLORS.length];
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/show/${item.show_id}`)}
      >
        <View style={[styles.cardPoster, { backgroundColor: colors[0] }]}>
          <View style={[styles.cardPosterAccent, { backgroundColor: colors[1] }]} />
          <Text style={styles.cardPosterEmoji}>🎭</Text>
          <View style={styles.cardPosterBadge}>
            <Text style={styles.cardPosterBadgeText}>{item.age_rating}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.cardRow}>
            <Ionicons name="business-outline" size={12} color="#9CA3AF" />
            <Text style={styles.cardMeta} numberOfLines={1}> {item.theatre_name}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
            <Text style={styles.cardMeta} numberOfLines={1}> {item.location}</Text>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={11} color="#E5534B" />
              <Text style={styles.durationText}> {item.duration}'</Text>
            </View>
            <View style={styles.bookNowBtn}>
              <Text style={styles.bookNowText}>Κράτηση</Text>
              <Ionicons name="chevron-forward" size={12} color="#E5534B" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Αναζήτηση παράστασης..."
            placeholderTextColor="#4B5563"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchShows(search)}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); fetchShows(); }}>
              <Ionicons name="close-circle" size={18} color="#4B5563" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Genre Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {GENRE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Shows List */}
      {loading ? (
        <ActivityIndicator color="#E5534B" size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={shows}
          keyExtractor={(item) => String(item.show_id)}
          renderItem={renderShowCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🎭</Text>
              <Text style={styles.emptyText}>Δεν βρέθηκαν παραστάσεις</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C2E',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  filterScroll: { flexShrink: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  filterPill: {
    paddingHorizontal: 18, paddingVertical: 8, marginRight: 8,
    borderRadius: 20, backgroundColor: '#1C1C2E', borderWidth: 1, borderColor: '#2D2D3E',
  },
  filterPillActive: { backgroundColor: '#E5534B', borderColor: '#E5534B' },
  filterText: { color: '#9CA3AF', fontSize: 13, letterSpacing: 0.3 },
  filterTextActive: { color: '#fff', fontWeight: '600', letterSpacing: 0.3 },
  list: { padding: 16, gap: 14 },
  card: {
    backgroundColor: '#1C1C2E', borderRadius: 16,
    flexDirection: 'row', overflow: 'hidden',
  },
  cardPoster: {
    width: 90, height: 120,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  cardPosterAccent: {
    position: 'absolute', bottom: -20, right: -20,
    width: 80, height: 80, borderRadius: 40, opacity: 0.5,
  },
  cardPosterEmoji: { fontSize: 36, zIndex: 1 },
  cardPosterBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  cardPosterBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  cardBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  cardMeta: { color: '#9CA3AF', fontSize: 12, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  durationBadge: { flexDirection: 'row', alignItems: 'center' },
  durationText: { color: '#E5534B', fontSize: 12 },
  bookNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bookNowText: { color: '#E5534B', fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#4B5563', fontSize: 16 },
});
