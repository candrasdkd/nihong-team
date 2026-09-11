# 📦 Nihong Jastip — Workspace & Management Dashboard

Aplikasi workspace dan dashboard operasional terpadu untuk tim **Nihong Jastip** (Jasa Titip Jepang - Indonesia). Dirancang untuk mempercepat alur kerja dari monitoring pesanan, pembukuan kas, jadwal handcarry, pencarian jastiper, hingga portal mandiri untuk pelanggan.

---

## 🚀 Fitur Utama

### 1. 📊 Dashboard & Monitoring Finansial
- Ringkasan statistik performa bulanan, omzet, dan total beban kargo jastip.
- Monitoring status pesanan aktif dan pelacakan pembayaran.
- Grafik analitik transaksi dan kurs Yen real-time.

### 2. 📝 Manajemen Pesanan & Split Payment
- Pelacakan sistem pembayaran bertahap: **DP (Down Payment)** dan **Pelunasan**.
- Status pesanan terintegrasi: *Belum Bayar*, *DP Terbayar*, *Lunas*, dan *Batal*.
- Kalkulator fee jastip otomatis (rate dasar, markup, estimasi berat kg).
- Generator Invoice resmi siap cetak (PDF & Gambar) dan template tagihan WhatsApp sekali klik.

### 3. 📅 Jadwal Handcarry & Pre-Order
- Manajemen jadwal keberangkatan jastiper rute **Indonesia ⇄ Jepang**.
- Batas maksimal kapasitas bagasi (*slot kg*) dan pemantauan sisa muatan kargo.
- Sistem auto-close otomatis untuk jadwal yang telah kadaluarsa.
- Cetak label stiker pengiriman massal format A4 dua kolom untuk efisiensi packing.

### 4. 🔗 Portal Publik Pelanggan (Tanpa Login)
Aplikasi menyediakan portal mandiri yang dapat diakses langsung oleh pelanggan via link unik terenkripsi (*token 48-karakter*) tanpa memerlukan login:

- **Daftar & Revisi Produk Booking (`/?products=<token>`)**:
  - Pelanggan dapat mengecek daftar barang titipan mereka secara transparan.
  - Menampilkan progres belanja real-time (*Sudah Dibelanjakan* vs *Menunggu Belanja*).
  - Menampilkan tanggal keberangkatan jadwal dengan nama bulan lengkap bahasa Indonesia (contoh: `25 September 2026`).
  - Pelanggan dapat menambah atau mengoreksi nama barang yang **belum dibelanjakan**.
  - Barang yang sudah dibeli (*status checked*) otomatis terkunci untuk menjaga akurasi operasional.
- **Form Alamat Pengiriman Domestik (`/?delivery=<token>`)**:
  - Pengisian alamat kirim mandiri untuk rute domestik Indonesia maupun Jepang (Romaji, Kanji, Kode Pos, dan pilihan jam pengantaran Yamato).
  - Tautan sekali pakai (*single-use*) dengan perlindungan penulisan ulang.
- **Jadwal & Pre-Order Bersama (`/?share=<scheduleId>`)**:
  - Tautan pratinjau publik untuk mengecek detail jadwal tertentu.
- **Laporan Kas Bersama (`/?share_ledger=1`)**:
  - Tautan laporan pembukuan kas terproteksi untuk transparansi operasional.

### 5. 🔍 Radar Jastip & Titipan Threads (`/jastiper-search`)
- **Pusat Komunitas Utama**: Akses langsung ke topik emas Threads (`#JASTIP-JEPANG-TRUSTED`, `#bagasiindojepang`, `#jastipjepang`, Osaka, Tokyo, dll.) dengan parameter urutan terbaru (`&filter=recent`).
- **💡 Catatan Pengguna Ponsel**: Pada aplikasi native Threads di iOS/Android, deep link akan selalu mendarat di tab default *"Top"*. Pengguna disarankan menekan tab *"Recent / Terbaru"* di bagian atas aplikasi Threads agar mendapatkan informasi penerbangan dan sisa slot bagasi yang paling terkini.
- **Smart DM Studio**: Generator draf pesan otomatis untuk menyapa jastiper (tanya rate bagasi per kg, sisa slot koper kosong, titip belanja toko offline, konfirmasi ETA kepulangan).

### 6. 📥 NihongStore Inbox
- Sinkronisasi dan penugasan pesanan katalog NihongStore langsung ke jadwal handcarry yang sedang aktif.

### 7. 💰 Pembukuan Kas (Ledger)
- Pencatatan arus kas operasional (pemasukan & pengeluaran).
- Kategori transaksi spesifik (Ongkir, Pajak, Bagasi Koper, Belanja Toko).

---

## 📁 Struktur Folder

```text
/
├─ public/               # Asset statis dan file manifest PWA
├─ src/
│  ├─ assets/            # Gambar dan logo resmi Nihong
│  ├─ components/        # Komponen UI modular
│  │  ├─ DeliveryAddressFields.tsx
│  │  ├─ InvoiceModal.tsx
│  │  ├─ OrderFormModal.tsx
│  │  ├─ PaymentTrackerModal.tsx
│  │  ├─ PreOrder/       # Komponen pre-order & share produk
│  │  └─ ui/             # Komponen primitif (Button, Modal, Toast, dll.)
│  ├─ context/           # AuthContext & SettingsContext
│  ├─ hooks/             # Custom React hooks (realtime listeners & queries)
│  ├─ pages/             # Halaman rute aplikasi
│  │  ├─ Dashboard.tsx
│  │  ├─ OrdersPage.tsx
│  │  ├─ PreOrdersPage.tsx
│  │  ├─ SchedulesPage.tsx
│  │  ├─ JastiperSearchPage.tsx
│  │  ├─ SharedBookingProductsPage.tsx   # Portal publik produk booking
│  │  ├─ SharedDeliveryAddressPage.tsx   # Portal publik alamat pengiriman
│  │  └─ SharedPreOrderPage.tsx
│  ├─ services/          # Layanan interaksi Firebase Firestore
│  ├─ utils/             # Helper format tanggal, kalkulasi mata uang, validasi
│  ├─ types.ts           # Definisi TypeScript global
│  ├─ App.tsx            # Rute aplikasi & pendeteksi query share link
│  └─ main.tsx           # Entry point aplikasi
├─ tests/                # Test suite otomatis (Node test runner)
├─ tailwind.config.js    # Konfigurasi token warna & desain Nihong
└─ vite.config.ts        # Konfigurasi bundler Vite & PWA
```

---

## 🔧 Teknologi Utama

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS (Custom tokens `brand.navy`, `brand.orange`, `surface.base`)
- **Animasi**: Framer Motion
- **Database & Auth**: Firebase Firestore & Firebase Authentication
- **Ikon**: Lucide React
- **Ekspor & Cetak**: HTML2Canvas, jsPDF, jspdf-autotable, XLSX

---

## 📦 Instalasi & Menjalankan Lokal

Pastikan Node.js (v18+) dan Yarn telah terinstal:

```bash
# Clone repository
git clone https://github.com/candrasdkd/nihong-team.git
cd nihong-team

# Install dependencies
yarn install

# Jalankan server development
yarn dev
```

---

## 🧪 Pengujian (Testing) & Build

Jalankan rangkaian tes otomatis dan verifikasi tipe data:

```bash
# Menjalankan seluruh test suite unit & integrasi
node --test tests/*.mjs

# Build production & pemeriksaan tipe TypeScript
yarn build
```

---

## 🚀 Panduan Konfigurasi Deployment

Aplikasi siap dideploy ke platform modern seperti **Vercel**, **Cloudflare**, atau **Firebase Hosting**.

Untuk memastikan link share publik (`/?products=...`, `/?delivery=...`) selalu menggunakan domain produksi resmi meskipun di-generate dari mesin lokal, konfigurasikan environment variable berikut:

```bash
VITE_PUBLIC_APP_URL=https://nihong-jastip.example.com
```

*Catatan: Jika variabel ini kosong, sistem secara otomatis memakai `window.location.origin` yang aktif.*

---

## 📜 Lisensi

Hak Cipta © 2025-2026 **NihongTeam**. Seluruh hak cipta dilindungi.
