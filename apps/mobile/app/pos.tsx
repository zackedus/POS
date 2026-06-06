import { View, Text, StyleSheet } from 'react-native';

export default function PosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kasir Mobile</Text>
      <Text style={styles.subtitle}>Modul kasir — Sprint 1</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f1f5f9' },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#64748b', marginTop: 8 },
});
