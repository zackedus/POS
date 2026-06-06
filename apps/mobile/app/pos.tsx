import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { mobileSession } from '../lib/session';

export default function PosScreen() {
  const user = mobileSession.getUser();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kasir Mobile</Text>
      <Text style={styles.subtitle}>
        {user ? `Halo, ${user.fullName} — modul kasir penuh direncanakan Fase 2.` : 'Silakan login terlebih dahulu.'}
      </Text>
      {!user ? (
        <Link href="/login" style={styles.link}>
          Ke halaman login
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f1f5f9' },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#64748b', marginTop: 8, lineHeight: 22 },
  link: { marginTop: 16, color: '#16a34a', fontWeight: '600' },
});
