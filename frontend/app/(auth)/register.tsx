import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, StatusBar, ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { setToken, setUser } from '../../lib/auth';

const PASSWORD_RULE_MESSAGE =
  'Password must be 8+ characters with uppercase, lowercase, number, and symbol like ! > ? :';
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Fill in all fields');
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      Alert.alert('Error', PASSWORD_RULE_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/register', { name, email, password });
      await setToken(data.token);
      await setUser(data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Registration failed', err.response?.data?.error || 'Could not create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoWrap}>
          <Text style={styles.logoEmoji}>Theatre</Text>
          <Text style={styles.logoTitle}>TheatreBooking</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Create Account</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color="#4B5563" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full name"
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
              placeholder="Password (8+, Aa, 0-9, ! > ? :)"
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
            <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
            {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { flex: 1, backgroundColor: '#0A0A1A' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoEmoji: { fontSize: 24, marginBottom: 8, color: '#fff', fontWeight: '700' },
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
