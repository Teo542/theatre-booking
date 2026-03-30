import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import api from '../../lib/api';
import { setToken, setUser } from '../../lib/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>🎭 TheatreBooking</Text>
        <Text style={styles.subtitle}>Εγγραφή</Text>

        <TextInput
          style={styles.input}
          placeholder="Όνομα"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Κωδικός (τουλάχιστον 6 χαρακτήρες)"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Εγγραφή...' : 'Δημιουργία Λογαριασμού'}</Text>
        </TouchableOpacity>

        <Link href="/(auth)/login" style={styles.link}>
          Έχεις ήδη λογαριασμό; Σύνδεση
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#16213e', borderRadius: 16, padding: 28 },
  title: { color: '#e94560', fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 24 },
  input: {
    backgroundColor: '#0f3460', color: '#fff', borderRadius: 10,
    padding: 14, marginBottom: 14, fontSize: 15,
  },
  button: {
    backgroundColor: '#e94560', borderRadius: 10,
    padding: 15, alignItems: 'center', marginTop: 6,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#a8a8b3', textAlign: 'center', marginTop: 18, fontSize: 14 },
});
