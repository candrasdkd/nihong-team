# Koreksi data pesanan lama

Total tagihan adalah `hargaJastipMarkup + hargaOngkirMarkup`. Harga modal dan nominal pembayaran tidak diganti oleh proses perbaikan. Koleksi pelanggan aplikasi adalah `customer` (tunggal), bukan `customers`.

Perubahan kode tidak otomatis memperbaiki seluruh dokumen lama. Jalankan proses berikut pada waktu pemeliharaan, dengan penulisan dari aplikasi/perangkat lama dihentikan. Semua perangkat harus memakai versi aplikasi baru saat penulisan dibuka kembali. Jangan menjalankan migrasi lain bersamaan.

## Prasyarat

- Node.js 22+ dan dependensi proyek sudah terpasang.
- Konfigurasi `VITE_FIREBASE_*` proyek yang benar tersedia di `.env` / `.env.local` atau environment.
- Login interaktif: jalankan dari terminal, lalu masukkan email/password yang biasa digunakan masuk aplikasi Nihong. Password tidak ditampilkan dan tidak disimpan. Login Google ke Firebase Console berbeda dari login aplikasi. Alternatif autentikasi pengguna admin Firebase yang sudah berhak membaca/menulis pesanan: `FIREBASE_REPAIR_CUSTOM_TOKEN`, atau `FIREBASE_REPAIR_EMAIL` bersama `FIREBASE_REPAIR_PASSWORD`, tersedia hanya di environment lokal. Jangan menaruh password/token pada argumen command, repository, atau chat. Akun yang hanya tersedia lewat Google/MFA memerlukan mekanisme autentikasi pemeliharaan dari pengelola Firebase; jangan melemahkan aturan login untuk menjalankan script.
- Rules yang sudah ada harus mengizinkan admin tersebut mengakses `orders`, `customer`, `orders_monthly_summaries`, dan `metadata/orders_revision`. Jangan memberi akses publik untuk migrasi. Repository tidak memiliki rules produksi lengkap; periksa aturan aktif sebelum rilis.

## Backup lokal tanpa upgrade Blaze

Script menyediakan salinan lokal lewat Firebase client SDK dan akun aplikasi yang sudah berhak membaca data. Tidak memakai layanan managed export/import berbayar. Pembacaan tetap memakai kuota Firestore; pada paket Spark, jangan jalankan jika kuota harian hampir habis. Backup membaca cakupan dua kali untuk mendeteksi perubahan selama proses, sehingga aktivitas edit harus dihentikan.

**Cakupan persis:** semua dokumen tingkat atas `orders`, `customer`, `orders_monthly_summaries`, serta dokumen `metadata/orders_revision` (termasuk catatan jika dokumen belum ada). Ini mencakup seluruh tempat yang ditulis oleh repair pesanan. Ini **bukan backup seluruh database/proyek Firebase**: koleksi lain (termasuk `customers`, kas), subkoleksi, akun Authentication, file Storage, rules, dan indeks tidak disalin dan tidak ditulis oleh repair ini.

```bash
mkdir -p backups
node scripts/repair-orders.mjs --backup backups/sebelum-repair.json
```

Tunggu output `verified: true` dan `firestoreWrites: 0`. Periksa jumlah dokumen tiap koleksi. Jika ada koleksi tidak bisa dibaca, tipe data tidak dikenali, atau data berubah di antara dua pembacaan, proses gagal; tidak melanjutkan dengan backup parsial. File memiliki checksum SHA-256 dan menyimpan Timestamp sampai nanodetik, referensi dokumen, GeoPoint, bytes, vector, dan nilai numerik khusus menggunakan format bertipe. Script membaca kembali file yang tersimpan dan memeriksa format serta checksum. Pemeriksaan lokal ini bukan uji restore ke Firebase produksi.

Folder `backups/` diabaikan Git; file dibuat dengan mode `0600` tanpa menimpa file lama. File memuat data pribadi dalam teks (tidak terenkripsi), sehingga simpan di lokasi privat dan buat salinan aman di luar komputer bila diperlukan. Jangan hanya menyimpan backup di `/tmp` yang dapat dibersihkan sistem. Password/token login tidak disimpan di backup.

## Pratinjau, lalu terapkan

Proyek dibaca dari konfigurasi lokal dan ditampilkan sebelum login. Jika ingin memeriksa proyek secara eksplisit, tambahkan `--project PROJECT_ID` yang harus sama persis dengan konfigurasi lokal.

```bash
node scripts/repair-orders.mjs --preview backups/order-repair.json
node scripts/repair-orders.mjs --apply backups/order-repair.json --backup-file backups/sebelum-repair.json
```

Perintah pertama **hanya membaca Firestore**. File hasilnya berisi salinan dokumen pesanan sebelum perubahan, usulan `patch`, dan `warnings`. File dibuat dengan izin baca/tulis pemilik saja dan tidak ditimpa. File pratinjau bukan pengganti backup bertipe di atas. Tinjau usulan sebelum menjalankan perintah kedua. `--apply` sekarang wajib menerima `--backup-file`; checksum, proyek, cakupan, dan kecocokan dengan data terkini diperiksa sebelum perubahan pertama. Jika berubah, buat backup serta pratinjau baru dan tetap simpan backup awal.

Perintah apply:

1. Memeriksa bahwa proyek sama, dokumen belum berubah sejak pratinjau, dan usulan masih sama dengan hasil perhitungan dari data sumber. Dokumen yang berubah dilewati dan dilaporkan.
2. Hanya memperbaiki `totalPembayaran`, `totalKeuntungan`, dan `idPelanggan` yang bisa dipastikan. Harga sumber, DP/pelunasan, dan status lama dipertahankan. Revisi dan waktu pembaruan dinaikkan.
3. Memasangkan ID pelanggan kosong hanya jika nama cocok tepat setelah normalisasi dan hanya ada satu kandidat. Nama ganda atau pelanggan yang tidak ditemukan tidak ditebak; hasilnya perlu diperiksa manual dengan memilih ulang pelanggan pada form.
4. Tidak mengubah nominal jika dua harga markup sumber tidak lengkap. Baris demikian masuk peringatan untuk pemeriksaan manual.
5. Jika tidak ada koreksi yang dilewati, menghitung ulang ringkasan bulanan dan belanja pelanggan dari seluruh pesanan, termasuk mengosongkan total yang sudah tidak memiliki pesanan. Jika ada yang dilewati, sinkronisasi tidak dijalankan (`aggregatesRecalculated: false`) sampai koreksi selesai. Statistik menggunakan koleksi `customer`; dokumen sisa pada koleksi `customers` tidak dihapus otomatis.

Hasil apply disimpan sebagai `order-repair.json.result.json`. Exit code 2 berarti ada dokumen yang dilewati. Jika proses terputus, sebagian koreksi dapat sudah tersimpan: buat backup kondisi terkini dan preview baru dengan nama file berbeda, tinjau, lalu apply kembali sampai kandidat perbaikan habis dan sinkronisasi selesai. Tetap simpan backup awal untuk pemulihan. Jangan membuka penulisan produksi sebelum selesai. Jalankan preview terakhir untuk membuktikan tidak ada kandidat koreksi otomatis tersisa; peringatan ambigu tetap perlu keputusan manusia.

Perbandingan dokumen mengabaikan urutan field map karena pembacaan query dan transaksi dapat mengembalikan urutan berbeda. Isi setiap field, urutan elemen array, dan representasi Timestamp tetap dibandingkan. File preview lama dengan fingerprint JSON belum diurutkan tetap diperiksa menggunakan aturan yang sama.

## Pemulihan jika perbaikan perlu dibatalkan

Jangan menjalankan pemulihan sebagai langkah rutin setelah backup. Pemulihan mengembalikan dokumen dalam cakupan ke isi backup, termasuk pembayaran/status; perubahan yang terjadi sesudah backup pada dokumen tersebut juga akan dibatalkan. Gunakan saat input masih dihentikan dan setelah meninjau rencananya. Tidak membuka akses Firestore publik atau melemahkan rules.

```bash
# Hanya membaca; menyimpan kondisi sebelum restore dan rencana perubahannya.
node scripts/repair-orders.mjs --restore-preview backups/sebelum-repair.json
# Jalankan hanya jika rencana pemulihan memang sudah diperiksa dan diperlukan.
node scripts/repair-orders.mjs --restore-apply backups/sebelum-repair.json.restore-plan.json
```

Pratinjau pemulihan menyimpan salinan kondisi saat ini, target, dan daftar dokumen yang berubah ke `.restore-plan.json`. Dokumen baru di luar ringkasan bulan yang mungkin dibuat repair membuat proses berhenti untuk tinjauan manual. Restore tidak menghapus pesanan/pelanggan baru. Ringkasan bulan dan metadata revisi yang dibuat repair dapat dihapus bila belum ada pada backup awal. Koleksi lain tetap tidak disentuh.

Sebelum restore menulis, seluruh kondisi harus cocok dengan pratinjau. Setiap transaksi juga memeriksa ulang dokumen terkait, lalu mengembalikan tipe data asli. Setelah selesai, semua dokumen dalam cakupan dibaca kembali dan dibandingkan dengan backup. Restore terdiri dari beberapa transaksi, **bukan satu operasi atomik**; jika gagal, sebagian dokumen bisa sudah dipulihkan. Tetap hentikan input, simpan seluruh file, lalu buat rencana pemulihan baru (gunakan salinan backup awal dengan nama baru agar file hasil lama tidak tertimpa). Muat ulang semua perangkat sebelum membuka input kembali.

`recalculateAllStats()` (tombol sinkronisasi yang sudah ada) menghitung ringkasan dari harga markup. Fungsi ini tidak memasangkan ID pelanggan dan tidak memperbaiki field tersimpan pada seluruh dokumen; gunakan script di atas untuk koreksi dokumen lama.

## Verifikasi

Tes `tests/orders-*.test.mjs` menjalankan layanan asli dengan Firestore dalam memori. Cakupannya termasuk contoh HUSIN, transaksi bersamaan, invoice gabungan, hasil lebih dari 250 pesanan, mata uang, pratinjau tanpa perubahan, konflik saat apply, dan sinkronisasi agregat. Ini bukan pengujian rules Firebase produksi.
