import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, StatusBar, ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { setToken, setUser } from '../../lib/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Σφάλμα', 'Συμπλήρωσε όλα τα πεδία');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/register', { name, email, password });
      await setToken(data.token);
      await setUser(data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Σφάλμα εγγραφής', err.response?.data?.error || 'Αποτυχία εγγραφής');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      <View style={styles.logoWrap}>
        <Text style={styles.logoEmoji}>🎭</Text>
        <Text style={styles.logoTitle}>TheatreBooking</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Δημιουργία Λογαριασμού</Text>

        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={18} color="#4B5563" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Ονοματεπώνυμο"
            placeholderTextColor="#4B5563"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color="#4B5563" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#4B5563"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#4B5563" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Κωδικός (τουλάχιστον 6 χαρακτήρες)"
            placeholderTextColor="#4B5563"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
          />
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#4B5563" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Εγγραφή...' : 'Δημιουργία Λογαριασμού'}</Text>
          {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ή</Text>
          <View style={styles.dividerLine} />
        </View>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Έχεις ήδη λογαριασμό; Σύνδεση</Text>
          </TouchableOpacity>
        </Link>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoEmoji: { fontSize: 48, marginBottom: 8 },
  logoTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', letterSpacing: 1 },
  form: { backgroundColor: '#1C1C2E', borderRadius: 20, padding: 24 },
  formTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0A0A1A', borderRadius: 12,
    paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: '#2D2D3E',
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },
  eyeBtn: { padding: 4 },
  button: {
    backgroundColor: '#E5534B', borderRadius: 12,
    padding: 16, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8, marginTop: 4,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2D2D3E' },
  dividerText: { color: '#4B5563', fontSize: 13 },
  secondaryBtn: {
    borderWidth: 1, borderColor: '#2D2D3E', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  secondaryText: { color: '#9CA3AF', fontSize: 14 },
});
