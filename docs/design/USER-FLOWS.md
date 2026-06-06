> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Design | Audience: Maya, Dewi, Fajar

# User Flows — Modul Kasir MVP

> Disusun oleh **@ui-ux** | Requirement: `docs/requirements/MVP-CHECKLIST.md`

Alur operasional kasir Barokah POS. Setiap flow dilengkapi daftar layar dan deskripsi wireframe (text-based).

---

## 1. Login

```mermaid
flowchart TD
    A[Buka app /pos] --> B{Sudah login?}
    B -->|Tidak| C[Layar Login]
    B -->|Ya| D{Shift aktif?}
    C --> E[Input email + password]
    E --> F{Valid?}
    F -->|Tidak| G[Error: kredensial salah]
    G --> E
    F -->|Ya| H[Simpan token + redirect]
    H --> D
    D -->|Tidak| I[Redirect Buka Shift]
    D -->|Ya| J[Layar Kasir Main]
```

### Screen List — Login

| ID | Nama | Deskripsi Wireframe |
|----|------|---------------------|
| SCR-L01 | Login | Logo Barokah center-top; form email + password; tombol "Masuk" full-width primary; link lupa password (P1) |
| SCR-L02 | Login Error | Inline error di bawah password; shake animation ringan; focus kembali ke field error |

---

## 2. Buka Shift

```mermaid
flowchart TD
    A[Kasir login sukses] --> B{Shift hari ini sudah buka?}
    B -->|Ya, oleh kasir lain| C[Info: shift outlet aktif]
    B -->|Belum| D[Modal Buka Shift]
    C --> E{Role manager?}
    E -->|Ya| F[Opsi force close shift lama]
    E -->|Tidak| G[Tunggu / hubungi manager]
    D --> H[Input saldo awal kas - Numpad]
    H --> I[Konfirmasi buka shift]
    I --> J[Shift aktif → Kasir Main]
    F --> D
```

### Screen List — Buka Shift

| ID | Nama | Deskripsi Wireframe |
|----|------|---------------------|
| SCR-S01 | Buka Shift Modal | Blocking overlay; heading "Buka Shift"; info outlet + tanggal; field saldo awal + numpad 3×4; tombol "Buka Shift" primary |
| SCR-S02 | Shift Conflict | Banner: shift aktif oleh [nama kasir] sejak [jam]; tombol secondary "Hubungi Manager" |
| SCR-S03 | Shift Open Success | Toast hijau "Shift dibuka"; redirect ke kasir main |

---

## 3. Transaksi Kasir (Main Loop)

```mermaid
flowchart TD
    A[Kasir Main] --> B[Barcode input focused]
    B --> C{Input?}
    C -->|Scan barcode| D[Cari produk]
    C -->|Tap ProductCard| D
    C -->|Search manual| D
    D --> E{Ditemukan?}
    E -->|Ya| F[Tambah/increment qty di keranjang]
    E -->|Tidak| G[Toast error + tetap focused]
    F --> H[Update total real-time]
    G --> B
    H --> I{Aksi kasir?}
    I -->|Ubah qty| J[Stepper / numpad qty]
    I -->|Hapus item| K[Confirm swipe atau tap hapus]
    I -->|Hold| L[Flow Hold Bill]
    I -->|Bayar| M[Flow Checkout]
    I -->|Lanjut scan| B
    J --> H
    K --> H
```

### Screen List — Transaksi Kasir

| ID | Nama | Deskripsi Wireframe |
|----|------|---------------------|
| SCR-K01 | Kasir Main | Header: outlet, kasir, shift timer, hold badge; kiri: search + grid ProductCard; kanan: CartPanel sticky; hidden barcode input always focused |
| SCR-K02 | Product Not Found | Toast merah "Produk tidak ditemukan"; suggestion chip kategori populer |
| SCR-K03 | Qty Edit | Inline stepper di CartLineItem; long-press qty → numpad modal |
| SCR-K04 | Remove Item | IconButton hapus; confirm jika qty > 5 atau subtotal > Rp 100rb |

---

## 4. Hold Bill

```mermaid
flowchart TD
    A[Keranjang ada item] --> B[Tap Hold]
    B --> C[Input label opsional]
    C --> D[Simpan hold + kosongkan keranjang]
    D --> E[Badge Hold n+1]
    E --> F{Recall?}
    F -->|Tap daftar hold| G[Pilih bill]
    G --> H{Keranjang kosong?}
    H -->|Ya| I[Load items ke keranjang]
    H -->|Tidak| J[Confirm replace cart]
    J --> I
    I --> K[Kasir Main lanjut]
    F -->|TTL expired| L[Auto release + toast info]
```

### Screen List — Hold Bill

| ID | Nama | Deskripsi Wireframe |
|----|------|---------------------|
| SCR-H01 | Hold Confirm | Bottom sheet: label opsional (Meja 3); tombol "Tahan Transaksi" |
| SCR-H02 | Hold List Drawer | Side drawer: list hold dengan label, total, countdown TTL; tap = recall |
| SCR-H03 | Replace Cart Confirm | Modal: "Keranjang aktif akan diganti" — Batal / Lanjutkan |

---

## 5. Checkout

```mermaid
flowchart TD
    A[Tap Bayar] --> B{Keranjang kosong?}
    B -->|Ya| C[Disabled - no op]
    B -->|Tidak| D[Modal Payment]
    D --> E[Pilih metode]
    E --> F{Metode?}
    F -->|Cash| G[Numpad jumlah terima]
    G --> H[Hitung kembalian]
    F -->|Transfer| I[Input ref / konfirmasi manual]
    F -->|QRIS| J[Tampilkan QR + polling]
    H --> K[Konfirmasi bayar]
    I --> K
    J --> L{QRIS sukses?}
    L -->|Timeout| M[Ganti metode / retry]
    M --> E
    L -->|Ya| K
    K --> N[Proses transaksi]
    N --> O{Sukses?}
    O -->|Ya| P[Receipt + cetak/PDF]
    O -->|Tidak| Q[Error modal + retry]
    P --> R[Kosongkan keranjang → Kasir Main]
    Q --> D
```

### Screen List — Checkout

| ID | Nama | Deskripsi Wireframe |
|----|------|---------------------|
| SCR-P01 | Payment Modal | Total besar; breakdown subtotal/PPN; PaymentMethodPicker tiles |
| SCR-P02 | Cash Payment | Numpad + field terima; kembalian hijau besar; shortcut "Uang pas" |
| SCR-P03 | Transfer Confirm | Checkbox "Transfer diterima"; field catatan opsional |
| SCR-P04 | QRIS | QR center; countdown 120s; status polling; tombol "Batalkan QRIS" |
| SCR-P05 | Split Payment P0 | Tab metode 1 + metode 2; alokasi nominal per metode |
| SCR-P06 | Processing | Skeleton/button loading; non-blocking cancel hanya pre-submit |
| SCR-P07 | Success | Checkmark + no struk; auto-print; tombol "Transaksi Baru" |
| SCR-P08 | Receipt Preview | Layout thermal 58mm; tombol Cetak Ulang / Share PDF |

---

## 6. Tutup Shift

```mermaid
flowchart TD
    A[Menu / tombol Tutup Shift] --> B{Keranjang kosong?}
    B -->|Tidak| C[Warning: selesaikan transaksi]
    B -->|Ya| D[Wizard Tutup Shift]
    D --> E[Ringkasan penjualan hari]
    E --> F[Input saldo akhir kas - Numpad]
    F --> G[Hitung selisih vs expected]
    G --> H{Selisih ≠ 0?}
    H -->|Ya| I[Input catatan wajib]
    H -->|Tidak| J[Konfirmasi tutup]
    I --> J
    J --> K[Tutup shift + laporan]
    K --> L[Logout atau idle screen]
    C --> M[Kembali ke Kasir Main]
```

### Screen List — Tutup Shift

| ID | Nama | Deskripsi Wireframe |
|----|------|---------------------|
| SCR-C01 | Pre-close Warning | Modal: item di keranjang / hold aktif — selesaikan dulu |
| SCR-C02 | Shift Summary | Card: total penjualan, per metode bayar, jumlah transaksi |
| SCR-C03 | Cash Reconciliation | Expected cash vs input saldo akhir; selisih merah/hijau |
| SCR-C04 | Close Confirm | Checkbox "Saya yakin data benar"; tombol danger "Tutup Shift" |
| SCR-C05 | Shift Closed | Ringkasan printable; tombol "Logout" |

---

## Cross-Flow Navigation

```mermaid
flowchart LR
    Login --> BukaShift --> KasirMain
    KasirMain --> HoldBill
    HoldBill --> KasirMain
    KasirMain --> Checkout
    Checkout --> KasirMain
    KasirMain --> TutupShift
    TutupShift --> Login
```

---

## Handoff

| Tim | Artefak |
|-----|---------|
| @senior-dev | Screen ID → route mapping; component list per SCR-* |
| @docs | User guide kasir per flow; placeholder `[SS: SCR-*]` |
| @analyst | Validasi acceptance criteria vs screen list |
