import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { APP_NAME } from '@barokah/shared';
import { loginMobile } from '../lib/api';
import { mobileSession } from '../lib/session';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const result = await loginMobile(email, password);
      await mobileSession.setSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME}</Text>
      <Text style={styles.subtitle}>Login Mobile — Phase 2 MVP</Text>

      <TextInput
        style={styles.input}
        placeholder="Email (contoh: kasir@barokah.local)"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#64748b"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => void handleLogin()}
        disabled={loading || !email.trim() || !password.trim()}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Masuk</Text>}
      </TouchableOpacity>

      <Text style={styles.hint}>
        Dev seed: kasir@barokah.local / Kasir123! · Set EXPO_PUBLIC_API_URL jika API bukan localhost:3000
      </Text>

      <Link href="/" style={styles.backLink}>
        ← Kembali
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '700', color: '#f8fafc', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 8, marginBottom: 24, textAlign: 'center' },
  input: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  error: { color: '#fca5a5', marginBottom: 12, fontSize: 14 },
  button: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  hint: { color: '#64748b', fontSize: 12, marginTop: 16, textAlign: 'center', lineHeight: 18 },
  backLink: { color: '#86efac', marginTop: 20, textAlign: 'center', fontSize: 14 },
});
