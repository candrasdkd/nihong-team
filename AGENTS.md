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

---

## 6. 📄 Pagination Firestore

Fitur daftar yang berpotensi memuat banyak dokumen wajib memakai pagination di query Firestore, bukan mengambil seluruh koleksi lalu memotong tampilan di client.

1. **Pola halaman**:
   - Gunakan ukuran halaman konsisten **15 dokumen** sebagai nilai awal.
   - Ambil data dengan `getDocsFromServer`, `orderBy` yang stabil, `startAfter(cursor)`, dan `limit(pageSize + 1)` untuk menentukan `hasMore`.
   - Simpan snapshot dokumen terakhir yang ditampilkan sebagai cursor. Reset cursor ketika pencarian, filter, urutan, atau data yang dimuat ulang berubah.
   - Jangan memakai `slice` atas seluruh koleksi sebagai pengganti pagination server. `slice` hanya boleh mengatur jumlah hasil pencarian yang memang sudah diambil sesuai kebutuhan.
2. **Filter, urutan, dan indeks**:
   - Terapkan filter yang didukung Firestore sebelum `limit`, lalu lakukan urutan deterministik. Nilai yang sama harus memakai document ID sebagai pemecah seri dengan arah yang konsisten.
   - Untuk gabungan filter dan urutan, periksa batasan query Firestore dan tambahkan composite index yang diminta. Jangan menghapus filter atau mengubah urutan diam-diam untuk menghindari index.
   - Jika query butuh rentang pada field yang berbeda dari urutan aktif, desain pemindaian cursor yang tetap menjaga urutan dan tidak melewati hasil, atau jelaskan batasan dan alternatifnya sebelum mengubah perilaku.
3. **Pencarian teks**:
   - Firestore Standard tidak mendukung pencarian substring umum pada field biasa. Jangan menyebut pencarian prefix/token sebagai pencarian “bagian mana saja”.
   - Pencarian substring harus memakai layanan indeks pencarian yang sesuai, atau memindai data hanya setelah input di-debounce dan hanya dalam cakupan filter aktif. Beri tahu pengguna jika pencarian tersebut membaca seluruh cakupan itu.
4. **Ringkasan dan perubahan data**:
   - Jangan menampilkan ringkasan dari halaman pertama seolah-olah mencakup seluruh koleksi. Gunakan aggregate/summary tersendiri, muat cakupan lengkap hanya saat diminta, atau tandai ringkasan sebagai parsial sampai semua halaman dimuat.
   - Refresh halaman aktif setelah mutasi lokal yang memengaruhi daftar. Hindari `onSnapshot` pada seluruh koleksi hanya untuk memperbarui daftar berpaginasi.
   - Ekspor dan laporan yang harus mencakup semua data mengambil cakupan lengkap hanya saat aksi itu dijalankan; jangan membuatnya bergantung pada halaman yang kebetulan sedang terlihat.
