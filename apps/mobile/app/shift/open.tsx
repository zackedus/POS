import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { fetchMobileActiveShift, openMobileShift } from '../../lib/api';
import { mobileSession } from '../../lib/session';
import { mobileShiftStore } from '../../lib/shift-store';

export default function OpenShiftScreen() {
  const [openingCash, setOpeningCash] = useState('100000');
  const [loading, setLoading] = useState(false);
  const token = mobileSession.getAccessToken();

  async function handleOpenShift() {
    if (!token) {
      router.replace('/login');
      return;
    }
    const amount = Number(openingCash.replace(/\D/g, '')) || 0;
    setLoading(true);
    try {
      const existing = await fetchMobileActiveShift(token);
      if (existing) {
        await mobileShiftStore.set({
          shiftId: existing.id,
          openingCash: existing.openingCash,
          openedAt: existing.openedAt,
        });
        Alert.alert('Shift aktif', 'Shift sudah terbuka di server.');
        router.replace('/pos');
        return;
      }
      const shift = await openMobileShift(token, amount);
      await mobileShiftStore.set({
        shiftId: shift.id,
        openingCash: shift.openingCash,
        openedAt: shift.openedAt,
      });
      router.replace('/pos');
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Tidak bisa membuka shift.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Login diperlukan</Text>
        <Link href="/login" style={styles.link}>Ke halaman login</Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buka Shift</Text>
      <Text style={styles.subtitle}>Masukkan saldo awal laci kas tunai.</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={openingCash}
        onChangeText={setOpeningCash}
        placeholder="Saldo awal (Rp)"
        placeholderTextColor="#64748b"
      />
      <Pressable style={styles.button} disabled={loading} onPress={() => void handleOpenShift()}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Buka Shift</Text>}
      </Pressable>
      <Link href="/pos" style={styles.link}>Kembali ke kasir</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#f8fafc', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 16 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    color: '#f8fafc',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#22c55e',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: '#38bdf8', textAlign: 'center', marginTop: 8 },
});
