import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Switch, StyleSheet, ScrollView, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToggleRowProps = {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
};

function ToggleRow({ icon, iconColor, iconBg, title, subtitle, value, onToggle }: ToggleRowProps) {
  return (
    <View style={styles.menuItem}>
      <View style={styles.menuLeft}>
        <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <View style={styles.menuTextBlock}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#2D2D3E', true: '#E5534B' }}
        thumbColor={value ? '#fff' : '#9CA3AF'}
      />
    </View>
  );
}

type LinkRowProps = {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  value?: string;
  onPress?: () => void;
};

function LinkRow({ icon, iconColor, iconBg, title, value, onPress }: LinkRowProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.menuLeft}>
        <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text style={styles.menuTitle}>{title}</Text>
      </View>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        {onPress && <Ionicons name="chevron-forward" size={16} color="#4B5563" />}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [bookingConfirm, setBookingConfirm] = useState(true);
  const [showReminder, setShowReminder] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [locationServices, setLocationServices] = useState(false);
  const [personalizedRecs, setPersonalizedRecs] = useState(true);

  function handleChangePassword() {
    Alert.alert('Αλλαγή Κωδικού', 'Θα σταλεί email επαναφοράς κωδικού στη διεύθυνσή σου.');
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Διαγραφή Λογαριασμού',
      'Αυτή η ενέργεια είναι μη αναστρέψιμη. Όλα τα δεδομένα σου θα διαγραφούν.',
      [
        { text: 'Ακύρωση', style: 'cancel' },
        { text: 'Διαγραφή', style: 'destructive', onPress: () => {} },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ΕΙΔΟΠΟΙΗΣΕΙΣ</Text>
        <View style={styles.menuCard}>
          <ToggleRow
            icon="checkmark-circle-outline"
            iconColor="#10B981"
            iconBg="#10B98120"
            title="Επιβεβαίωση κράτησης"
            subtitle="Ειδοποίηση μετά από κάθε κράτηση"
            value={bookingConfirm}
            onToggle={setBookingConfirm}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="alarm-outline"
            iconColor="#F59E0B"
            iconBg="#F59E0B20"
            title="Υπενθύμιση παράστασης"
            subtitle="2 ώρες πριν την έναρξη"
            value={showReminder}
            onToggle={setShowReminder}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="pricetag-outline"
            iconColor="#0EA5E9"
            iconBg="#0EA5E920"
            title="Προσφορές & νέα"
            subtitle="Εκπτώσεις και ειδικές προσφορές"
            value={promotions}
            onToggle={setPromotions}
          />
        </View>
      </View>

      {/* Privacy */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ΑΠΟΡΡΗΤΟ</Text>
        <View style={styles.menuCard}>
          <ToggleRow
            icon="location-outline"
            iconColor="#7C3AED"
            iconBg="#7C3AED20"
            title="Υπηρεσίες τοποθεσίας"
            subtitle="Εύρεση κοντινών θεάτρων"
            value={locationServices}
            onToggle={setLocationServices}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="sparkles-outline"
            iconColor="#E5534B"
            iconBg="#E5534B20"
            title="Εξατομικευμένες προτάσεις"
            subtitle="Βάσει ιστορικού κρατήσεων"
            value={personalizedRecs}
            onToggle={setPersonalizedRecs}
          />
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ΠΛΗΡΟΦΟΡΙΕΣ</Text>
        <View style={styles.menuCard}>
          <LinkRow
            icon="information-circle-outline"
            iconColor="#9CA3AF"
            iconBg="#9CA3AF20"
            title="Έκδοση εφαρμογής"
            value="1.0.0"
          />
          <View style={styles.divider} />
          <LinkRow
            icon="document-text-outline"
            iconColor="#0EA5E9"
            iconBg="#0EA5E920"
            title="Όροι χρήσης"
            onPress={() => Linking.openURL('https://example.com/terms')}
          />
          <View style={styles.divider} />
          <LinkRow
            icon="shield-outline"
            iconColor="#7C3AED"
            iconBg="#7C3AED20"
            title="Πολιτική απορρήτου"
            onPress={() => Linking.openURL('https://example.com/privacy')}
          />
          <View style={styles.divider} />
          <LinkRow
            icon="mail-outline"
            iconColor="#10B981"
            iconBg="#10B98120"
            title="Επικοινωνία / Υποστήριξη"
            onPress={() => Linking.openURL('mailto:support@theatre.gr')}
          />
        </View>
      </View>

      {/* Account Danger Zone */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ΛΟΓΑΡΙΑΣΜΟΣ</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="key-outline" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.menuTitle}>Αλλαγή κωδικού</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4B5563" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#E5534B20' }]}>
                <Ionicons name="trash-outline" size={18} color="#E5534B" />
              </View>
              <Text style={[styles.menuTitle, { color: '#E5534B' }]}>Διαγραφή λογαριασμού</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  section: { paddingHorizontal: 16, marginBottom: 8, marginTop: 16 },
  sectionLabel: { color: '#4B5563', fontSize: 11, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  menuCard: { backgroundColor: '#1C1C2E', borderRadius: 14, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuTextBlock: { flex: 1 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuTitle: { color: '#fff', fontSize: 14 },
  menuSub: { color: '#4B5563', fontSize: 12, marginTop: 2 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { color: '#4B5563', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#2D2D3E', marginLeft: 62 },
});
