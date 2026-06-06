import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Linking } from 'react-native';
import { Link } from 'expo-router';
import { formatCurrencyIDR } from '@barokah/shared';
import { fetchMobileProductGrid, type MobileProductGridItem } from '../lib/api';
import { mobileSession } from '../lib/session';

const WEB_POS_URL = process.env.EXPO_PUBLIC_WEB_POS_URL ?? 'http://localhost:3001/pos';

export default function PosScreen() {
  const user = mobileSession.getUser();
  const [products, setProducts] = useState<MobileProductGridItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    const token = mobileSession.getAccessToken();
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMobileProductGrid(token, 15);
      setProducts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat produk.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void loadProducts();
    }
  }, [user, loadProducts]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Kasir Mobile</Text>
        <Text style={styles.subtitle}>Silakan login terlebih dahulu.</Text>
        <Link href="/login" style={styles.link}>
          Ke halaman login
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kasir Mobile</Text>
      <Text style={styles.subtitle}>
        Halo, {user.fullName} — daftar produk read-only. Checkout penuh via web kasir (Fase 2 offline).
      </Text>

      {loading ? <ActivityIndicator color="#16a34a" style={{ marginVertical: 12 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        style={styles.list}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>Belum ada produk atau API tidak tersedia.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productMeta}>
                {item.sku}
                {item.unitSymbol ? ` · ${item.unitSymbol}` : ''}
              </Text>
            </View>
            <Text style={styles.price}>{formatCurrencyIDR(item.price)}</Text>
          </View>
        )}
      />

      <Text style={styles.hint} onPress={() => void Linking.openURL(WEB_POS_URL)}>
        Buka kasir web lengkap → {WEB_POS_URL}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f1f5f9' },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#64748b', marginTop: 8, lineHeight: 22 },
  link: { marginTop: 16, color: '#16a34a', fontWeight: '600' },
  list: { marginTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productName: { fontWeight: '600', color: '#0f172a' },
  productMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  price: { fontWeight: '600', color: '#16a34a' },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 24 },
  error: { color: '#dc2626', marginTop: 8 },
  hint: { color: '#2563eb', marginTop: 16, fontSize: 13, textDecorationLine: 'underline' },
});
