import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';
import { APP_NAME } from '@barokah/shared';
import { mobileSession } from '../lib/session';

export default function HomeScreen() {
  const user = mobileSession.getUser();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME}</Text>
      <Text style={styles.subtitle}>Mobile POS — Barokah Core</Text>
      {user ? (
        <Text style={styles.userLine}>Masuk sebagai {user.fullName} ({user.role})</Text>
      ) : (
        <Text style={styles.userLine}>Belum login</Text>
      )}
      {mobileSession.isLoggedIn() ? (
        <Link href="/pos" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Buka Kasir</Text>
          </TouchableOpacity>
        </Link>
      ) : (
        <Link href="/login" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </Link>
      )}
      {mobileSession.isLoggedIn() ? (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            void mobileSession.clear().then(() => router.replace('/'));
          }}
        >
          <Text style={styles.secondaryButtonText}>Keluar</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#f8fafc' },
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 8, marginBottom: 16 },
  userLine: { fontSize: 14, color: '#cbd5e1', marginBottom: 24, textAlign: 'center' },
  button: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondaryButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  secondaryButtonText: { color: '#94a3b8', fontWeight: '500', fontSize: 14 },
});
