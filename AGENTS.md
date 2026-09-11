# 📋 Developer & Agent Rules — Nihong Jastip

Dokumen ini berisi pedoman arsitektur, aturan keamanan, standar format, dan konvensi pengembangan untuk proyek **Nihong Jastip**. Seluruh AI agent dan pengembang wajib mematuhi aturan ini saat melakukan modifikasi kode.

---

## 1. 🛡️ Keamanan Link Publik (Public Share Token Rules)

Fitur link publik (`/?products=<token>`, `/?delivery=<token>`, `/?share=<scheduleId>`) memungkinkan pelanggan mengakses data pesanan mereka tanpa login. Aturan berikut wajib ditegakkan:

1. **Format Token**:
   - Token wajib menggunakan 48-karakter heksadesimal acak (`crypto.getRandomValues`) dan divalidasi dengan regex `/^[a-f0-9]{48}$/`.
   - Data pemetaan token disimpan di koleksi terpisah (`booking_product_links`, `delivery_address_links`).
2. **Strict Whitelisting (Tidak Boleh Mass Assignment)**:
   - Form publik **hanya diizinkan** memperbarui field yang memang menjadi hak pelanggan (contoh: `namaBarang` pada produk yang belum dibeli, atau field alamat pengiriman).
   - Form publik **mutlak dilarang** mengubah harga, markup, status pesanan admin, atau status checklist jastiper.
3. **Immutability Barang yang Sudah Selesai (`checked: true`)**:
   - Produk titipan yang memiliki tanda `checked: true` (artinya jastiper sudah membeli barang tersebut di Jepang) **terkunci permanen**. Pelanggan tidak boleh menghapus, mengubah nama, atau membatalkan status barang tersebut.
4. **Proteksi Konkurensi & Mutasi**:
   - Gunakan string hash revisi (`productRevision`) dan `runTransaction` Firestore saat menyimpan produk publik agar tidak menimpa data yang baru saja diubah oleh admin atau perangkat lain.
   - Jika status booking bukan `Pending` (misal sudah `Selesai`), halaman publik otomatis beralih menjadi mode baca-saja (*read-only*).
5. **No Full Collection Subscription**:
   - Halaman publik dilarang mendengarkan (*listen*) koleksi global `pre_orders` atau `customers`. Hanya listen satu dokumen yang valid berdasarkan token share yang diverifikasi.

---

## 2. 📅 Standar Format Tanggal & Waktu

1. **Nama Bulan Penuh (Bahasa Indonesia)**:
   - Semua tanggal yang ditampilkan ke pelanggan (terutama pada [SharedBookingProductsPage.tsx](file:///Users/CANDY/Projects/Pribadi/nihong-team/src/pages/SharedBookingProductsPage.tsx) dan invoice) **wajib menggunakan nama bulan penuh bahasa Indonesia**:
     Contoh: `25 September 2026`, bukan `2026-09-25` atau `25 Sep 2026`.
2. **Pencegahan Timezone Shift**:
   - Tanggal berformat ISO `YYYY-MM-DD` tidak boleh langsung di-parse dengan `new Date("YYYY-MM-DD")` di browser tanpa penanganan zona waktu, karena rentan bergeser 1 hari di zona waktu tertentu.
   - Gunakan parser aman yang membedah langsung bagian tahun, bulan, dan hari (seperti yang diimplementasikan di `formatDepartureDate` atau `parseSafeDate` di [format.ts](file:///Users/CANDY/Projects/Pribadi/nihong-team/src/utils/format.ts)).

---

## 3. 🎨 Desain, Estetika & Responsif Mobile (UI/UX)

1. **Token Desain Resmi (Tailwind)**:
   - Gunakan token tema resmi dari `tailwind.config.js`:
     - Navy: `brand-navy` (`#0B2545`), `brand-navyDark` (`#071B33`), `brand-navyLight` (`#154574`)
     - Orange: `brand-orange` (`#F26522`), `brand-orangeLight` (`#FF8A4C`)
     - Background: `surface-base` (`#F4F6F8`), `surface-card` (`#FFFEFC`), `surface-border` (`#DDE3EA`)
2. **Mobile First & Pencegahan iOS Auto-Zoom**:
   - Sebagian besar pelanggan membuka link publik dari WhatsApp/Instagram di perangkat seluler.
   - Input teks pada form wajib menggunakan ukuran font **minimal 14px–16px** (contoh: `text-sm` atau `text-base`) dan tinggi tap target minimal **44px** untuk mencegah browser iOS Safari melakukan auto-zoom saat keyboard muncul.
3. **Mikro-Animasi**:
   - Gunakan `framer-motion` (`motion.div`, `AnimatePresence`) untuk state transisi, penambahan/penghapusan list, dialog, dan floating action bar agar antarmuka terasa dinamis dan premium.

---

## 4. 🌐 Integrasi Eksternal & Deep Links (Threads & WhatsApp)

1. **Aplikasi Mobile Threads**:
   - Deep link ke Threads menggunakan parameter `&filter=recent` (contoh: `https://www.threads.com/search?q=JASTIP-JEPANG-TRUSTED&filter=recent`).
   - *Catatan Penting*: Aplikasi native Threads di iOS dan Android mengabaikan parameter URL `filter=recent` dan otomatis mendarat di tab default **"Top"**.
   - Setiap fitur atau UI yang mengarahkan ke Threads wajib menyertakan tips/petunjuk visual bagi pengguna ponsel agar menekan tab **"Recent / Terbaru"** di dalam aplikasi Threads.
2. **Integrasi WhatsApp**:
   - Format nomor telepon pelanggan selalu dinormalisasi ke awalan internasional (menghilangkan tanda `+`, spasi, strip, dan mengubah `08...` menjadi `628...`).
   - Tautan WhatsApp menggunakan format `https://wa.me/<nomor>?text=<pesan_terenkode>`.

---

## 5. 🧪 Verifikasi & Kualitas Kode

Sebelum menyelesaikan tugas atau membuat commit:
1. **Lakukan Build Check**: Pastikan proyek bebas dari kesalahan TypeScript dan dapat dibuild:
   ```bash
   yarn build
   ```
2. **Jalankan Test Suite**: Pastikan seluruh tes di folder `tests/` lulus tanpa kegagalan:
   ```bash
   node --test tests/*.mjs
   ```
3. **Pertahankan Integritas Data**: Jangan menghapus komentar atau fungsionalitas yang tidak terkait langsung dengan tugas yang sedang dikerjakan.
