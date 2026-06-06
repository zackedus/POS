import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { APP_NAME } from '@barokah/shared';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME}</Text>
      <Text style={styles.subtitle}>Mobile POS — Barokah Core</Text>
      <Link href="/pos" asChild>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Buka Kasir</Text>
        </TouchableOpacity>
      </Link>
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
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 8, marginBottom: 32 },
  button: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
