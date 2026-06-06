import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { formatCurrencyIDR } from '@barokah/shared';
import {
  closeMobileShift,
  fetchMobileActiveShift,
  fetchMobileShiftClosePreview,
} from '../../lib/api';
import { mobileSession } from '../../lib/session';
import { mobileShiftStore } from '../../lib/shift-store';

export default function CloseShiftScreen() {
  const token = mobileSession.getAccessToken();
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [closingCash, setClosingCash] = useState('');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof fetchMobileShiftClosePreview>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const stored = await mobileShiftStore.get();
      let id = stored?.shiftId ?? null;
      if (!id) {
        const active = await fetchMobileActiveShift(token);
        id = active?.id ?? null;
      }
      if (!id) {
        setShiftId(null);
        setPreview(null);
        return;
      }
      setShiftId(id);
      const closePreview = await fetchMobileShiftClosePreview(token, id);
      setPreview(closePreview);
      setClosingCash(String(closePreview.expectedCash));
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Tidak bisa memuat shift.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCloseShift() {
    if (!token || !shiftId) return;
    const amount = Number(closingCash.replace(/\D/g, '')) || 0;
    setSubmitting(true);
    try {
      await closeMobileShift(token, shiftId, amount);
      await mobileShiftStore.clear();
      Alert.alert('Shift ditutup', 'Ringkasan shift tersimpan di server.');
      router.replace('/');
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Tidak bisa menutup shift.');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#22c55e" size="large" />
      </View>
    );
  }

  if (!shiftId || !preview) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tidak ada shift aktif</Text>
        <Link href="/shift/open" style={styles.link}>Buka shift</Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tutup Shift</Text>
      <View style={styles.card}>
        <Text style={styles.row}>Saldo awal: {formatCurrencyIDR(preview.openingCash)}</Text>
        <Text style={styles.row}>Penjualan tunai: {formatCurrencyIDR(preview.cashSales)}</Text>
        <Text style={styles.row}>Harusnya di laci: {formatCurrencyIDR(preview.expectedCash)}</Text>
        <Text style={styles.row}>Transaksi: {preview.transactionCount}</Text>
        {preview.heldWarning ? <Text style={styles.warning}>{preview.heldWarning}</Text> : null}
      </View>
      <Text style={styles.label}>Uang di laci (closing cash)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={closingCash}
        onChangeText={setClosingCash}
        placeholderTextColor="#64748b"
      />
      <Pressable style={styles.button} disabled={submitting} onPress={() => void handleCloseShift()}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Tutup Shift</Text>
        )}
      </Pressable>
      <Link href="/pos" style={styles.link}>Kembali ke kasir</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#f8fafc', marginBottom: 16 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    gap: 6,
  },
  row: { color: '#e2e8f0', fontSize: 14 },
  warning: { color: '#fbbf24', fontSize: 13, marginTop: 6 },
  label: { color: '#94a3b8', marginBottom: 6, fontSize: 13 },
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
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: '#38bdf8', textAlign: 'center', marginTop: 8 },
});
