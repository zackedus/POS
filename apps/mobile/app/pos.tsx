import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Linking,
  Pressable,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { formatCurrencyIDR } from '@barokah/shared';
import { checkoutMobileCash, fetchMobileProductGrid, type MobileProductGridItem } from '../lib/api';
import { mobileSession } from '../lib/session';

const WEB_POS_URL = process.env.EXPO_PUBLIC_WEB_POS_URL ?? 'http://localhost:3001/pos';

type CartLine = MobileProductGridItem & { quantity: number };

export default function PosScreen() {
  const user = mobileSession.getUser();
  const [products, setProducts] = useState<MobileProductGridItem[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart],
  );

  const loadProducts = useCallback(async () => {
    const token = mobileSession.getAccessToken();
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMobileProductGrid(token, 20);
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

  function addToCart(product: MobileProductGridItem) {
    setCart((prev) => {
      const existing = prev.find((line) => line.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  async function handleCheckoutCash() {
    const token = mobileSession.getAccessToken();
    if (!token || cart.length === 0) {
      return;
    }
    setCheckingOut(true);
    setCheckoutMessage(null);
    setError(null);
    try {
      const result = await checkoutMobileCash(token, {
        items: cart.map((line) => ({ productId: line.id, quantity: line.quantity })),
        cashReceived: cartTotal,
      });
      setCheckoutMessage(`Checkout berhasil — ${result.receiptNo} · ${formatCurrencyIDR(result.total)}`);
      setCart([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout gagal. Pastikan shift aktif di API.');
    } finally {
      setCheckingOut(false);
    }
  }

  async function openWebPos() {
    const token = mobileSession.getAccessToken();
    const url = token ? `${WEB_POS_URL}?mobileToken=${encodeURIComponent(token)}` : WEB_POS_URL;
    await Linking.openURL(url);
  }

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
        Halo, {user.fullName} — keranjang sederhana + checkout tunai (shift harus aktif). Fitur penuh via web kasir.
      </Text>

      {loading ? <ActivityIndicator color="#16a34a" style={{ marginVertical: 12 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {checkoutMessage ? <Text style={styles.success}>{checkoutMessage}</Text> : null}

      {cart.length > 0 ? (
        <View style={styles.cartBox}>
          <Text style={styles.cartTitle}>Keranjang ({cart.length})</Text>
          {cart.map((line) => (
            <Text key={line.id} style={styles.cartLine}>
              {line.name} × {line.quantity} — {formatCurrencyIDR(line.price * line.quantity)}
            </Text>
          ))}
          <Text style={styles.cartTotal}>Total: {formatCurrencyIDR(cartTotal)}</Text>
          <Pressable
            style={[styles.checkoutBtn, checkingOut && styles.checkoutBtnDisabled]}
            disabled={checkingOut}
            onPress={() => void handleCheckoutCash()}
          >
            <Text style={styles.checkoutBtnText}>{checkingOut ? 'Memproses…' : 'Bayar Tunai'}</Text>
          </Pressable>
          <Pressable
            style={styles.qrisBtn}
            onPress={() =>
              Alert.alert(
                'QRIS — Segera Hadir',
                'Pembayaran QRIS native mobile masih dalam pengembangan. Gunakan kasir web untuk QRIS, atau bayar tunai di mobile MVP.',
              )
            }
          >
            <Text style={styles.qrisBtnText}>Bayar QRIS (coming soon)</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        style={styles.list}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>Belum ada produk atau API tidak tersedia.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => addToCart(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productMeta}>
                {item.sku}
                {item.unitSymbol ? ` · ${item.unitSymbol}` : ''}
              </Text>
            </View>
            <Text style={styles.price}>{formatCurrencyIDR(item.price)}</Text>
          </Pressable>
        )}
      />

      <Text style={styles.hint} onPress={() => void openWebPos()}>
        Buka kasir web lengkap → {WEB_POS_URL}
      </Text>
      <Link href="/shift/open" style={styles.linkInline}>
        Buka shift mobile
      </Link>
      <Link href="/shift/close" style={styles.linkInline}>
        Tutup shift
      </Link>
      <Text
        style={styles.hintSecondary}
        onPress={() =>
          Alert.alert(
            'Scope Phase 9',
            'Mobile Phase 9: shift open/close aman (SecureStore), keranjang tunai, stub QRIS jujur. Offline queue penuh = Fase 10.',
          )
        }
      >
        Tentang scope mobile Phase 9
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
  success: { color: '#16a34a', marginTop: 8 },
  cartBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  cartTitle: { fontWeight: '600', marginBottom: 6 },
  cartLine: { fontSize: 13, color: '#334155', marginBottom: 2 },
  cartTotal: { fontWeight: '700', marginTop: 6, marginBottom: 8 },
  checkoutBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  checkoutBtnDisabled: { opacity: 0.6 },
  checkoutBtnText: { color: '#fff', fontWeight: '600' },
  qrisBtn: {
    marginTop: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  qrisBtnText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  hint: { color: '#2563eb', marginTop: 16, fontSize: 13, textDecorationLine: 'underline' },
  linkInline: { color: '#16a34a', marginTop: 8, fontSize: 13, fontWeight: '600' },
  hintSecondary: { color: '#64748b', marginTop: 8, fontSize: 12 },
});
